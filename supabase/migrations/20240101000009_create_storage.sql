-- Migration: Create Storage bucket and policies
-- Description: Supabase Storage bucket for family tree media files

-- Create storage bucket for family tree media
-- Note: This requires the storage extension to be enabled
-- The bucket will be created via Supabase Dashboard or API, but we document it here

-- Storage bucket name: family-tree-media
-- Bucket settings:
--   - Public: false (private bucket)
--   - File size limit: 10MB (configurable)
--   - Allowed MIME types: image/*, application/pdf

-- Policy: Users can read files if they are members of the tree
-- This is handled via RLS policies on the person_media table
-- The storage path should follow: {tree_id}/{person_id}/{media_id}.{ext}

-- Note: Storage policies are created via Supabase Dashboard or API
-- Here's the SQL equivalent (if using Supabase Storage API):

-- Example policy SQL (to be run in Supabase Dashboard > Storage > Policies):
/*
-- Policy: Read media if tree member
CREATE POLICY "Storage: Read if tree member"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'family-tree-media'
  AND (
    -- Extract tree_id from path and check membership
    EXISTS (
      SELECT 1 FROM family_tree.person_media pm
      JOIN family_tree.persons p ON p.id = pm.person_id
      WHERE pm.storage_path = (storage.foldername(name))[1] || '/' || name
        AND family_tree.is_tree_member(p.tree_id, auth.uid())
    )
  )
);

-- Policy: Upload media if owner or editor
CREATE POLICY "Storage: Upload if owner or editor"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'family-tree-media'
  AND (
    -- Extract tree_id from path and check role
    EXISTS (
      SELECT 1 FROM family_tree.persons p
      WHERE p.tree_id::text = (storage.foldername(name))[1]
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  )
);

-- Policy: Delete media if owner or editor
CREATE POLICY "Storage: Delete if owner or editor"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'family-tree-media'
  AND (
    EXISTS (
      SELECT 1 FROM family_tree.person_media pm
      JOIN family_tree.persons p ON p.id = pm.person_id
      WHERE pm.storage_path = (storage.foldername(name))[1] || '/' || name
        AND family_tree.get_tree_role(p.tree_id, auth.uid()) IN ('owner', 'editor')
    )
  )
);
*/

-- Comments
COMMENT ON SCHEMA family_tree IS 'Storage bucket policies should be configured in Supabase Dashboard';
COMMENT ON SCHEMA family_tree IS 'Bucket name: family-tree-media, Path format: {tree_id}/{person_id}/{media_id}.{ext}';

