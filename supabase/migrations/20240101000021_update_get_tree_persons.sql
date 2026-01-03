-- Migration: Update get_tree_persons to include is_visible field
-- Description: Add is_visible to the returned columns

-- Update get_tree_persons function to include is_visible
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
  is_visible boolean,
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
    p.is_visible,
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

