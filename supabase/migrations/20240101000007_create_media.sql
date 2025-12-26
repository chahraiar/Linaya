-- Migration: Create person_media table
-- Description: Photos and documents for persons

-- Create person_media table
CREATE TABLE family_tree.person_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES family_tree.persons(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('photo', 'document')),
  storage_path text NOT NULL, -- Path in Supabase Storage bucket
  caption text,
  taken_at date, -- Date when photo was taken
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add FK constraint for persons.main_photo_id (deferred to avoid circular dependency)
ALTER TABLE family_tree.persons
  ADD CONSTRAINT fk_persons_main_photo_id
  FOREIGN KEY (main_photo_id)
  REFERENCES family_tree.person_media(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- Indexes
CREATE INDEX idx_person_media_person_id ON family_tree.person_media(person_id);
CREATE INDEX idx_person_media_type ON family_tree.person_media(type);
CREATE INDEX idx_person_media_primary ON family_tree.person_media(person_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_person_media_taken_at ON family_tree.person_media(taken_at);

-- Comments
COMMENT ON TABLE family_tree.person_media IS 'Photos and documents for persons stored in Supabase Storage';
COMMENT ON COLUMN family_tree.person_media.storage_path IS 'Path to file in Supabase Storage bucket (family-tree-media)';
COMMENT ON COLUMN family_tree.person_media.is_primary IS 'Whether this is the primary photo for the person';

