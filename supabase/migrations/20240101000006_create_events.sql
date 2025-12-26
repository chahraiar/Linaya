-- Migration: Create person_events and event_participants tables
-- Description: Life events (birth, death, marriage, etc.) and their participants

-- Create person_events table
CREATE TABLE family_tree.person_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES family_tree.persons(id) ON DELETE CASCADE,
  type text NOT NULL, -- e.g., 'birth', 'death', 'marriage', 'baptism', 'graduation'
  date_start date,
  date_end date,
  place_name text,
  place_lat double precision,
  place_lng double precision,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_participants table
CREATE TABLE family_tree.event_participants (
  event_id uuid NOT NULL REFERENCES family_tree.person_events(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES family_tree.persons(id) ON DELETE CASCADE,
  role text, -- e.g., 'spouse', 'witness', 'child', 'parent'
  PRIMARY KEY (event_id, person_id)
);

-- Create trigger for person_events updated_at
CREATE TRIGGER update_person_events_updated_at
  BEFORE UPDATE ON family_tree.person_events
  FOR EACH ROW
  EXECUTE FUNCTION family_tree.update_updated_at_column();

-- Indexes
CREATE INDEX idx_person_events_person_id ON family_tree.person_events(person_id);
CREATE INDEX idx_person_events_type ON family_tree.person_events(type);
CREATE INDEX idx_person_events_date_start ON family_tree.person_events(date_start);
CREATE INDEX idx_event_participants_event_id ON family_tree.event_participants(event_id);
CREATE INDEX idx_event_participants_person_id ON family_tree.event_participants(person_id);

-- Comments
COMMENT ON TABLE family_tree.person_events IS 'Life events for persons (birth, death, marriage, etc.)';
COMMENT ON TABLE family_tree.event_participants IS 'Participants in events (e.g., spouse in marriage, witnesses)';
COMMENT ON COLUMN family_tree.person_events.type IS 'Type of event: birth, death, marriage, baptism, graduation, etc.';
COMMENT ON COLUMN family_tree.person_events.place_lat IS 'Latitude of event location (for mapping)';
COMMENT ON COLUMN family_tree.person_events.place_lng IS 'Longitude of event location (for mapping)';

