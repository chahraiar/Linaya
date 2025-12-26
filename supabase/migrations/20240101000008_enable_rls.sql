-- Migration: Enable Row Level Security (RLS) on all tables
-- Description: Security policies for the family tree application

-- Enable RLS on all tables
ALTER TABLE family_tree.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.tree_self_person ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.person_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.person_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.person_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree.person_media ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is member of a tree
CREATE OR REPLACE FUNCTION family_tree.is_tree_member(p_tree_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM family_tree.tree_members
    WHERE tree_id = p_tree_id
      AND user_id = p_user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get user role in a tree
CREATE OR REPLACE FUNCTION family_tree.get_tree_role(p_tree_id uuid, p_user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role
    FROM family_tree.tree_members
    WHERE tree_id = p_tree_id
      AND user_id = p_user_id
      AND status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Anyone can read display_name and avatar_url (for public display)
CREATE POLICY "Profiles: Public read"
  ON family_tree.profiles
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Users can update their own profile
CREATE POLICY "Profiles: Update own"
  ON family_tree.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- TREES POLICIES
-- ============================================================================

-- Users can read trees they are members of
CREATE POLICY "Trees: Read if member"
  ON family_tree.trees
  FOR SELECT
  TO authenticated
  USING (family_tree.is_tree_member(id, auth.uid()));

-- Owners can create trees
CREATE POLICY "Trees: Create"
  ON family_tree.trees
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Owners and editors can update trees
CREATE POLICY "Trees: Update if owner or editor"
  ON family_tree.trees
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR family_tree.get_tree_role(id, auth.uid()) IN ('owner', 'editor')
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR family_tree.get_tree_role(id, auth.uid()) IN ('owner', 'editor')
  );

-- Only owners can delete trees
CREATE POLICY "Trees: Delete if owner"
  ON family_tree.trees
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ============================================================================
-- TREE_MEMBERS POLICIES
-- ============================================================================

-- Users can read members of trees they belong to
CREATE POLICY "Tree members: Read if member"
  ON family_tree.tree_members
  FOR SELECT
  TO authenticated
  USING (family_tree.is_tree_member(tree_id, auth.uid()));

-- Owners can add members
CREATE POLICY "Tree members: Insert if owner"
  ON family_tree.tree_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    family_tree.get_tree_role(tree_id, auth.uid()) = 'owner'
  );

-- Owners can update members (change role, etc.)
CREATE POLICY "Tree members: Update if owner"
  ON family_tree.tree_members
  FOR UPDATE
  TO authenticated
  USING (family_tree.get_tree_role(tree_id, auth.uid()) = 'owner')
  WITH CHECK (family_tree.get_tree_role(tree_id, auth.uid()) = 'owner');

-- Owners can remove members (except themselves if they're the only owner)
CREATE POLICY "Tree members: Delete if owner"
  ON family_tree.tree_members
  FOR DELETE
  TO authenticated
  USING (family_tree.get_tree_role(tree_id, auth.uid()) = 'owner');

-- ============================================================================
-- PERSONS POLICIES
-- ============================================================================

-- Users can read persons in trees they are members of
CREATE POLICY "Persons: Read if tree member"
  ON family_tree.persons
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND family_tree.is_tree_member(tree_id, auth.uid())
  );

-- Owners and editors can create persons
CREATE POLICY "Persons: Insert if owner or editor"
  ON family_tree.persons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    family_tree.get_tree_role(tree_id, auth.uid()) IN ('owner', 'editor')
  );

-- Owners and editors can update persons
CREATE POLICY "Persons: Update if owner or editor"
  ON family_tree.persons
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND family_tree.get_tree_role(tree_id, auth.uid()) IN ('owner', 'editor')
  )
  WITH CHECK (
    deleted_at IS NULL
    AND family_tree.get_tree_role(tree_id, auth.uid()) IN ('owner', 'editor')
  );

-- Owners and editors can soft-delete persons
CREATE POLICY "Persons: Delete if owner or editor"
  ON family_tree.persons
  FOR DELETE
  TO authenticated
  USING (
    family_tree.get_tree_role(tree_id, auth.uid()) IN ('owner', 'editor')
  );

-- ============================================================================
-- TREE_SELF_PERSON POLICIES
-- ============================================================================

-- Users can read their own links
CREATE POLICY "Tree self person: Read own"
  ON family_tree.tree_self_person
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR family_tree.is_tree_member(tree_id, auth.uid()));

-- Users can create their own link
CREATE POLICY "Tree self person: Insert own"
  ON family_tree.tree_self_person
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND family_tree.is_tree_member(tree_id, auth.uid())
  );

-- Users can update their own link
CREATE POLICY "Tree self person: Update own"
  ON family_tree.tree_self_person
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own link
CREATE POLICY "Tree self person: Delete own"
  ON family_tree.tree_self_person
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- PERSON_RELATIONSHIPS POLICIES
-- ============================================================================

-- Users can read relationships in trees they are members of
CREATE POLICY "Relationships: Read if tree member"
  ON family_tree.person_relationships
  FOR SELECT
  TO authenticated
  USING (family_tree.is_tree_member(tree_id, auth.uid()));

