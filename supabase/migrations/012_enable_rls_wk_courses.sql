-- Enable RLS on wk_courses
ALTER TABLE public.wk_courses ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read a course by its share_slug.
-- Writes go through the service-role client (bypasses RLS) so no INSERT/UPDATE policy needed.
CREATE POLICY "public_read_courses"
  ON public.wk_courses
  FOR SELECT
  USING (true);
