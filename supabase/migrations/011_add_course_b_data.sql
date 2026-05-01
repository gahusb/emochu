-- A/B 코스 비교 기능을 위한 course_b_data 컬럼 추가
-- 실행: Supabase SQL Editor에서 이 파일 내용을 붙여넣고 실행

ALTER TABLE public.wk_courses
  ADD COLUMN IF NOT EXISTS course_b_data jsonb;

-- 기존 데이터는 NULL로 유지 (course_b_data 없는 코스는 이색 발견 탭 미표시)
