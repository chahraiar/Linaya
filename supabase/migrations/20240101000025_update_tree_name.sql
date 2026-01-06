-- Migration: Update tree name function
-- Description: Allow tree owners to update tree name and description

-- Function to update tree name and description (only for owners)
CREATE OR REPLACE FUNCTION public.update_tree(
  p_tree_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL
)
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
    RAISE EXCEPTION 'Only the owner can update this tree';
  END IF;
  
  -- Update tree (only update provided fields)
  UPDATE family_tree.trees
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    updated_at = now()
  WHERE id = p_tree_id;
  
  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.update_tree(uuid, text, text) SET search_path = family_tree, public;
GRANT EXECUTE ON FUNCTION public.update_tree(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.update_tree(uuid, text, text) IS 'Update tree name and/or description (only for owners).';

