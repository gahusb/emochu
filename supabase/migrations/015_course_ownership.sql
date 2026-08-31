-- 015 — 코스 소유권 (로그인)
-- 실행: Supabase SQL Editor. 🔴 013 → 014 → 015 순서로 실행한다.
--
-- user_id 컬럼은 이미 있다(생성 시 null 로 넣고 있었다). 여기서는 실제로 쓰기 위한
-- 인덱스와, 「내 코스」 목록이 기대는 정렬 근거를 갖춘다.

CREATE INDEX IF NOT EXISTS wk_courses_user_id_idx
  ON public.wk_courses (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- 🔴 012 의 공개 SELECT 정책은 그대로 둔다. 공유 링크는 로그인 없이 열려야 한다.
--    「내 코스 목록」은 익명 정책을 타지 않는다 — 서버가 서비스롤로 user_id 를 걸러 읽는다.
--    (app/api/my/courses/route.ts). 그래서 여기에 사용자별 RLS 정책을 추가하지 않는다.

COMMENT ON COLUMN public.wk_courses.user_id IS
  '로그인 사용자의 코스 소유권. null = 비로그인 생성(편집 토큰만이 증거).';
