-- Migration: Share tree by email
-- Description: Allow sharing a tree with a user by finding their email in the tree

-- Function to find a person in a tree by email
CREATE OR REPLACE FUNCTION family_tree.find_person_by_email_in_tree(
  p_tree_id uuid,
  p_email text
)
RETURNS TABLE (
  person_id uuid,
  first_name text,
  last_name text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS person_id,
    p.first_name,
    p.last_name,
    p.display_name
  FROM family_tree.persons p
  INNER JOIN family_tree.person_contacts pc ON pc.person_id = p.id
  WHERE p.tree_id = p_tree_id
    AND pc.type = 'email'
    AND LOWER(TRIM(pc.value)) = LOWER(TRIM(p_email))
    AND p.deleted_at IS NULL
  LIMIT 1;
END;
$$;

-- Public wrapper
CREATE OR REPLACE FUNCTION public.find_person_by_email_in_tree(
  p_tree_id uuid,
  p_email text
)
RETURNS TABLE (
  person_id uuid,
  first_name text,
  last_name text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM family_tree.find_person_by_email_in_tree(p_tree_id, p_email);
END;
$$;

ALTER FUNCTION public.find_person_by_email_in_tree(uuid, text) SET search_path = family_tree, public;
GRANT EXECUTE ON FUNCTION public.find_person_by_email_in_tree(uuid, text) TO authenticated;

-- Function to find user profile by email (from auth.users)
CREATE OR REPLACE FUNCTION family_tree.find_user_by_email(
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find user in auth.users by email
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(p_email))
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$;

-- Public wrapper
CREATE OR REPLACE FUNCTION public.find_user_by_email(
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN family_tree.find_user_by_email(p_email);
END;
$$;

ALTER FUNCTION public.find_user_by_email(text) SET search_path = family_tree, public, auth;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;

-- Function to share tree with a user by email (viewer role)
CREATE OR REPLACE FUNCTION public.share_tree_by_email(
  p_tree_id uuid,
  p_email text,
  p_role text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
  v_target_user_id uuid;
  v_person_data record;
  v_result jsonb;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check that current user is owner/editor of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = p_tree_id
      AND tm.user_id = v_current_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to share this tree';
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid role. Must be viewer or editor';
  END IF;
  
  -- Find person in tree by email
  SELECT * INTO v_person_data
  FROM family_tree.find_person_by_email_in_tree(p_tree_id, p_email)
  LIMIT 1;
  
  IF v_person_data IS NULL THEN
    RAISE EXCEPTION 'Aucune personne trouvée dans cet arbre avec l''adresse email %', p_email;
  END IF;
  
  -- Find user by email (from auth.users)
  v_target_user_id := family_tree.find_user_by_email(p_email);
  
  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'L''utilisateur avec l''adresse email % n''a pas encore de compte. Veuillez lui demander de créer un compte d''abord.', p_email;
  END IF;
  
  -- Verify user has a profile
  IF NOT EXISTS (SELECT 1 FROM family_tree.profiles WHERE id = v_target_user_id) THEN
    RAISE EXCEPTION 'Le profil utilisateur n''existe pas pour cette adresse email';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM family_tree.tree_members tm
    WHERE tm.tree_id = p_tree_id
      AND tm.user_id = v_target_user_id
  ) THEN
    -- Update existing membership
    UPDATE family_tree.tree_members
    SET role = p_role, status = 'active', invited_email = NULL
    WHERE tree_id = p_tree_id AND user_id = v_target_user_id;
    
    v_result := jsonb_build_object(
      'success', true,
      'status', 'active',
      'message', 'Rôle mis à jour avec succès',
      'person_id', v_person_data.person_id,
      'person_name', COALESCE(v_person_data.display_name, v_person_data.first_name || ' ' || v_person_data.last_name),
      'user_id', v_target_user_id
    );
  ELSE
    -- Add user to tree_members
    INSERT INTO family_tree.tree_members (tree_id, user_id, role, status)
    VALUES (p_tree_id, v_target_user_id, p_role, 'active');
    
    v_result := jsonb_build_object(
      'success', true,
      'status', 'active',
      'message', 'Arbre partagé avec succès',
      'person_id', v_person_data.person_id,
      'person_name', COALESCE(v_person_data.display_name, v_person_data.first_name || ' ' || v_person_data.last_name),
      'user_id', v_target_user_id
    );
  END IF;
  
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.share_tree_by_email(uuid, text, text) SET search_path = family_tree, public, auth;
GRANT EXECUTE ON FUNCTION public.share_tree_by_email(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.share_tree_by_email(uuid, text, text) IS 'Share a tree with a user by finding their email in the tree. Returns invitation or active status.';

