-- Fix Storage INSERT policy to use split_part instead of string_to_array
-- This fixes the "new row violates row-level security policy" error on upload
-- Execute this script in your PostgreSQL database

-- Drop and recreate INSERT policy with split_part
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

-- Also fix UPDATE policy for consistency
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

-- Notify PostgREST to reload schema cache (if using PostgREST)
NOTIFY pgrst, 'reload schema';

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%upload%'
ORDER BY policyname;

