
DROP POLICY IF EXISTS "Public read knife_videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload knife_videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update knife_videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete knife_videos" ON storage.objects;

CREATE POLICY "Public read knife-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'knife-videos');

CREATE POLICY "Authenticated upload knife-videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'knife-videos');

CREATE POLICY "Authenticated update knife-videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'knife-videos');

CREATE POLICY "Authenticated delete knife-videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'knife-videos');
