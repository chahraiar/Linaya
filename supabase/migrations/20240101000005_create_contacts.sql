-- Migration: Create person_contacts table
-- Description: Contact information for persons (email, phone, social media, etc.)

-- Create person_contacts table
CREATE TABLE family_tree.person_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES family_tree.persons(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'mobile', 'social', 'website', 'other')),
  label text, -- e.g., "Facebook", "Instagram", "Work email"
  value text NOT NULL,
  is_primary boolean DEFAULT false,
  visibility text DEFAULT 'tree' CHECK (visibility IN ('private', 'tree', 'shared')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_person_contacts_person_id ON family_tree.person_contacts(person_id);
CREATE INDEX idx_person_contacts_type ON family_tree.person_contacts(type);
CREATE INDEX idx_person_contacts_primary ON family_tree.person_contacts(person_id, is_primary) WHERE is_primary = true;

-- Comments
COMMENT ON TABLE family_tree.person_contacts IS 'Contact information for persons (email, phone, social media, etc.)';
COMMENT ON COLUMN family_tree.person_contacts.type IS 'Type of contact: email, mobile, social, website, other';
COMMENT ON COLUMN family_tree.person_contacts.visibility IS 'Visibility level: private (only self), tree (all tree members), shared (public)';
COMMENT ON COLUMN family_tree.person_contacts.is_primary IS 'Whether this is the primary contact of this type';

