-- Migration: Create profiles table
-- Description: User profiles with display preferences in family_tree schema
-- Note: Profiles reference auth.users but are isolated in family_tree schema

-- Create profiles table
CREATE TABLE family_tree.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  locale text DEFAULT 'fr' CHECK (locale IN ('fr', 'en')),
  theme text DEFAULT 'aurora' CHECK (theme IN ('aurora', 'graphite', 'ivory')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION family_tree.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON family_tree.profiles
  FOR EACH ROW
  EXECUTE FUNCTION family_tree.update_updated_at_column();

-- Auto-create profile on user signup
-- Note: This function runs in SECURITY DEFINER context to access auth.users
CREATE OR REPLACE FUNCTION family_tree.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO family_tree.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION family_tree.handle_new_user();

-- Indexes
CREATE INDEX idx_profiles_id ON family_tree.profiles(id);

-- Comments
COMMENT ON TABLE family_tree.profiles IS 'User profiles with display preferences and settings for the family tree app';
COMMENT ON COLUMN family_tree.profiles.locale IS 'User preferred language (fr or en)';
COMMENT ON COLUMN family_tree.profiles.theme IS 'User preferred theme (aurora, graphite, or ivory)';

