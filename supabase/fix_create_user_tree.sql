-- ============================================================================
-- FIX: Corriger la fonction create_user_tree pour éviter l'ambiguïté
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_user_tree(text, text);

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

  -- Return created tree using CTE to avoid column name ambiguity
  RETURN QUERY
  WITH selected_tree AS (
    SELECT 
      tr.id AS tree_id,
      tr.owner_id AS tree_owner_id,
      tr.name AS tree_name,
      tr.description AS tree_description,
      tr.created_at AS tree_created_at,
      tr.updated_at AS tree_updated_at
    FROM family_tree.trees tr
    WHERE tr.id = v_tree_id
  )
  SELECT 
    selected_tree.tree_id,
    selected_tree.tree_owner_id,
    selected_tree.tree_name,
    selected_tree.tree_description,
    selected_tree.tree_created_at,
    selected_tree.tree_updated_at
  FROM selected_tree;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION public.create_user_tree(text, text) SET search_path = family_tree, public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_tree(text, text) TO authenticated;

-- Test the function (uncomment to test)
-- SELECT * FROM public.create_user_tree('Test Tree', 'Test Description');

