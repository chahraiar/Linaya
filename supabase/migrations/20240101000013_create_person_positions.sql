-- Migration: Create person_positions table
-- Description: Store custom positions for persons in family tree (for manual layout editing)

-- Create person_positions table
CREATE TABLE family_tree.person_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES family_tree.trees(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES family_tree.persons(id) ON DELETE CASCADE,
  position_x numeric NOT NULL,
  position_y numeric NOT NULL,
  created_by uuid REFERENCES family_tree.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tree_id, person_id)
);

-- Indexes
CREATE INDEX idx_person_positions_tree_id ON family_tree.person_positions(tree_id);
CREATE INDEX idx_person_positions_person_id ON family_tree.person_positions(person_id);

-- Create trigger for updated_at
CREATE TRIGGER update_person_positions_updated_at
  BEFORE UPDATE ON family_tree.person_positions
  FOR EACH ROW
  EXECUTE FUNCTION family_tree.update_updated_at_column();

-- Internal function in family_tree schema
CREATE OR REPLACE FUNCTION family_tree.save_person_position(
  p_tree_id uuid,
  p_person_id uuid,
  p_position_x numeric,
  p_position_y numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO family_tree.person_positions (tree_id, person_id, position_x, position_y, created_by)
  VALUES (p_tree_id, p_person_id, p_position_x, p_position_y, auth.uid())
  ON CONFLICT (tree_id, person_id)
  DO UPDATE SET
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    updated_at = now();
END;
$$;

-- Internal function in family_tree schema
CREATE OR REPLACE FUNCTION family_tree.get_person_positions(p_tree_id uuid)
RETURNS TABLE (
  person_id uuid,
  position_x numeric,
  position_y numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.person_id,
    pp.position_x,
    pp.position_y
  FROM family_tree.person_positions pp
  WHERE pp.tree_id = p_tree_id;
END;
$$;

-- Internal function in family_tree schema
CREATE OR REPLACE FUNCTION family_tree.delete_person_position(
  p_tree_id uuid,
  p_person_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM family_tree.person_positions
  WHERE tree_id = p_tree_id AND person_id = p_person_id;
END;
$$;

-- ============================================================================
-- PUBLIC WRAPPERS FOR POSTGREST API ACCESS
-- ============================================================================

-- Public wrapper for save_person_position
CREATE OR REPLACE FUNCTION public.save_person_position(
  p_tree_id uuid,
  p_person_id uuid,
  p_position_x numeric,
  p_position_y numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM family_tree.save_person_position(p_tree_id, p_person_id, p_position_x, p_position_y);
END;
$$;

ALTER FUNCTION public.save_person_position(uuid, uuid, numeric, numeric) SET search_path = family_tree, public;

-- Public wrapper for get_person_positions
CREATE OR REPLACE FUNCTION public.get_person_positions(p_tree_id uuid)
RETURNS TABLE (
  person_id uuid,
  position_x numeric,
  position_y numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM family_tree.get_person_positions(p_tree_id);
END;
$$;

ALTER FUNCTION public.get_person_positions(uuid) SET search_path = family_tree, public;

-- Public wrapper for delete_person_position
CREATE OR REPLACE FUNCTION public.delete_person_position(
  p_tree_id uuid,
  p_person_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM family_tree.delete_person_position(p_tree_id, p_person_id);
END;
$$;

ALTER FUNCTION public.delete_person_position(uuid, uuid) SET search_path = family_tree, public;

