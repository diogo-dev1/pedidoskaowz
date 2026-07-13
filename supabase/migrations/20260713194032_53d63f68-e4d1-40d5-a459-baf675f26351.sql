
CREATE TABLE public.knives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.knives TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knives TO authenticated;
GRANT ALL ON public.knives TO service_role;

ALTER TABLE public.knives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knives"
  ON public.knives FOR SELECT
  USING (true);

CREATE POLICY "Admins manage knives insert"
  ON public.knives FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage knives update"
  ON public.knives FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage knives delete"
  ON public.knives FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Storage policies for knife_videos bucket (bucket created via tool)
CREATE POLICY "Public read knife_videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'knife_videos');

CREATE POLICY "Authenticated upload knife_videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'knife_videos');

CREATE POLICY "Authenticated update knife_videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'knife_videos');

CREATE POLICY "Authenticated delete knife_videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'knife_videos');
