-- Migration: Create person_relationships table
-- Description: Family relationships between persons (parent-child, partners)

-- Create person_relationships table
CREATE TABLE family_tree.person_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES family_tree.trees(id) ON DELETE CASCADE,
  from_person_id uuid NOT NULL REFERENCES family_tree.persons(id) ON DELETE CASCADE,
  to_person_id uuid NOT NULL REFERENCES family_tree.persons(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('parent', 'partner')),
  notes text,
  created_at timestamptz DEFAULT now(),
  CHECK (from_person_id != to_person_id)
);

-- Indexes
CREATE INDEX idx_person_relationships_tree_id ON family_tree.person_relationships(tree_id);
CREATE INDEX idx_person_relationships_from_person ON family_tree.person_relationships(from_person_id);
CREATE INDEX idx_person_relationships_to_person ON family_tree.person_relationships(to_person_id);
CREATE INDEX idx_person_relationships_type ON family_tree.person_relationships(type);

-- Unique constraint: prevent duplicate relationships
CREATE UNIQUE INDEX idx_person_relationships_unique 
  ON family_tree.person_relationships(tree_id, from_person_id, to_person_id, type);

-- Comments
COMMENT ON TABLE family_tree.person_relationships IS 'Family relationships between persons (parent-child, partners)';
COMMENT ON COLUMN family_tree.person_relationships.type IS 'Type: parent (from is parent of to), partner (from and to are partners)';
COMMENT ON COLUMN family_tree.person_relationships.from_person_id IS 'Source person in the relationship';
COMMENT ON COLUMN family_tree.person_relationships.to_person_id IS 'Target person in the relationship';

