-- 016 — 커뮤니티 코스 (다른 사람이 만든 코스 추천)
-- 실행: Supabase SQL Editor 에 이 파일 내용을 붙여넣고 실행. 🔴 013 → 014 → 015 → 016 순서로 실행한다.
--
-- 왜 필요한가 (2026-09-04):
--   AI 로 새로 만들어주는 대신, 이미 있는 코스 중 소유자가 공개에 동의한 것을
--   "이런 코스는 어때요?" 하고 보여준다. 재검증(TourAPI·날씨 재호출)은 하지 않는다 —
--   대신 lib/course-community.ts 의 신선도 필터(생성된 지 N일 이내)로만 후보를 거른다.
--   축제 종료·영업시간 재확인은 2차 과제다.
--
--   🔴 기본은 비공개다(opt-in). 코스를 만든 사람(edit_token 보유자)이 코스 결과 화면
--      (SaveShareBar)에서 직접 켜야만 추천 후보가 된다. 그 전까지는 이 컬럼이 있어도
--      어떤 코스도 추천 풀에 들어가지 않는다.
--
--   🔑 켜는 동작은 013의 keepCourse() 와 함께 간다(app/api/course/[slug]/public/route.ts
--      에서 호출) — 추천 중인 코스가 TTL 만료로 갑자기 사라지면 안 되기 때문이다.
--      이 마이그레이션은 그 로직을 담지 않는다. 여기서는 스키마만 다룬다.

ALTER TABLE public.wk_courses
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 인기순(view_count desc) 목록 조회용. is_public 인 행만 대상이라 부분 인덱스로 충분히 작다.
CREATE INDEX IF NOT EXISTS wk_courses_community_popular_idx
  ON public.wk_courses (view_count DESC, created_at DESC)
  WHERE is_public = true;

-- 최신순(created_at desc) 목록 조회용.
CREATE INDEX IF NOT EXISTS wk_courses_community_newest_idx
  ON public.wk_courses (created_at DESC)
  WHERE is_public = true;

COMMENT ON COLUMN public.wk_courses.is_public IS
  '소유자(edit_token 보유자)가 코스 결과 화면에서 직접 켠 경우에만 true.
   커뮤니티 추천 후보 자격 조건 중 하나 — 기본은 비공개(opt-in).
   나머지 한 조건(신선도)은 조회 시점에 lib/course-community.ts 의
   COMMUNITY_FRESH_DAYS 가 created_at 기준으로 건다(재검증 없음, 2026-09-04 결정).';

-- 🔴 012 의 공개 SELECT 정책(public_read_courses)은 그대로 둔다. 이 컬럼도 테이블
--    레벨로는 이론상 열려 있다 — 015 와 같은 이유로, 실제 커뮤니티 목록 조회는
--    서비스롤 클라이언트가 컬럼을 화이트리스트로 골라 읽는다
--    (app/api/course/community/route.ts). 014 의 wk_courses_public 뷰는 이 기능에서
--    쓰지 않는다 — 조회 API 가 이미 admin 클라이언트로 직접 컬럼을 고르기 때문이다.
