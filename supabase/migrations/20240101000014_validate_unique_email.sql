-- Migration: Add email uniqueness validation per tree
-- Description: Ensure email addresses are unique within each tree

-- Function to check if an email already exists in a tree (excluding current person)
CREATE OR REPLACE FUNCTION family_tree.check_email_unique_in_tree(
  p_tree_id uuid,
  p_email text,
  p_exclude_person_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if email exists in the tree (case-insensitive)
  SELECT EXISTS(
    SELECT 1
    FROM family_tree.person_contacts pc
    INNER JOIN family_tree.persons p ON p.id = pc.person_id
    WHERE p.tree_id = p_tree_id
      AND pc.type = 'email'
      AND LOWER(TRIM(pc.value)) = LOWER(TRIM(p_email))
      AND p.deleted_at IS NULL
      AND (p_exclude_person_id IS NULL OR p.id != p_exclude_person_id)
  ) INTO v_exists;
  
  RETURN NOT v_exists; -- Return true if email is unique (doesn't exist)
END;
$$;

-- Public wrapper for check_email_unique_in_tree
CREATE OR REPLACE FUNCTION public.check_email_unique_in_tree(
  p_tree_id uuid,
  p_email text,
  p_exclude_person_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN family_tree.check_email_unique_in_tree(p_tree_id, p_email, p_exclude_person_id);
END;
$$;

ALTER FUNCTION public.check_email_unique_in_tree(uuid, text, uuid) SET search_path = family_tree, public;

GRANT EXECUTE ON FUNCTION public.check_email_unique_in_tree(uuid, text, uuid) TO authenticated;

COMMENT ON FUNCTION public.check_email_unique_in_tree(uuid, text, uuid) IS 'Check if an email is unique within a tree (excluding a specific person if provided)';

-- Modify upsert_person_contact to validate email uniqueness
CREATE OR REPLACE FUNCTION public.upsert_person_contact(
  p_person_id uuid,
  p_type text,
  p_value text,
  p_label text DEFAULT NULL,
  p_is_primary boolean DEFAULT false,
  p_visibility text DEFAULT 'tree'
)
RETURNS TABLE (
  contact_id uuid,
  contact_person_id uuid,
  contact_type text,
  contact_label text,
  contact_value text,
  contact_is_primary boolean,
  contact_visibility text,
  created_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_contact_id uuid;
  v_existing_contact_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons AS p
  WHERE p.id = p_person_id
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
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to update contacts for this person';
  END IF;

  -- Validate email uniqueness if type is 'email'
  IF p_type = 'email' AND p_value IS NOT NULL AND TRIM(p_value) != '' THEN
    -- Check if email already exists in the tree (excluding current person)
    IF NOT family_tree.check_email_unique_in_tree(v_tree_id, p_value, p_person_id) THEN
      RAISE EXCEPTION 'Cette adresse email est déjà utilisée dans cet arbre par une autre personne';
    END IF;
  END IF;

  -- If setting as primary, unset other primary contacts of the same type
  IF p_is_primary THEN
    UPDATE family_tree.person_contacts AS pc
    SET is_primary = false
    WHERE pc.person_id = p_person_id
      AND pc.type = p_type
      AND pc.is_primary = true;
  END IF;

  -- Check if contact already exists (same person, type, and value)
  SELECT pc.id INTO v_contact_id
  FROM family_tree.person_contacts AS pc
  WHERE pc.person_id = p_person_id
    AND pc.type = p_type
    AND LOWER(TRIM(pc.value)) = LOWER(TRIM(p_value))
  LIMIT 1;

  IF v_contact_id IS NOT NULL THEN
    -- Update existing contact (but check if email value changed)
    IF p_type = 'email' AND LOWER(TRIM(p_value)) != (
      SELECT LOWER(TRIM(value)) FROM family_tree.person_contacts WHERE id = v_contact_id
    ) THEN
      -- Email value changed, need to check uniqueness again
      IF NOT family_tree.check_email_unique_in_tree(v_tree_id, p_value, p_person_id) THEN
        RAISE EXCEPTION 'Cette adresse email est déjà utilisée dans cet arbre par une autre personne';
      END IF;
    END IF;
    
    -- Update existing contact
    UPDATE family_tree.person_contacts AS pc
    SET
      label = COALESCE(p_label, pc.label),
      value = p_value,
      is_primary = p_is_primary,
      visibility = p_visibility
    WHERE pc.id = v_contact_id;
  ELSE
    -- Insert new contact
    INSERT INTO family_tree.person_contacts (
      person_id,
      type,
      label,
      value,
      is_primary,
      visibility
    )
    VALUES (
      p_person_id,
      p_type,
      p_label,
      p_value,
      p_is_primary,
      p_visibility
    )
    RETURNING family_tree.person_contacts.id INTO v_contact_id;
  END IF;

  -- Return the contact
  RETURN QUERY
  SELECT
    pc.id          AS contact_id,
    pc.person_id   AS contact_person_id,
    pc.type        AS contact_type,
    pc.label       AS contact_label,
    pc.value       AS contact_value,
    pc.is_primary  AS contact_is_primary,
    pc.visibility  AS contact_visibility,
    pc.created_at
  FROM family_tree.person_contacts AS pc
  WHERE pc.id = v_contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.upsert_person_contact(uuid, text, text, text, boolean, text) SET search_path = family_tree, public;

