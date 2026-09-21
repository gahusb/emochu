#!/usr/bin/env node
// 로컬 메모리 PostgreSQL 회귀 검사. .env/운영 DB/외부 AI를 읽거나 호출하지 않는다.
// 준비: npm install --prefix .scratch-sql --no-save --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.8
// 실행: node --test scripts/verify-course-access.mjs
// 앱 package.json/lockfile에는 테스트 전용 런타임을 추가하지 않는다.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const requireFixture = createRequire(new URL('../.scratch-sql/package.json', import.meta.url));
const { PGlite } = requireFixture('@electric-sql/pglite');
const readRepo = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await readRepo('supabase/migrations/017_lock_down_course_access.sql');
const reviewSql = await readRepo('scripts/check-course-access.sql');
const relations = ['wk_courses', 'wk_courses_public', 'wk_usage'];

async function fixture() {
  const db = new PGlite(); // 항상 새 메모리 DB. 연결 URL을 받지 않는다.
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE TABLE public.wk_courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), share_slug text UNIQUE NOT NULL,
      user_id uuid, departure_lat double precision, departure_lng double precision,
      duration text, companion text, preferences jsonb, course_data jsonb,
      ai_model text, view_count integer DEFAULT 0, created_at timestamptz DEFAULT now()
    );
  `);
  // 기본 테이블은 합성 fixture. 이후에는 저장소 마이그레이션 원문을 실행한다.
  for (const file of [
    '011_add_course_b_data.sql', '012_enable_rls_wk_courses.sql',
    '013_usage_limits_and_course_lifecycle.sql', '014_course_edit_token.sql',
    '015_course_ownership.sql', '016_course_community_opt_in.sql',
  ]) await db.exec(await readRepo(`supabase/migrations/${file}`));
  await db.exec(`
    GRANT ALL ON public.wk_courses, public.wk_courses_public, public.wk_usage
      TO anon, authenticated, service_role;
    -- 열 단위/PUBLIC 권한도 잔존하지 않는지 검증한다.
    GRANT SELECT(edit_token) ON public.wk_courses TO PUBLIC;
    GRANT UPDATE(view_count) ON public.wk_courses_public TO anon, authenticated;
    GRANT INSERT(client_key), REFERENCES(day) ON public.wk_usage TO authenticated;
    INSERT INTO public.wk_courses (share_slug, edit_token, course_data)
      VALUES ('fixture-share', 'fixture-not-a-real-token', '{"title":"fixture","stops":[]}');
    INSERT INTO public.wk_usage VALUES ('2026-09-11', 'fixture-existing', 7);
  `);
  return db;
}

async function asRole(db, role, sql) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  try {
    const result = await db.query(sql);
    await db.exec('COMMIT;');
    return result;
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }
}

async function review(db) {
  const result = (await db.query(reviewSql)).rows[0].course_access_review;
  delete result.checked_at; // 롤백 전후의 조회 시각 차이만 비교에서 제외한다.
  return result;
}

function assertLocked(metadata) {
  for (const row of metadata.access) {
    if (row.role === 'service_role') {
      for (const key of ['table_select', 'table_insert', 'table_update', 'table_delete']) assert.equal(row[key], true);
      continue;
    }
    for (const key of [
      'table_select', 'table_insert', 'table_update', 'table_delete',
      'any_column_select', 'any_column_insert', 'any_column_update', 'any_column_references',
    ]) assert.equal(row[key], false, `${row.role} ${row.object} ${key}`);
    assert.equal(row.edit_token_select, row.object === 'public.wk_courses' ? false : null);
  }
  assert.deepEqual(metadata.policies, []);
  for (const row of metadata.usage_function.access) assert.equal(row.execute, row.role === 'service_role');
  for (const obj of metadata.objects) assert.equal(obj.rls_enabled, obj.kind !== 'v');
}

test('017: reported grants/RLS fixture → client denial, server access preserved', async (t) => {
  const db = await fixture();
  t.after(() => db.close());
  t.diagnostic((await db.query('SELECT version() AS version')).rows[0].version);
  const original = (await db.query('SELECT * FROM public.wk_courses')).rows;

  await t.test('baseline: anon/authenticated read a synthetic edit token', async () => {
    for (const role of ['anon', 'authenticated']) {
      const result = await asRole(db, role, 'SELECT edit_token FROM public.wk_courses');
      assert.equal(result.rows[0].edit_token, 'fixture-not-a-real-token');
    }
    const metadata = await review(db);
    assert.equal(metadata.access.length, 9);
    assert.ok(metadata.access.every((row) => row.table_select && row.table_insert && row.table_update && row.table_delete));
  });

  await t.test('baseline: RLS blocks usage rows/base writes, owner-rights view can update', async () => {
    assert.deepEqual((await asRole(db, 'anon', 'SELECT * FROM public.wk_usage')).rows, []);
    assert.equal((await asRole(db, 'anon', 'UPDATE public.wk_courses SET view_count = 9 RETURNING id')).rows.length, 0);
    assert.equal((await asRole(db, 'anon', 'UPDATE public.wk_courses_public SET view_count = 9 RETURNING id')).rows.length, 1);
    await db.exec('UPDATE public.wk_courses SET view_count = 0;');
  });

  await t.test('migration: no course rows, tokens, slugs or existing counters change', async () => {
    await db.exec(migration);
    assert.deepEqual((await db.query('SELECT * FROM public.wk_courses')).rows, original);
    assert.equal((await db.query('SELECT count FROM public.wk_usage')).rows[0].count, 7);
    assertLocked(await review(db));
  });

  await t.test('both client roles: SELECT/INSERT/UPDATE/DELETE on all three objects denied', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const table of relations) {
        const statements = [
          `SELECT * FROM public.${table}`,
          `INSERT INTO public.${table} DEFAULT VALUES`,
          table === 'wk_usage' ? `UPDATE public.${table} SET count = 99` : `UPDATE public.${table} SET view_count = 99`,
          `DELETE FROM public.${table}`,
        ];
        for (const sql of statements) await assert.rejects(asRole(db, role, sql), { code: '42501' });
      }
      await assert.rejects(asRole(db, role, 'SELECT edit_token FROM public.wk_courses'), { code: '42501' });
      await assert.rejects(asRole(db, role, "SELECT public.wk_bump_usage('2026-09-11', 'fixture-denied')"), { code: '42501' });
    }
  });

  await t.test('service_role: share read, create/edit/keep/opt-in and delete remain available', async () => {
    const shared = await asRole(db, 'service_role', `
      SELECT id, share_slug, course_data, course_b_data, view_count, is_public
      FROM public.wk_courses WHERE share_slug = 'fixture-share'
    `);
    assert.equal(shared.rows.length, 1);
    assert.equal(shared.rows[0].share_slug, 'fixture-share');
    await asRole(db, 'service_role', "INSERT INTO public.wk_courses (share_slug, edit_token) VALUES ('fixture-new', 'fixture-new-token')");
    assert.equal((await asRole(db, 'service_role', "UPDATE public.wk_courses SET is_kept = true, is_public = true, expires_at = null WHERE share_slug = 'fixture-new' RETURNING id")).rows.length, 1);
    assert.equal((await asRole(db, 'service_role', "DELETE FROM public.wk_courses WHERE share_slug = 'fixture-new' RETURNING id")).rows.length, 1);
    assert.deepEqual((await db.query('SELECT * FROM public.wk_courses')).rows, original);
  });

  await t.test('service_role: usage RPC increments and persists', async () => {
    for (const expected of [1, 2]) {
      const result = await asRole(db, 'service_role', "SELECT public.wk_bump_usage('2026-09-11', 'fixture-rpc') AS count");
      assert.equal(result.rows[0].count, expected);
    }
  });

  await t.test('reapplying 017 is idempotent', async () => {
    const before = await review(db);
    await db.exec(migration);
    assert.deepEqual(await review(db), before);
    assertLocked(await review(db));
  });
});

for (const [name, setup, expectedError] of [
  ['inherited table grant', 'CREATE ROLE fixture_reader; GRANT SELECT ON public.wk_courses TO fixture_reader; GRANT fixture_reader TO anon;', /017 blocked/],
  ['inherited column grant', 'CREATE ROLE fixture_reader; GRANT SELECT(edit_token) ON public.wk_courses TO fixture_reader; GRANT fixture_reader TO authenticated;', /017 blocked/],
  ['inherited function grant', 'CREATE ROLE fixture_rpc; GRANT EXECUTE ON FUNCTION public.wk_bump_usage(date,text) TO fixture_rpc; GRANT fixture_rpc TO anon;', /017 blocked/],
  ['missing server bypass', 'ALTER ROLE service_role NOBYPASSRLS;', /017 prerequisite/],
  ['missing usage function', 'DROP FUNCTION public.wk_bump_usage(date,text);', /017 prerequisite/],
]) {
  test(`017: ${name} fails and rolls back without partial permission changes`, async (t) => {
    const db = await fixture();
    t.after(() => db.close());
    await db.exec(setup);
    const before = await review(db);
    await assert.rejects(db.exec(migration), expectedError);
    await db.exec('ROLLBACK;');
    assert.deepEqual(await review(db), before);
  });
}

test('metadata query: absent objects/roles produce null, not a false denial', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const metadata = await review(db);
  assert.ok(metadata.objects.every((obj) => obj.exists === false));
  assert.ok(metadata.access.every((row) => row.role_exists === false && row.table_select === null && row.edit_token_select === null));
  assert.equal(metadata.usage_function.exists, false);
  assert.ok(metadata.usage_function.access.every((row) => row.execute === null));
});
