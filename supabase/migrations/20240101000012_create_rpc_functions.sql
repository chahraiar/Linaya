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
  UPDATE family_tree.persons
  SET
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    display_name = COALESCE(p_display_name, display_name),
    birth_date = COALESCE(p_birth_date, birth_date),
    death_date = COALESCE(p_death_date, death_date),
    gender = COALESCE(p_gender, gender),
    is_living = COALESCE(p_is_living, is_living),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_person_id
    AND deleted_at IS NULL;

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

