-- Migration: Auto-join trees by email
-- Description: Automatically add users to trees where their email appears

-- Function to find trees where user's email appears and auto-join them
CREATE OR REPLACE FUNCTION public.auto_join_trees_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_trees_joined integer := 0;
  v_tree_ids uuid[];
  v_tree_record record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User email not found',
      'trees_joined', 0
    );
  END IF;
  
  -- Find all trees where user's email appears in person_contacts
  FOR v_tree_record IN
    SELECT DISTINCT p.tree_id
    FROM family_tree.persons p
    INNER JOIN family_tree.person_contacts pc ON pc.person_id = p.id
    WHERE pc.type = 'email'
      AND LOWER(TRIM(pc.value)) = LOWER(TRIM(v_user_email))
      AND p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM family_tree.tree_members tm
        WHERE tm.tree_id = p.tree_id
          AND tm.user_id = v_user_id
      )
  LOOP
    -- Add user as viewer to the tree
    INSERT INTO family_tree.tree_members (tree_id, user_id, role, status)
    VALUES (v_tree_record.tree_id, v_user_id, 'viewer', 'active')
    ON CONFLICT (tree_id, user_id) DO NOTHING;
    
    v_trees_joined := v_trees_joined + 1;
    v_tree_ids := array_append(v_tree_ids, v_tree_record.tree_id);
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Auto-joined %s tree(s)', v_trees_joined),
    'trees_joined', v_trees_joined,
    'tree_ids', v_tree_ids
  );
END;
$$;

ALTER FUNCTION public.auto_join_trees_by_email() SET search_path = family_tree, public, auth;
GRANT EXECUTE ON FUNCTION public.auto_join_trees_by_email() TO authenticated;

COMMENT ON FUNCTION public.auto_join_trees_by_email() IS 'Automatically add the current user to trees where their email appears in person contacts';

