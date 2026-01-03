-- Migration: Add is_visible field to persons table
-- Description: Allow users to hide/show person cards in the tree view

-- Add is_visible column to persons table (default true for existing records)
ALTER TABLE family_tree.persons
ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true NOT NULL;

-- Create index for filtering visible persons
CREATE INDEX IF NOT EXISTS idx_persons_is_visible ON family_tree.persons(is_visible) WHERE is_visible = true;

-- Add comment
COMMENT ON COLUMN family_tree.persons.is_visible IS 'Controls whether the person card is visible in the tree view. Default: true.';

