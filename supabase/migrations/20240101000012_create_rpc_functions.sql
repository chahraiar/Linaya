-- Migration: Create RPC functions for API access
-- Description: Functions to access family_tree schema data via PostgREST API
-- These functions are in the public schema so PostgREST can access them,
-- but they query the family_tree schema internally

-- ============================================================================
-- FUNCTION: Get user trees (wrapper for family_tree.get_user_trees)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_trees(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM family_tree.get_user_trees(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.get_user_trees(uuid) SET search_path = family_tree, public;

-- ============================================================================
-- FUNCTION: Get current user profile
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  locale text,
  theme text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.locale,
    p.theme,
    p.created_at,
    p.updated_at
  FROM family_tree.profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.get_current_user_profile() SET search_path = family_tree, public;

-- ============================================================================
-- FUNCTION: Get tree persons and relationships
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_tree_persons(p_tree_id uuid)
RETURNS TABLE (
  id uuid,
  tree_id uuid,
  created_by uuid,
  first_name text,
  last_name text,
  display_name text,
  gender text,
  is_living boolean,
  birth_date date,
  death_date date,
  notes text,
  main_photo_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.tree_id,
    p.created_by,
    p.first_name,
    p.last_name,
    p.display_name,
    p.gender,
    p.is_living,
    p.birth_date,
    p.death_date,
    p.notes,
    p.main_photo_id,
    p.created_at,
    p.updated_at
  FROM family_tree.persons p
  WHERE p.tree_id = p_tree_id
    AND p.deleted_at IS NULL
  ORDER BY p.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.get_tree_persons(uuid) SET search_path = family_tree, public;

-- ============================================================================
-- FUNCTION: Get tree relationships
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_tree_relationships(p_tree_id uuid)
RETURNS TABLE (
  id uuid,
  tree_id uuid,
  from_person_id uuid,
  to_person_id uuid,
  type text,
  notes text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.tree_id,
    r.from_person_id,
    r.to_person_id,
    r.type,
    r.notes,
    r.created_at
  FROM family_tree.person_relationships r
  WHERE r.tree_id = p_tree_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.get_tree_relationships(uuid) SET search_path = family_tree, public;

-- ============================================================================
-- FUNCTION: Create tree (returns created tree)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_user_tree(
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_tree_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create tree
  INSERT INTO family_tree.trees (owner_id, name, description)
  VALUES (v_user_id, p_name, p_description)
  RETURNING family_tree.trees.id INTO v_tree_id;

  -- IMPORTANT: Add user to tree_members as owner
  -- This is required for get_user_trees() to return the tree
  INSERT INTO family_tree.tree_members (tree_id, user_id, role, status)
  VALUES (v_tree_id, v_user_id, 'owner', 'active')
  ON CONFLICT (tree_id, user_id) DO NOTHING;

  -- Return created tree
  -- Use table alias to avoid column name ambiguity with RETURNS TABLE columns
  RETURN QUERY
  SELECT
    t.id,
    t.owner_id,
    t.name,
    t.description,
    t.created_at,
    t.updated_at
  FROM family_tree.trees AS t
  WHERE t.id = v_tree_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.create_user_tree(text, text) SET search_path = family_tree, public;

-- ============================================================================
-- FUNCTION: Create person from profile
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_person_from_profile(
  p_tree_id uuid,
  p_first_name text,
  p_last_name text,
  p_display_name text
)
RETURNS TABLE (
  person_id uuid,
  person_tree_id uuid,
  person_created_by uuid,
  first_name text,
  last_name text,
  display_name text,
  gender text,
  is_living boolean,
  birth_date date,
  death_date date,
  notes text,
  main_photo_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_person_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Vérifier que l'utilisateur est owner/editor du tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = p_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to create person in this tree';
  END IF;

  INSERT INTO family_tree.persons (
    tree_id,
    created_by,
    first_name,
    last_name,
    display_name,
    is_living
  )
  VALUES (
    p_tree_id,
    v_user_id,
    p_first_name,
    p_last_name,
    p_display_name,
    true
  )
  RETURNING family_tree.persons.id INTO v_person_id;

  INSERT INTO family_tree.tree_self_person (tree_id, user_id, person_id)
  VALUES (p_tree_id, v_user_id, v_person_id)
  ON CONFLICT (tree_id, user_id) DO UPDATE
  SET person_id = EXCLUDED.person_id;

  -- ✅ Retour sans ambiguïté : on utilise des alias pour éviter les conflits
  RETURN QUERY
  SELECT
    p.id            AS person_id,
    p.tree_id       AS person_tree_id,
    p.created_by    AS person_created_by,
    p.first_name,
    p.last_name,
    p.display_name,
    p.gender,
    p.is_living,
    p.birth_date,
    p.death_date,
    p.notes,
    p.main_photo_id,
    p.created_at,
    p.updated_at
  FROM family_tree.persons AS p
  WHERE p.id = v_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.create_person_from_profile(uuid, text, text, text) SET search_path = family_tree, public;

-- Function to update a person
CREATE OR REPLACE FUNCTION public.update_person(
  p_person_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_death_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_is_living boolean DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  person_id uuid,
  person_tree_id uuid,
  person_created_by uuid,
  first_name text,
  last_name text,
  display_name text,
  gender text,
  is_living boolean,
  birth_date date,
  death_date date,
  notes text,
  main_photo_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  -- Check that user is owner/editor of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to update person in this tree';
  END IF;

  -- Update person (only update provided fields)
  UPDATE family_tree.persons AS p
  SET
    first_name   = COALESCE(p_first_name, p.first_name),
    last_name    = COALESCE(p_last_name, p.last_name),
    display_name = COALESCE(p_display_name, p.display_name),
    birth_date   = COALESCE(p_birth_date, p.birth_date),
    death_date   = COALESCE(p_death_date, p.death_date),
    gender       = COALESCE(p_gender, p.gender),
    is_living    = COALESCE(p_is_living, p.is_living),
    notes        = COALESCE(p_notes, p.notes),
    updated_at   = now()
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  -- Return updated person
  RETURN QUERY
  SELECT
    p.id            AS person_id,
    p.tree_id       AS person_tree_id,
    p.created_by    AS person_created_by,
    p.first_name,
    p.last_name,
    p.display_name,
    p.gender,
    p.is_living,
    p.birth_date,
    p.death_date,
    p.notes,
    p.main_photo_id,
    p.created_at,
    p.updated_at
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.update_person(uuid, text, text, text, date, date, text, boolean, text)
SET search_path = family_tree, public;

-- Grant execute permissions ONLY to authenticated users (security)
GRANT EXECUTE ON FUNCTION public.get_user_trees(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tree_persons(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tree_relationships(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_tree(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_person_from_profile(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_person(uuid, text, text, text, date, date, text, boolean, text) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.get_user_trees(uuid) IS 'Get all trees where a user is a member (wrapper for family_tree.get_user_trees)';
COMMENT ON FUNCTION public.get_current_user_profile() IS 'Get current authenticated user profile';
COMMENT ON FUNCTION public.get_tree_persons(uuid) IS 'Get all persons in a tree';
COMMENT ON FUNCTION public.get_tree_relationships(uuid) IS 'Get all relationships in a tree';
COMMENT ON FUNCTION public.create_user_tree(text, text) IS 'Create a new tree for the current user and add user to tree_members as owner';
COMMENT ON FUNCTION public.create_person_from_profile(uuid, text, text, text) IS 'Create a person from user profile and link it to the tree';
COMMENT ON FUNCTION public.update_person(uuid, text, text, text, date, date, text, boolean, text) IS 'Update a person in a tree (only owner/editor can update)';

-- Function to get person contacts
CREATE OR REPLACE FUNCTION public.get_person_contacts(p_person_id uuid)
RETURNS TABLE (
  id uuid,
  person_id uuid,
  type text,
  label text,
  value text,
  is_primary boolean,
  visibility text,
  created_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  -- Check that user is member of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed to view contacts for this person';
  END IF;

  -- Return contacts (RLS will filter by visibility)
  RETURN QUERY
  SELECT
    pc.id,
    pc.person_id,
    pc.type,
    pc.label,
    pc.value,
    pc.is_primary,
    pc.visibility,
    pc.created_at
  FROM family_tree.person_contacts pc
  WHERE pc.person_id = p_person_id
  ORDER BY pc.type, pc.is_primary DESC, pc.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_person_contacts(uuid) SET search_path = family_tree, public;

-- Function to upsert a person contact
DROP FUNCTION IF EXISTS public.upsert_person_contact(uuid, text, text, text, boolean, text);

CREATE OR REPLACE FUNCTION public.upsert_person_contact(
  p_person_id uuid,
  p_type text,
  p_value text,
  p_label text DEFAULT NULL,
  p_is_primary boolean DEFAULT false,
  p_visibility text DEFAULT 'tree'
)
RETURNS TABLE (
  contact_id uuid,
  contact_person_id uuid,
  contact_type text,
  contact_label text,
  contact_value text,
  contact_is_primary boolean,
  contact_visibility text,
  created_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_contact_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  -- Check that user is owner/editor of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members AS tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to update contacts for this person';
  END IF;

  -- If setting as primary, unset other primary contacts of the same type
  IF p_is_primary THEN
    UPDATE family_tree.person_contacts AS pc
    SET is_primary = false
    WHERE pc.person_id = p_person_id
      AND pc.type = p_type
      AND pc.is_primary = true;
  END IF;

  -- Check if contact already exists (same person, type, and value)
  SELECT pc.id INTO v_contact_id
  FROM family_tree.person_contacts AS pc
  WHERE pc.person_id = p_person_id
    AND pc.type = p_type
    AND pc.value = p_value
  LIMIT 1;

  IF v_contact_id IS NOT NULL THEN
    -- Update existing contact
    UPDATE family_tree.person_contacts AS pc
    SET
      label = COALESCE(p_label, pc.label),
      is_primary = p_is_primary,
      visibility = p_visibility
    WHERE pc.id = v_contact_id;
  ELSE
    -- Insert new contact
    INSERT INTO family_tree.person_contacts (
      person_id,
      type,
      label,
      value,
      is_primary,
      visibility
    )
    VALUES (
      p_person_id,
      p_type,
      p_label,
      p_value,
      p_is_primary,
      p_visibility
    )
    RETURNING family_tree.person_contacts.id INTO v_contact_id;
  END IF;

  -- Return the contact
  RETURN QUERY
  SELECT
    pc.id          AS contact_id,
    pc.person_id   AS contact_person_id,
    pc.type        AS contact_type,
    pc.label       AS contact_label,
    pc.value       AS contact_value,
    pc.is_primary  AS contact_is_primary,
    pc.visibility  AS contact_visibility,
    pc.created_at
  FROM family_tree.person_contacts AS pc
  WHERE pc.id = v_contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.upsert_person_contact(uuid, text, text, text, boolean, text) SET search_path = family_tree, public;

-- Function to delete a person contact
CREATE OR REPLACE FUNCTION public.delete_person_contact(p_contact_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get tree_id from contact
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.person_contacts pc
  JOIN family_tree.persons p ON p.id = pc.person_id
  WHERE pc.id = p_contact_id;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  -- Check that user is owner/editor of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to delete this contact';
  END IF;

  -- Delete contact
  DELETE FROM family_tree.person_contacts AS pc
  WHERE pc.id = p_contact_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.delete_person_contact(uuid) SET search_path = family_tree, public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_person_contacts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_person_contact(uuid, text, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_person_contact(uuid) TO authenticated;

-- Function to upload/update person profile photo
CREATE OR REPLACE FUNCTION public.upsert_person_photo(
  p_person_id uuid,
  p_storage_path text,
  p_caption text DEFAULT NULL,
  p_taken_at date DEFAULT NULL
)
RETURNS TABLE (
  media_id uuid,
  media_person_id uuid,
  media_type text,
  media_storage_path text,
  media_caption text,
  media_taken_at date,
  media_is_primary boolean,
  media_created_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_media_id uuid;
  v_old_photo_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  -- Check that user is owner/editor of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members AS tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to update photo for this person';
  END IF;

  -- Lock the person row to ensure atomicity (prevent race conditions)
  PERFORM 1
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id
  FOR UPDATE;

  -- Get existing primary photo ID if any
  SELECT pm.id INTO v_old_photo_id
  FROM family_tree.person_media AS pm
  WHERE pm.person_id = p_person_id
    AND pm.is_primary = true
    AND pm.type = 'photo'
  LIMIT 1;

  -- If there's an existing primary photo, unset it
  IF v_old_photo_id IS NOT NULL THEN
    UPDATE family_tree.person_media AS pm
    SET is_primary = false
    WHERE pm.id = v_old_photo_id;
  END IF;

  -- Check if media already exists with this storage_path FOR THIS PERSON
  -- CRITICAL: Must check by person_id to prevent cross-tree media hijacking
  SELECT pm.id INTO v_media_id
  FROM family_tree.person_media AS pm
  WHERE pm.person_id = p_person_id
    AND pm.storage_path = p_storage_path
  LIMIT 1;

  IF v_media_id IS NOT NULL THEN
    -- Update existing media
    UPDATE family_tree.person_media AS pm
    SET
      caption = COALESCE(p_caption, pm.caption),
      taken_at = COALESCE(p_taken_at, pm.taken_at),
      is_primary = true
    WHERE pm.id = v_media_id;
  ELSE
    -- Insert new media
    INSERT INTO family_tree.person_media (
      person_id,
      type,
      storage_path,
      caption,
      taken_at,
      is_primary
    )
    VALUES (
      p_person_id,
      'photo',
      p_storage_path,
      p_caption,
      p_taken_at,
      true
    )
    RETURNING family_tree.person_media.id INTO v_media_id;
  END IF;

  -- Update person's main_photo_id
  UPDATE family_tree.persons AS p
  SET main_photo_id = v_media_id
  WHERE p.id = p_person_id;

  -- Return the media
  RETURN QUERY
  SELECT
    pm.id            AS media_id,
    pm.person_id     AS media_person_id,
    pm.type          AS media_type,
    pm.storage_path  AS media_storage_path,
    pm.caption       AS media_caption,
    pm.taken_at      AS media_taken_at,
    pm.is_primary    AS media_is_primary,
    pm.created_at    AS media_created_at
  FROM family_tree.person_media AS pm
  WHERE pm.id = v_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.upsert_person_photo(uuid, text, text, date)
SET search_path = family_tree, public;

GRANT EXECUTE ON FUNCTION public.upsert_person_photo(uuid, text, text, date) TO authenticated;

-- Function to get person tree_id
DROP FUNCTION IF EXISTS public.get_person_tree_id(uuid);

CREATE OR REPLACE FUNCTION public.get_person_tree_id(p_person_id uuid)
RETURNS uuid AS $$
DECLARE
  v_tree_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT p.tree_id
  INTO v_tree_id
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members AS tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN v_tree_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_person_tree_id(uuid)
SET search_path = public, family_tree;

GRANT EXECUTE ON FUNCTION public.get_person_tree_id(uuid) TO authenticated;

-- Function to get person photo URL
CREATE OR REPLACE FUNCTION public.get_person_photo_url(p_person_id uuid)
RETURNS text AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_storage_path text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  IF v_tree_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check that user is member of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members AS tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  -- Get storage_path from person_media via main_photo_id
  SELECT pm.storage_path INTO v_storage_path
  FROM family_tree.persons AS p
  JOIN family_tree.person_media AS pm ON pm.id = p.main_photo_id
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL
    AND pm.type = 'photo'
  LIMIT 1;

  RETURN v_storage_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_person_photo_url(uuid)
SET search_path = family_tree, public;

GRANT EXECUTE ON FUNCTION public.get_person_photo_url(uuid) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.get_person_contacts(uuid) IS 'Get all contacts for a person';
COMMENT ON FUNCTION public.upsert_person_contact(uuid, text, text, text, boolean, text) IS 'Create or update a contact for a person';
COMMENT ON FUNCTION public.delete_person_contact(uuid) IS 'Delete a contact for a person';
COMMENT ON FUNCTION public.upsert_person_photo(uuid, text, text, date) IS 'Upload or update a person profile photo';
COMMENT ON FUNCTION public.get_person_tree_id(uuid) IS 'Get tree_id for a person';
COMMENT ON FUNCTION public.get_person_photo_url(uuid) IS 'Get storage path for person profile photo';

-- Function to get complete person details (optimized for PersonDetailScreen)
CREATE OR REPLACE FUNCTION public.get_person_detail(p_person_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_person jsonb;
  v_contacts jsonb;
  v_photo_path text;
  v_events jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  -- Check that user is member of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members AS tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Get person data
  SELECT jsonb_build_object(
    'id', p.id,
    'tree_id', p.tree_id,
    'created_by', p.created_by,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'display_name', p.display_name,
    'gender', p.gender,
    'is_living', p.is_living,
    'birth_date', p.birth_date,
    'death_date', p.death_date,
    'notes', p.notes,
    'main_photo_id', p.main_photo_id,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO v_person
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id;

  -- Get contacts
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pc.id,
      'person_id', pc.person_id,
      'type', pc.type,
      'label', pc.label,
      'value', pc.value,
      'is_primary', pc.is_primary,
      'visibility', pc.visibility,
      'created_at', pc.created_at
    ) ORDER BY pc.type, pc.is_primary DESC, pc.created_at
  ), '[]'::jsonb) INTO v_contacts
  FROM family_tree.person_contacts AS pc
  WHERE pc.person_id = p_person_id;

  -- Get photo storage_path
  SELECT pm.storage_path INTO v_photo_path
  FROM family_tree.persons AS p
  JOIN family_tree.person_media AS pm ON pm.id = p.main_photo_id
  WHERE p.id = p_person_id
    AND pm.type = 'photo'
  LIMIT 1;

  -- Get events
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pe.id,
      'person_id', pe.person_id,
      'type', pe.type,
      'date_start', pe.date_start,
      'date_end', pe.date_end,
      'place_name', pe.place_name,
      'place_lat', pe.place_lat,
      'place_lng', pe.place_lng,
      'notes', pe.notes,
      'created_at', pe.created_at,
      'updated_at', pe.updated_at
    ) ORDER BY pe.date_start, pe.created_at
  ), '[]'::jsonb) INTO v_events
  FROM family_tree.person_events AS pe
  WHERE pe.person_id = p_person_id;

  -- Return combined result
  RETURN jsonb_build_object(
    'person', v_person,
    'contacts', v_contacts,
    'photo_storage_path', v_photo_path,
    'events', v_events
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_person_detail(uuid)
SET search_path = public, family_tree;

GRANT EXECUTE ON FUNCTION public.get_person_detail(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_person_detail(uuid) IS 'Get complete person details (person, contacts, photo, events) in a single call';

-- Function to fix missing tree members (repair function)
-- This adds owners to tree_members if they are missing
-- Useful if trees were created before the trigger was in place
DROP FUNCTION IF EXISTS public.fix_missing_tree_members();

CREATE OR REPLACE FUNCTION public.fix_missing_tree_members()
RETURNS TABLE (
  result_tree_id uuid,
  result_tree_name text,
  result_owner_id uuid,
  result_owner_name text,
  result_action text
) AS $$
BEGIN
  -- Add missing owners to tree_members
  -- Use CTE to avoid ambiguity with RETURNS TABLE column names
  WITH missing_members AS (
    SELECT 
      t.id AS missing_tree_id,
      t.owner_id AS missing_user_id
    FROM family_tree.trees AS t
    WHERE NOT EXISTS (
      SELECT 1
      FROM family_tree.tree_members AS tm
      WHERE tm.tree_id = t.id
        AND tm.user_id = t.owner_id
    )
  )
  INSERT INTO family_tree.tree_members (tree_id, user_id, role, status)
  SELECT 
    missing_members.missing_tree_id,
    missing_members.missing_user_id,
    'owner'::text,
    'active'::text
  FROM missing_members
  ON CONFLICT (tree_id, user_id)
  DO NOTHING;

  -- Return results
  RETURN QUERY
  SELECT 
    t.id AS result_tree_id,
    t.name AS result_tree_name,
    t.owner_id AS result_owner_id,
    p.display_name AS result_owner_name,
    CASE 
      WHEN tm.user_id IS NOT NULL THEN 'Added'::text
      ELSE 'Already exists'::text
    END AS result_action
  FROM family_tree.trees t
  LEFT JOIN family_tree.profiles p ON p.id = t.owner_id
  LEFT JOIN family_tree.tree_members tm ON tm.tree_id = t.id AND tm.user_id = t.owner_id
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.fix_missing_tree_members()
SET search_path = public, family_tree;

GRANT EXECUTE ON FUNCTION public.fix_missing_tree_members() TO authenticated;

COMMENT ON FUNCTION public.fix_missing_tree_members() IS 'Repair function: Add missing owners to tree_members table';

