-- Migration: Create Storage bucket and policies
-- Description: Supabase Storage bucket for family tree media files

-- Create storage bucket (for self-hosted or local development)
-- Note: In Supabase Cloud, create the bucket via Dashboard
-- In self-hosted, you can run this:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'family-tree-media',
  'family-tree-media',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket settings:
--   - Public: false (private bucket)
--   - File size limit: 10MB
--   - Allowed MIME types: image/*, application/pdf
--   - Path format: {tree_id}/{person_id}/{media_id}.{ext}
--   - IMPORTANT: person_media.storage_path must equal storage.objects.name exactly

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================
-- Note: These policies assume that person_media.storage_path contains
-- the exact same value as storage.objects.name (e.g., "treeId/personId/mediaId.jpg")

-- Policy: Read media if tree member
DROP POLICY IF EXISTS "Storage: read if tree member" ON storage.objects;

CREATE POLICY "Storage: read if tree member"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'family-tree-media'
  AND EXISTS (
    SELECT 1
    FROM family_tree.person_media pm
    JOIN family_tree.persons p ON p.id = pm.person_id
    JOIN family_tree.tree_members tm ON tm.tree_id = p.tree_id
    WHERE pm.storage_path = storage.objects.name
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- Policy: Upload media if owner or editor
-- Note: For INSERT, we don't have person_media row yet, so we check tree_id from path
-- In WITH CHECK, we can use 'name' directly (the file being uploaded)
-- Use split_part instead of string_to_array for better performance and clarity
DROP POLICY IF EXISTS "Storage: upload if owner or editor" ON storage.objects;

CREATE POLICY "Storage: upload if owner or editor"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'family-tree-media'
  AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = split_part(name, '/', 1)::uuid
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'editor')
  )
);

-- Policy: Update media metadata if owner or editor
DROP POLICY IF EXISTS "Storage: update if owner or editor" ON storage.objects;

CREATE POLICY "Storage: update if owner or editor"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'family-tree-media'
  AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM family_tree.tree_members tm
    WHERE tm.tree_id = split_part(name, '/', 1)::uuid
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  bucket_id = 'family-tree-media'
);

-- Policy: Delete media if owner or editor
DROP POLICY IF EXISTS "Storage: delete if owner or editor" ON storage.objects;

CREATE POLICY "Storage: delete if owner or editor"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'family-tree-media'
  AND EXISTS (
    SELECT 1
    FROM family_tree.person_media pm
    JOIN family_tree.persons p ON p.id = pm.person_id
    JOIN family_tree.tree_members tm ON tm.tree_id = p.tree_id
    WHERE pm.storage_path = storage.objects.name
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'editor')
  )
);

-- Comments
COMMENT ON SCHEMA family_tree IS 'Storage bucket: family-tree-media';
COMMENT ON SCHEMA family_tree IS 'IMPORTANT: person_media.storage_path must equal storage.objects.name exactly';

