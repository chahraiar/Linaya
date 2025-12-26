-- Migration: Create family_tree schema
-- Description: Create dedicated schema for the family tree application
-- This isolates the app from other applications using the same Supabase instance

-- Create schema
CREATE SCHEMA IF NOT EXISTS family_tree;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA family_tree TO authenticated;
GRANT USAGE ON SCHEMA family_tree TO anon;

-- Set search path for convenience (optional, can be set per session)
-- ALTER DATABASE postgres SET search_path TO family_tree, public;

-- Comments
COMMENT ON SCHEMA family_tree IS 'Schema dedicated to the family tree application (Linaya)';

