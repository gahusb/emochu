-- 014 — 코스 편집 권한 (편집 토큰)
-- 실행: Supabase SQL Editor. 🔴 013 을 먼저 실행한 뒤 이걸 실행한다.
--
-- 왜 필요한가:
--   코스 편집(장소 교체·순서 변경)을 붙이는데, 이 서비스에는 아직 로그인이 없다.
--   share_slug 는 **공유하라고 만든 값**이라 그것만으로 편집을 허용하면
--   링크를 받은 누구나 남의 코스를 고칠 수 있다.
--
--   그래서 코스를 만든 사람에게만 편집 토큰을 주고, 그 사람 브라우저에만 남긴다.
--   나중에 로그인이 들어오면 user_id 가 이 자리를 대신하고 토큰은 하위호환으로 남는다.

ALTER TABLE public.wk_courses
  ADD COLUMN IF NOT EXISTS edit_token text;

-- 🔴 익명 SELECT 정책(012)이 열려 있다. edit_token 이 그 정책으로 새어나가면
--    토큰의 의미가 없어진다. 조회 API(app/api/course/[slug]/route.ts)는
--    서비스롤로 필요한 컬럼만 골라 읽고 edit_token 을 절대 응답에 싣지 않는다.
--    아래 뷰는 "익명이 읽어도 되는 것"을 명시적으로 못 박아 둔 것이다.
CREATE OR REPLACE VIEW public.wk_courses_public AS
  SELECT id, share_slug, course_data, course_b_data, view_count, created_at
  FROM public.wk_courses;

COMMENT ON COLUMN public.wk_courses.edit_token IS
  '생성자만 아는 편집 토큰. 응답에 절대 포함하지 않는다(생성 직후 1회 제외).';
