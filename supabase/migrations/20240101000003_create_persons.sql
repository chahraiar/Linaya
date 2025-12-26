-- Migration: Create persons and tree_self_person tables
-- Description: Persons in family trees and link to user profiles

-- Create persons table
CREATE TABLE family_tree.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES family_tree.trees(id) ON DELETE CASCADE,
  created_by uuid REFERENCES family_tree.profiles(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  display_name text,
  gender text CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  is_living boolean DEFAULT true,
  birth_date date,
  death_date date,
  notes text,
  main_photo_id uuid, -- Will be FK to person_media after media table is created
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create tree_self_person table (link user profile to person in tree)
CREATE TABLE family_tree.tree_self_person (
  tree_id uuid NOT NULL REFERENCES family_tree.trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES family_tree.profiles(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES family_tree.persons(id) ON DELETE CASCADE,
  PRIMARY KEY (tree_id, user_id),
  UNIQUE (tree_id, person_id)
);

-- Create trigger for persons updated_at
CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON family_tree.persons
  FOR EACH ROW
  EXECUTE FUNCTION family_tree.update_updated_at_column();

-- Indexes
CREATE INDEX idx_persons_tree_id ON family_tree.persons(tree_id);
CREATE INDEX idx_persons_created_by ON family_tree.persons(created_by);
CREATE INDEX idx_persons_deleted_at ON family_tree.persons(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_persons_name_search ON family_tree.persons USING gin(to_tsvector('french', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')));
CREATE INDEX idx_tree_self_person_tree_id ON family_tree.tree_self_person(tree_id);
CREATE INDEX idx_tree_self_person_user_id ON family_tree.tree_self_person(user_id);
CREATE INDEX idx_tree_self_person_person_id ON family_tree.tree_self_person(person_id);

-- Comments
COMMENT ON TABLE family_tree.persons IS 'Persons (nodes) in family trees';
COMMENT ON TABLE family_tree.tree_self_person IS 'Links user profiles to their person representation in a tree';
COMMENT ON COLUMN family_tree.persons.deleted_at IS 'Soft delete timestamp (NULL = not deleted)';
COMMENT ON COLUMN family_tree.persons.is_living IS 'Whether the person is currently alive';

