-- 017 — 코스·편집 토큰·사용량은 서버를 통해서만 접근한다.
-- 운영 적용 전 docs/2026-09-11-DB-권한-보완-적용안.md의 선행 조건/승인을 확인한다.
-- SQL Editor에서 전체를 한 번에 실행. 대상 객체 소유자 권한이 필요하다.
-- 행·공유 slug·기존 edit_token은 변경하지 않는다. 기존 토큰 폐기는 별도 결정이다.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND (rolbypassrls OR rolsuper)) THEN
    RAISE EXCEPTION '017 prerequisite: expected client roles and RLS-bypassing service_role are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.wk_courses') AND relkind = 'r')
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.wk_usage') AND relkind = 'r')
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.wk_courses_public') AND relkind = 'v')
     OR to_regprocedure('public.wk_bump_usage(date,text)') IS NULL THEN
    RAISE EXCEPTION '017 prerequisite: expected tables, view and usage function are required; review schema first';
  END IF;
END $$;

ALTER TABLE public.wk_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wk_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_read_courses ON public.wk_courses;

-- PostgreSQL의 테이블 REVOKE는 해당 역할의 열 단위 권한도 함께 회수한다.
-- PUBLIC에서 상속된 권한까지 회수한다. 다른 객체/스키마 기본 권한은 변경하지 않는다.
-- CASCADE를 쓰지 않는다. 의존 grant가 있으면 중단하고 소유자가 검토한다.
REVOKE ALL PRIVILEGES ON TABLE
  public.wk_courses, public.wk_courses_public, public.wk_usage
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.wk_bump_usage(date, text)
  FROM PUBLIC, anon, authenticated;

-- 익명/로그인 사용자의 공유·내 코스·편집도 Next 서버 service_role 경로를 쓴다.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.wk_courses, public.wk_courses_public, public.wk_usage TO service_role;
GRANT EXECUTE ON FUNCTION public.wk_bump_usage(date, text) TO service_role;

-- 다른 역할에서 상속받은 접근이 남으면 성공으로 처리하지 않고 전체 롤백한다.
DO $$
DECLARE
  client_role text;
  relation_name text;
  privilege_name text;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH relation_name IN ARRAY ARRAY['public.wk_courses', 'public.wk_courses_public', 'public.wk_usage'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
        IF has_table_privilege(client_role, relation_name, privilege_name) THEN
          RAISE EXCEPTION '017 blocked: % retains % on %; inspect inherited/dependent grants', client_role, privilege_name, relation_name;
        END IF;
      END LOOP;
      FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] LOOP
        IF has_any_column_privilege(client_role, relation_name, privilege_name) THEN
          RAISE EXCEPTION '017 blocked: % retains column % on %; inspect inherited/dependent grants', client_role, privilege_name, relation_name;
        END IF;
      END LOOP;
    END LOOP;
    IF has_function_privilege(client_role, 'public.wk_bump_usage(date,text)', 'EXECUTE') THEN
      RAISE EXCEPTION '017 blocked: % retains usage function execution', client_role;
    END IF;
  END LOOP;
  FOREACH relation_name IN ARRAY ARRAY['public.wk_courses', 'public.wk_courses_public', 'public.wk_usage'] LOOP
    FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      IF NOT has_table_privilege('service_role', relation_name, privilege_name) THEN
        RAISE EXCEPTION '017 blocked: service_role lacks % on %', privilege_name, relation_name;
      END IF;
    END LOOP;
  END LOOP;
  IF NOT has_function_privilege('service_role', 'public.wk_bump_usage(date,text)', 'EXECUTE') THEN
    RAISE EXCEPTION '017 blocked: service_role lacks usage function execution';
  END IF;
END $$;
COMMIT;
