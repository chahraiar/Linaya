-- Migration: CRUD functions for person events
-- Description: Create, update, and delete person events

-- Function to create a person event
CREATE OR REPLACE FUNCTION public.create_person_event(
  p_person_id uuid,
  p_type text,
  p_date_start date DEFAULT NULL,
  p_date_end date DEFAULT NULL,
  p_place_name text DEFAULT NULL,
  p_place_lat double precision DEFAULT NULL,
  p_place_lng double precision DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  person_id uuid,
  type text,
  date_start date,
  date_end date,
  place_name text,
  place_lat double precision,
  place_lng double precision,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
  v_event_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get tree_id from person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.persons p
  WHERE p.id = p_person_id
    AND p.deleted_at IS NULL;
  
  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Person not found';
  END IF;
  
  -- Check that user is owner/editor of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to create events in this tree';
  END IF;
  
  -- Create event
  INSERT INTO family_tree.person_events (
    person_id,
    type,
    date_start,
    date_end,
    place_name,
    place_lat,
    place_lng,
    notes
  )
  VALUES (
    p_person_id,
    p_type,
    p_date_start,
    p_date_end,
    p_place_name,
    p_place_lat,
    p_place_lng,
    p_notes
  )
  RETURNING family_tree.person_events.id INTO v_event_id;
  
  -- Return created event
  RETURN QUERY
  SELECT
    pe.id,
    pe.person_id,
    pe.type,
    pe.date_start,
    pe.date_end,
    pe.place_name,
    pe.place_lat,
    pe.place_lng,
    pe.notes,
    pe.created_at,
    pe.updated_at
  FROM family_tree.person_events pe
  WHERE pe.id = v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.create_person_event(uuid, text, date, date, text, double precision, double precision, text)
SET search_path = family_tree, public;

GRANT EXECUTE ON FUNCTION public.create_person_event(uuid, text, date, date, text, double precision, double precision, text) TO authenticated;

COMMENT ON FUNCTION public.create_person_event(uuid, text, date, date, text, double precision, double precision, text) IS 'Create a new person event (only for owners/editors)';

-- Function to update a person event
CREATE OR REPLACE FUNCTION public.update_person_event(
  p_event_id uuid,
  p_type text DEFAULT NULL,
  p_date_start date DEFAULT NULL,
  p_date_end date DEFAULT NULL,
  p_place_name text DEFAULT NULL,
  p_place_lat double precision DEFAULT NULL,
  p_place_lng double precision DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  person_id uuid,
  type text,
  date_start date,
  date_end date,
  place_name text,
  place_lat double precision,
  place_lng double precision,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get tree_id from event's person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.person_events pe
  JOIN family_tree.persons p ON p.id = pe.person_id
  WHERE pe.id = p_event_id
    AND p.deleted_at IS NULL;
  
  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Check that user is owner/editor of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to update events in this tree';
  END IF;
  
  -- Update event (only update provided fields)
  UPDATE family_tree.person_events
  SET
    type = COALESCE(p_type, type),
    date_start = COALESCE(p_date_start, date_start),
    date_end = COALESCE(p_date_end, date_end),
    place_name = COALESCE(p_place_name, place_name),
    place_lat = COALESCE(p_place_lat, place_lat),
    place_lng = COALESCE(p_place_lng, place_lng),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_event_id;
  
  -- Return updated event
  RETURN QUERY
  SELECT
    pe.id,
    pe.person_id,
    pe.type,
    pe.date_start,
    pe.date_end,
    pe.place_name,
    pe.place_lat,
    pe.place_lng,
    pe.notes,
    pe.created_at,
    pe.updated_at
  FROM family_tree.person_events pe
  WHERE pe.id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.update_person_event(uuid, text, date, date, text, double precision, double precision, text)
SET search_path = family_tree, public;

GRANT EXECUTE ON FUNCTION public.update_person_event(uuid, text, date, date, text, double precision, double precision, text) TO authenticated;

COMMENT ON FUNCTION public.update_person_event(uuid, text, date, date, text, double precision, double precision, text) IS 'Update a person event (only for owners/editors)';

-- Function to delete a person event
CREATE OR REPLACE FUNCTION public.delete_person_event(p_event_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
  v_tree_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get tree_id from event's person
  SELECT p.tree_id INTO v_tree_id
  FROM family_tree.person_events pe
  JOIN family_tree.persons p ON p.id = pe.person_id
  WHERE pe.id = p_event_id
    AND p.deleted_at IS NULL;
  
  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Check that user is owner/editor of the tree
  IF NOT EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = v_tree_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
      AND tm.role IN ('owner','editor')
  ) THEN
    RAISE EXCEPTION 'Not allowed to delete events in this tree';
  END IF;
  
  -- Delete event
  DELETE FROM family_tree.person_events
  WHERE id = p_event_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.delete_person_event(uuid) SET search_path = family_tree, public;

GRANT EXECUTE ON FUNCTION public.delete_person_event(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_person_event(uuid) IS 'Delete a person event (only for owners/editors)';

