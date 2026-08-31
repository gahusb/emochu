-- 013 — AI 호출 상한 · 코스 수명 · B코스 온디맨드
-- 실행: Supabase SQL Editor 에 이 파일 내용을 붙여넣고 실행
--
-- 왜 필요한가 (2026-08-31 실측 근거):
--   1) 코스 생성 API 에 레이트 리밋이 전혀 없었다 → 누구나 무한 호출 = 상한 없는 청구서
--   2) 생성된 코스가 전부 영구 저장되고 삭제 수단이 없었다 → 버려진 코스가 계속 쌓인다
--   3) A/B 코스를 항상 같이 만들어 비용이 정확히 2배였다 → B 를 나중에 만들려면
--      그때 원본 요청 조건이 있어야 한다(공유 링크로 들어온 사람도 눌러야 하므로 DB 에 둔다)

-- ─────────────────────────────────────────────────────────────
-- 1. 사용량 카운터
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wk_usage (
  day         date  NOT NULL,
  -- 개인 식별자를 그대로 두지 않는다. IP + 서버 솔트의 해시 앞부분만 저장한다.
  -- '__global__' 은 전체 예산 차단기용 예약 키다.
  client_key  text  NOT NULL,
  count       int   NOT NULL DEFAULT 0,
  PRIMARY KEY (day, client_key)
);

-- 오래된 카운터는 쓸모가 없다. 조회 성능보다 정리를 위해 둔다.
CREATE INDEX IF NOT EXISTS wk_usage_day_idx ON public.wk_usage (day);

-- 🔴 원자적 증가가 필요하다. select → +1 → update 로 나누면 동시 요청에서
--    카운트가 새고, 그러면 상한이 상한이 아니게 된다.
CREATE OR REPLACE FUNCTION public.wk_bump_usage(p_day date, p_key text)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE v int;
BEGIN
  INSERT INTO public.wk_usage (day, client_key, count)
  VALUES (p_day, p_key, 1)
  ON CONFLICT (day, client_key)
  DO UPDATE SET count = public.wk_usage.count + 1
  RETURNING count INTO v;
  RETURN v;
END $$;

-- 카운터는 서비스롤(서버)만 만진다. 익명 읽기를 열지 않는다.
ALTER TABLE public.wk_usage ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 2. 코스 수명 + 온디맨드 B코스용 요청 조건
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.wk_courses
  -- NULL = 영구 보존. 공유·저장을 누르면 NULL 로 바꾼다.
  ADD COLUMN IF NOT EXISTS expires_at   timestamptz,
  -- 공유·저장을 실제로 눌렀는지. 통계와 만료 판단의 근거다.
  ADD COLUMN IF NOT EXISTS is_kept      boolean NOT NULL DEFAULT false,
  -- B코스를 나중에 만들기 위한 원본 요청 조건.
  -- 🔴 위치(lat/lng)는 여기 넣지 않는다 — 이미 departure_lat/lng 컬럼에 있고,
  --    같은 값을 두 곳에 두면 나중에 지울 때 한쪽이 남는다.
  ADD COLUMN IF NOT EXISTS request_params jsonb;

-- 기존 행은 전부 「보관됨」으로 둔다. 소급 삭제하지 않는다 —
-- 이미 공유된 링크가 어느 날 갑자기 깨지는 것이 가장 나쁜 결과다.
UPDATE public.wk_courses SET is_kept = true WHERE expires_at IS NULL AND is_kept = false;

CREATE INDEX IF NOT EXISTS wk_courses_expires_at_idx
  ON public.wk_courses (expires_at)
  WHERE expires_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. (선택) 만료 코스 정리
-- ─────────────────────────────────────────────────────────────
-- 앱은 코스를 새로 저장할 때마다 만료분을 조금씩 지운다(lib 쪽 sweepExpiredCourses).
-- 그것만으로 충분하지만, 트래픽이 없는 기간에도 정리하고 싶으면 pg_cron 을 쓴다:
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   SELECT cron.schedule('wk_courses_sweep', '0 4 * * *', $$
--     DELETE FROM public.wk_courses WHERE expires_at IS NOT NULL AND expires_at < now();
--   $$);
