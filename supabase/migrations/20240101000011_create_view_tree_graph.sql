-- Migration: Create tree_graph view
-- Description: View for efficient graph queries (nodes + edges) for React Native frontend

-- Create view for tree graph (nodes + edges)
-- This view makes it easy for the frontend to fetch the entire tree structure
CREATE OR REPLACE VIEW family_tree.tree_graph AS
SELECT
  p.id AS person_id,
  p.tree_id,
  p.first_name,
  p.last_name,
  p.display_name,
  p.gender,
  p.is_living,
  p.birth_date,
  p.death_date,
  p.main_photo_id,
  -- Relationships as edges
  r.id AS relationship_id,
  r.from_person_id,
  r.to_person_id,
  r.type AS relationship_type,
  r.notes AS relationship_notes
FROM family_tree.persons p
LEFT JOIN family_tree.person_relationships r
  ON (r.from_person_id = p.id OR r.to_person_id = p.id)
WHERE p.deleted_at IS NULL;

-- Grant access to authenticated users
GRANT SELECT ON family_tree.tree_graph TO authenticated;

-- Indexes are inherited from underlying tables

-- Comments
COMMENT ON VIEW family_tree.tree_graph IS 'Graph view of tree: persons (nodes) + relationships (edges) for efficient frontend queries';
COMMENT ON VIEW family_tree.tree_graph IS 'Use this view to fetch entire tree structure in one query for React Native';

