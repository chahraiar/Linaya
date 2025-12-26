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
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
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
    WHERE pm.storage_path = storage.objects.name
      AND family_tree.is_tree_member(p.tree_id, auth.uid())
  )
);

-- Policy: Upload media if owner or editor
-- Note: For INSERT, we don't have person_media row yet, so we check tree_id from path
CREATE POLICY "Storage: upload if owner or editor"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'family-tree-media'
  AND family_tree.get_tree_role(((string_to_array(storage.objects.name, '/'))[1])::uuid, auth.uid()) IN ('owner', 'editor')
);

-- Policy: Delete media if owner or editor
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
    WHERE pm.storage_path = storage.objects.name
      AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
  )
);

-- Comments
COMMENT ON SCHEMA family_tree IS 'Storage bucket: family-tree-media';
COMMENT ON SCHEMA family_tree IS 'IMPORTANT: person_media.storage_path must equal storage.objects.name exactly';

