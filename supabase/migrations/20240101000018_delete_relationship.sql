-- Migration: Delete relationship function
-- Description: Allow users to delete relationships between persons

-- Function to delete a relationship between two persons
CREATE OR REPLACE FUNCTION public.delete_person_relationship(
  p_from_person_id uuid,
  p_to_person_id uuid,
  p_relationship_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_relationship_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get tree_id from one of the persons
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons AS p
  WHERE p.id = p_from_person_id
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
      AND tm.role IN ('owner', 'editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to delete relationships in this tree';
  END IF;
  
  -- Find and delete the relationship
  -- For parent relationships, we need to match the direction
  -- For partner relationships, direction doesn't matter
  IF p_relationship_type = 'parent' THEN
    DELETE FROM family_tree.person_relationships
    WHERE from_person_id = p_from_person_id
      AND to_person_id = p_to_person_id
      AND type = 'parent';
  ELSIF p_relationship_type = 'partner' THEN
    DELETE FROM family_tree.person_relationships
    WHERE (
      (from_person_id = p_from_person_id AND to_person_id = p_to_person_id)
      OR (from_person_id = p_to_person_id AND to_person_id = p_from_person_id)
    )
    AND type = 'partner';
  ELSE
    RAISE EXCEPTION 'Invalid relationship type';
  END IF;
  
  RETURN FOUND;
END;
$$;

ALTER FUNCTION public.delete_person_relationship(uuid, uuid, text) SET search_path = family_tree, public;
GRANT EXECUTE ON FUNCTION public.delete_person_relationship(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.delete_person_relationship(uuid, uuid, text) IS 'Delete a relationship between two persons (parent or partner). Only owners and editors can delete relationships.';

