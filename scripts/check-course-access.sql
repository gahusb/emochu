-- 운영 DB 소유자가 SQL Editor에서 실행하는 읽기 전용 점검문.
-- 카탈로그/권한 메타데이터만 조회한다. 코스·사용자 행이나 edit_token 값은 읽지 않는다.
-- grant/정책을 자동 수정하지 않으며, RPC나 사용량 증가 함수도 실행하지 않는다.
-- 출력의 null은 대상 없음/확인 불가다. false(차단 확인)와 구분한다.
WITH target_roles AS (
  SELECT name, (SELECT oid FROM pg_roles WHERE rolname = name) AS oid
  FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(name)
), target_relations AS (
  SELECT name, to_regclass(name) AS oid
  FROM (VALUES ('public.wk_courses'), ('public.wk_courses_public'), ('public.wk_usage')) AS t(name)
), target_function AS (
  SELECT to_regprocedure('public.wk_bump_usage(date,text)') AS oid
)
SELECT jsonb_build_object(
  'checked_at', now(),
  'scope', 'metadata only; grants do not by themselves prove which rows RLS permits',
  'roles', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', r.name, 'exists', r.oid IS NOT NULL,
      'bypass_rls', p.rolbypassrls, 'superuser', p.rolsuper
    ) ORDER BY r.name)
    FROM target_roles r LEFT JOIN pg_roles p ON p.oid = r.oid
  ),
  'objects', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', t.name,
      'exists', t.oid IS NOT NULL,
      'kind', c.relkind,
      'owner', pg_get_userbyid(c.relowner),
      'options', c.reloptions,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'columns', (SELECT jsonb_agg(a.attname ORDER BY a.attnum)
                  FROM pg_attribute a WHERE a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped)
    ) ORDER BY t.name)
    FROM target_relations t LEFT JOIN pg_class c ON c.oid = t.oid
  ),
  'access', (
    SELECT jsonb_agg(jsonb_build_object(
      'role', r.name, 'role_exists', r.oid IS NOT NULL, 'object', t.name,
      'table_select', has_table_privilege(r.oid, t.oid, 'SELECT'),
      'table_insert', has_table_privilege(r.oid, t.oid, 'INSERT'),
      'table_update', has_table_privilege(r.oid, t.oid, 'UPDATE'),
      'table_delete', has_table_privilege(r.oid, t.oid, 'DELETE'),
      'any_column_select', has_any_column_privilege(r.oid, t.oid, 'SELECT'),
      'any_column_insert', has_any_column_privilege(r.oid, t.oid, 'INSERT'),
      'any_column_update', has_any_column_privilege(r.oid, t.oid, 'UPDATE'),
      'any_column_references', has_any_column_privilege(r.oid, t.oid, 'REFERENCES'),
      'edit_token_select', (
        SELECT has_column_privilege(r.oid, t.oid, a.attnum, 'SELECT')
        FROM pg_attribute a
        WHERE a.attrelid = t.oid AND a.attname = 'edit_token' AND a.attnum > 0 AND NOT a.attisdropped
      )
    ) ORDER BY r.name, t.name)
    FROM target_roles r CROSS JOIN target_relations t
  ),
  'usage_function', (
    SELECT jsonb_build_object(
      'name', 'public.wk_bump_usage(date,text)', 'exists', f.oid IS NOT NULL,
      'owner', pg_get_userbyid(p.proowner), 'security_definer', p.prosecdef,
      'access', (SELECT jsonb_agg(jsonb_build_object(
        'role', r.name, 'role_exists', r.oid IS NOT NULL,
        'execute', has_function_privilege(r.oid, f.oid, 'EXECUTE')
      ) ORDER BY r.name) FROM target_roles r)
    )
    FROM target_function f LEFT JOIN pg_proc p ON p.oid = f.oid
  ),
  'policies', (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'table', tablename, 'policy', policyname, 'roles', roles,
      'command', cmd, 'permissive', permissive, 'using', qual, 'with_check', with_check
    ) ORDER BY tablename, policyname), '[]'::jsonb)
    FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('wk_courses', 'wk_usage')
  )
) AS course_access_review;
