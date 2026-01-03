-- Migration: Delete tree function
-- Description: Allow tree owners to delete their trees

-- Function to delete a tree (only for owners)
CREATE OR REPLACE FUNCTION public.delete_tree(p_tree_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check that user is owner of the tree
  SELECT EXISTS(
    SELECT 1
    FROM family_tree.trees t
    WHERE t.id = p_tree_id
      AND t.owner_id = v_user_id
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the owner can delete this tree';
  END IF;
  
  -- Delete the tree (CASCADE will handle related data)
  DELETE FROM family_tree.trees
  WHERE id = p_tree_id;
  
  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.delete_tree(uuid) SET search_path = family_tree, public;
GRANT EXECUTE ON FUNCTION public.delete_tree(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_tree(uuid) IS 'Delete a tree (only for owners). All related data will be deleted via CASCADE.';

