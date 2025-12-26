-- Migration: Create trees and tree_members tables
-- Description: Family trees and their member management

-- Create trees table
CREATE TABLE family_tree.trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES family_tree.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tree_members table
CREATE TABLE family_tree.tree_members (
  tree_id uuid NOT NULL REFERENCES family_tree.trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES family_tree.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_email text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'invited')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tree_id, user_id)
);

-- Create trigger for trees updated_at
CREATE TRIGGER update_trees_updated_at
  BEFORE UPDATE ON family_tree.trees
  FOR EACH ROW
  EXECUTE FUNCTION family_tree.update_updated_at_column();

-- Auto-add owner to tree_members when tree is created
CREATE OR REPLACE FUNCTION family_tree.handle_new_tree()
RETURNS trigger AS $$
BEGIN
  INSERT INTO family_tree.tree_members (tree_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_tree_created
  AFTER INSERT ON family_tree.trees
  FOR EACH ROW
  EXECUTE FUNCTION family_tree.handle_new_tree();

-- Indexes
CREATE INDEX idx_trees_owner_id ON family_tree.trees(owner_id);
CREATE INDEX idx_tree_members_tree_id ON family_tree.tree_members(tree_id);
CREATE INDEX idx_tree_members_user_id ON family_tree.tree_members(user_id);
CREATE INDEX idx_tree_members_status ON family_tree.tree_members(status) WHERE status = 'invited';

-- Comments
COMMENT ON TABLE family_tree.trees IS 'Family trees owned by users';
COMMENT ON TABLE family_tree.tree_members IS 'Members of family trees with their roles and invitation status';
COMMENT ON COLUMN family_tree.tree_members.role IS 'Role: owner (full control), editor (can edit), viewer (read-only)';
COMMENT ON COLUMN family_tree.tree_members.invited_email IS 'Email of invited user (if status is invited)';

