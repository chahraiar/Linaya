-- Migration: Fix update_person function overload conflict
-- Description: Drop all versions of update_person and recreate with is_visible support

-- Drop all existing versions of update_person to avoid overload conflicts
DROP FUNCTION IF EXISTS public.update_person(uuid, text, text, text, date, date, text, boolean, text);
DROP FUNCTION IF EXISTS public.update_person(uuid, text, text, text, date, date, text, boolean, boolean, text);
DROP FUNCTION IF EXISTS public.update_person(uuid);

-- Recreate update_person with is_visible parameter (single version)
CREATE OR REPLACE FUNCTION public.update_person(
  p_person_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_death_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_is_living boolean DEFAULT NULL,
  p_is_visible boolean DEFAULT NULL,
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
  is_visible boolean,
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
    is_visible   = COALESCE(p_is_visible, p.is_visible),
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
    p.is_visible,
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

-- Fix search_path for security
ALTER FUNCTION public.update_person(uuid, text, text, text, date, date, text, boolean, boolean, text)
SET search_path = family_tree, public;

