DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars own read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);