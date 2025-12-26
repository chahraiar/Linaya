-- Migration: Create helper functions
-- Description: Utility functions for common operations

-- ============================================================================
-- FUNCTION: Get all trees for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION family_tree.get_user_trees(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.owner_id,
    t.name,
    t.description,
    tm.role,
    t.created_at,
    t.updated_at
  FROM family_tree.trees t
  JOIN family_tree.tree_members tm ON tm.tree_id = t.id
  WHERE tm.user_id = p_user_id
    AND tm.status = 'active'
  ORDER BY t.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION family_tree.get_user_trees(uuid) SET search_path = family_tree, public;

-- ============================================================================
-- FUNCTION: Get all members of a tree
-- ============================================================================
CREATE OR REPLACE FUNCTION family_tree.get_tree_members(p_tree_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  role text,
  status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.user_id,
    p.display_name,
    p.avatar_url,
    tm.role,
    tm.status,
    tm.created_at
  FROM family_tree.tree_members tm
  JOIN family_tree.profiles p ON p.id = tm.user_id
  WHERE tm.tree_id = p_tree_id
  ORDER BY
    CASE tm.role
      WHEN 'owner' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'viewer' THEN 3
    END,
    tm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION family_tree.get_tree_members(uuid) SET search_path = family_tree, public;

-- ============================================================================
-- FUNCTION: Calculate relationship between two persons
-- ============================================================================
-- This is a simplified version - a full implementation would require
-- graph traversal algorithms (BFS/DFS) to find the shortest path
-- Note: type='parent' means from_person_id is parent of to_person_id
CREATE OR REPLACE FUNCTION family_tree.calculate_relationship(
  p_person_a_id uuid,
  p_person_b_id uuid
)
RETURNS text AS $$
DECLARE
  v_relationship text;
  v_path_length integer;
BEGIN
  -- Check if same person
  IF p_person_a_id = p_person_b_id THEN
    RETURN 'self';
  END IF;

  -- Check direct parent-child relationship
  -- A is parent of B: from=A, to=B, type=parent
  IF EXISTS (
    SELECT 1 FROM family_tree.person_relationships
    WHERE from_person_id = p_person_a_id
      AND to_person_id = p_person_b_id
      AND type = 'parent'
  ) THEN
    RETURN 'parent';
  END IF;

  -- B is parent of A: from=B, to=A, type=parent
  IF EXISTS (
    SELECT 1 FROM family_tree.person_relationships
    WHERE from_person_id = p_person_b_id
      AND to_person_id = p_person_a_id
      AND type = 'parent'
  ) THEN
    RETURN 'child';
  END IF;

  -- Check partner relationship
  IF EXISTS (
    SELECT 1 FROM family_tree.person_relationships
    WHERE (
      (from_person_id = p_person_a_id AND to_person_id = p_person_b_id)
      OR (from_person_id = p_person_b_id AND to_person_id = p_person_a_id)
    )
    AND type = 'partner'
  ) THEN
    RETURN 'partner';
  END IF;

  -- Check sibling relationship (same parents)
  -- Two persons are siblings if they share the same parent
  IF EXISTS (
    SELECT 1
    FROM family_tree.person_relationships r1
    JOIN family_tree.person_relationships r2
      ON r1.from_person_id = r2.from_person_id
      AND r1.type = 'parent'
      AND r2.type = 'parent'
    WHERE r1.to_person_id = p_person_a_id
      AND r2.to_person_id = p_person_b_id
  ) THEN
    RETURN 'sibling';
  END IF;

  -- For more complex relationships (cousin, uncle, etc.),
  -- a graph traversal algorithm would be needed
  -- This is a placeholder that returns 'related' for now
  RETURN 'related';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION family_tree.calculate_relationship(uuid, uuid) SET search_path = family_tree, public;

-- ============================================================================
-- FUNCTION: Get person with all relationships
-- ============================================================================
-- Note: type='parent' means from_person_id is parent of to_person_id
-- So for person X:
--   Parents = relationships where to_person_id = X (from is the parent)
--   Children = relationships where from_person_id = X (to is the child)
CREATE OR REPLACE FUNCTION family_tree.get_person_with_relationships(p_person_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'person', row_to_json(p.*),
    'parents', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.from_person_id,
        'type', 'parent'
      ))
      FROM family_tree.person_relationships pr
      WHERE pr.to_person_id = p_person_id
        AND pr.type = 'parent'
    ),
    'children', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.to_person_id,
        'type', 'child'
      ))
      FROM family_tree.person_relationships pr
      WHERE pr.from_person_id = p_person_id
        AND pr.type = 'parent'
    ),
    'partners', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', CASE
          WHEN pr.from_person_id = p_person_id THEN pr.to_person_id
          ELSE pr.from_person_id
        END,
        'type', 'partner'
      ))
      FROM family_tree.person_relationships pr
      WHERE (
        pr.from_person_id = p_person_id OR pr.to_person_id = p_person_id
      )
      AND pr.type = 'partner'
    )
  )
  INTO v_result
  FROM family_tree.persons p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_path for security
ALTER FUNCTION family_tree.get_person_with_relationships(uuid) SET search_path = family_tree, public;

-- Comments
COMMENT ON FUNCTION family_tree.get_user_trees IS 'Get all trees where a user is a member';
COMMENT ON FUNCTION family_tree.get_tree_members IS 'Get all members of a tree with their profiles';
COMMENT ON FUNCTION family_tree.calculate_relationship IS 'Calculate relationship between two persons (simplified version)';
COMMENT ON FUNCTION family_tree.get_person_with_relationships IS 'Get a person with all their relationships as JSON';

