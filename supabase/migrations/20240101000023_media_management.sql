-- Migration: Add media management functions
-- Description: Functions to get and delete person media

-- Function to get all media for a person
CREATE OR REPLACE FUNCTION public.get_person_media(p_person_id uuid)
RETURNS TABLE (
  id uuid,
  person_id uuid,
  type text,
  storage_path text,
  caption text,
  taken_at date,
  is_primary boolean,
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
    RAISE EXCEPTION 'Not allowed to view media for this person';
  END IF;

  -- Return all media for the person
  RETURN QUERY
  SELECT
    pm.id,
    pm.person_id,
    pm.type,
    pm.storage_path,
    pm.caption,
    pm.taken_at,
    pm.is_primary,
    pm.created_at
  FROM family_tree.person_media pm
  WHERE pm.person_id = p_person_id
  ORDER BY pm.is_primary DESC, pm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.get_person_media(uuid) SET search_path = family_tree, public;

-- Function to delete a media item
CREATE OR REPLACE FUNCTION public.delete_person_media(p_media_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_person_id uuid;
  v_storage_path text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get person_id and storage_path from media
  SELECT pm.person_id, pm.storage_path INTO v_person_id, v_storage_path
  FROM family_tree.person_media pm
  WHERE pm.id = p_media_id;

  IF v_person_id IS NULL THEN
    RAISE EXCEPTION 'Media not found';
  END IF;

  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons p
  WHERE p.id = v_person_id
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
    RAISE EXCEPTION 'Not allowed to delete media for this person';
  END IF;

  -- Delete the media record (CASCADE will handle main_photo_id update)
  DELETE FROM family_tree.person_media
  WHERE id = p_media_id;

  -- Note: The actual file in storage should be deleted by a trigger or edge function
  -- For now, we just delete the database record

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.delete_person_media(uuid) SET search_path = family_tree, public;

-- Function to add a media item (non-primary photo)
CREATE OR REPLACE FUNCTION public.add_person_media(
  p_person_id uuid,
  p_storage_path text,
  p_caption text DEFAULT NULL,
  p_taken_at date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  person_id uuid,
  type text,
  storage_path text,
  caption text,
  taken_at date,
  is_primary boolean,
  created_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_media_id uuid;
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
    RAISE EXCEPTION 'Not allowed to add media for this person';
  END IF;

  -- Insert new media (non-primary)
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
    false
  )
  RETURNING family_tree.person_media.id INTO v_media_id;

  -- Return the created media
  RETURN QUERY
  SELECT
    pm.id,
    pm.person_id,
    pm.type,
    pm.storage_path,
    pm.caption,
    pm.taken_at,
    pm.is_primary,
    pm.created_at
  FROM family_tree.person_media pm
  WHERE pm.id = v_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.add_person_media(uuid, text, text, date) SET search_path = family_tree, public;