-- Owners and editors can create relationships
CREATE POLICY "Relationships: Insert if owner or editor"
  ON family_tree.person_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    family_tree.get_tree_role(tree_id, auth.uid()) IN ('owner', 'editor')
  );

-- Owners and editors can update relationships
CREATE POLICY "Relationships: Update if owner or editor"
  ON family_tree.person_relationships
  FOR UPDATE
  TO authenticated
  USING (
    family_tree.get_tree_role(tree_id, auth.uid()) IN ('owner', 'editor')
  )
  WITH CHECK (
    family_tree.get_tree_role(tree_id, auth.uid()) IN ('owner', 'editor')
  );

-- Owners and editors can delete relationships
CREATE POLICY "Relationships: Delete if owner or editor"
  ON family_tree.person_relationships
  FOR DELETE
  TO authenticated
  USING (
    family_tree.get_tree_role(tree_id, auth.uid()) IN ('owner', 'editor')
  );

-- ============================================================================
-- PERSON_CONTACTS POLICIES
-- ============================================================================

-- Users can read contacts based on visibility
CREATE POLICY "Contacts: Read based on visibility"
  ON family_tree.person_contacts
  FOR SELECT
  TO authenticated
  USING (
    CASE visibility
      WHEN 'private' THEN
        EXISTS (
          SELECT 1 FROM family_tree.tree_self_person tsp
          JOIN family_tree.persons p ON p.id = tsp.person_id
          WHERE p.id = person_contacts.person_id
            AND tsp.user_id = auth.uid()
        )
      WHEN 'tree' THEN
        EXISTS (
          SELECT 1 FROM family_tree.persons p
          WHERE p.id = person_contacts.person_id
            AND family_tree.is_tree_member(p.tree_id, auth.uid())
        )
      WHEN 'shared' THEN true
      ELSE false
    END
  );

-- Owners and editors can create contacts
CREATE POLICY "Contacts: Insert if owner or editor"
  ON family_tree.person_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_contacts.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Owners and editors can update contacts
CREATE POLICY "Contacts: Update if owner or editor"
  ON family_tree.person_contacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_contacts.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_contacts.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Owners and editors can delete contacts
CREATE POLICY "Contacts: Delete if owner or editor"
  ON family_tree.person_contacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_contacts.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- PERSON_EVENTS POLICIES
-- ============================================================================

-- Users can read events in trees they are members of
CREATE POLICY "Events: Read if tree member"
  ON family_tree.person_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_events.person_id
        AND family_tree.is_tree_member(p.tree_id, auth.uid())
    )
  );

-- Owners and editors can create events
CREATE POLICY "Events: Insert if owner or editor"
  ON family_tree.person_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_events.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Owners and editors can update events
CREATE POLICY "Events: Update if owner or editor"
  ON family_tree.person_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_events.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_events.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Owners and editors can delete events
CREATE POLICY "Events: Delete if owner or editor"
  ON family_tree.person_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_events.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- EVENT_PARTICIPANTS POLICIES
-- ============================================================================

-- Users can read participants if they can read the event
CREATE POLICY "Event participants: Read if can read event"
  ON family_tree.event_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.person_events pe
      JOIN family_tree.persons p ON p.id = pe.person_id
      WHERE pe.id = event_participants.event_id
        AND family_tree.is_tree_member(p.tree_id, auth.uid())
    )
  );

-- Owners and editors can create participants
CREATE POLICY "Event participants: Insert if owner or editor"
  ON family_tree.event_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tree.person_events pe
      JOIN family_tree.persons p ON p.id = pe.person_id
      WHERE pe.id = event_participants.event_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Owners and editors can update participants
CREATE POLICY "Event participants: Update if owner or editor"
  ON family_tree.event_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.person_events pe
      JOIN family_tree.persons p ON p.id = pe.person_id
      WHERE pe.id = event_participants.event_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tree.person_events pe
      JOIN family_tree.persons p ON p.id = pe.person_id
      WHERE pe.id = event_participants.event_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Owners and editors can delete participants
CREATE POLICY "Event participants: Delete if owner or editor"
  ON family_tree.event_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.person_events pe
      JOIN family_tree.persons p ON p.id = pe.person_id
      WHERE pe.id = event_participants.event_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- PERSON_MEDIA POLICIES
-- ============================================================================

-- Users can read media in trees they are members of
CREATE POLICY "Media: Read if tree member"
  ON family_tree.person_media
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_media.person_id
        AND family_tree.is_tree_member(p.tree_id, auth.uid())
    )
  );

-- Owners and editors can create media
CREATE POLICY "Media: Insert if owner or editor"
  ON family_tree.person_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_media.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Owners and editors can update media
CREATE POLICY "Media: Update if owner or editor"
  ON family_tree.person_media
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_media.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_media.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Owners and editors can delete media
CREATE POLICY "Media: Delete if owner or editor"
  ON family_tree.person_media
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.id = person_media.person_id
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  );

-- Comments
COMMENT ON FUNCTION family_tree.is_tree_member IS 'Check if a user is an active member of a tree';
COMMENT ON FUNCTION family_tree.get_tree_role IS 'Get the role of a user in a tree (owner, editor, or viewer)';

