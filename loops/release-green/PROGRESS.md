# Loop Progress — release-green

> 창고가 아니라 조종석이다. 다음 실행에 필요한 것만 남긴다.

## Current State

- Status: **Active** (권한 사다리 1단계 — 검사 + 리포트만)
- Main objective: 9/21 접수 전까지 배포 가능 상태 유지
- Current focus: 손으로 3~5회 실행하며 안정성 확인 (스케줄 미등록)
- Last updated: 2026-08-31

## Last Run

- Date: **2026-08-31 10:47**
- Summary: **✅ GREEN** — test·lint·build 3종 PASS, 테스트 **123/123**, 유출 0건
- Output: `outputs/green-2026-08-31-1047.md`
- 📌 **기준선을 114 → 123 으로 올렸다.** 사주(오행) 축 분리 작업에서 `tests/element-score.test.ts` 9건이 늘었다.
  기준선을 안 올리면 그 9건이 통째로 사라져도 게이트가 통과한다.
- 📌 `tests/element-match-live.test.ts` 는 실호출이라 `npm test` 에서 skip 된다 — 기준선에 포함되지 않는다.
  실행: `export TOUR_API_KEY="$(grep -m1 '^TOUR_API_KEY=' .env.local | cut -d= -f2- | tr -d '')" && npx vitest run tests/element-match-live.test.ts --reporter=verbose`
  (🔴 `. ./.env.local` 로 통째로 읽으면 81번째 줄 여러 줄 값에서 `type:: command not found` 로 죽는다)

## Open Items

- 손 실행 누적 **9회**(outputs 기준: 08-13 2회 · 08-20 6회 · 08-31 1회). 「3~5회 안정성 확인」 조건은 충족됐다
- `/loop` 스케줄 등록 여부는 사람이 판단 — 남은 3주 동안 코드 변경이 잦다면 등록할 값이 있다

## Blockers

- 없음

## Needs Human Review

- 없음

## Next Run Should

1. `node loops/release-green/gate.mjs` 실행
2. 테스트 개수를 **114와 비교** (61이 아니다)
3. 이 파일의 `Last Run` 갱신
4. 🔴 제출 전(9/19 목표) 마지막으로 한 번 더 돌려 GREEN 을 확인한다

## Decisions Made

- 2026-08-12 — 실패해도 **고치지 않는다**로 확정. 진단과 수정을 섞으면 Loop가 소스를 건드리게 되고 권한 1단계가 깨진다.
- 2026-08-13 — **당일 중복 실행 금지 규칙을 해제**했다. 배포 가능 상태는 하루 안에서도 바뀌는데(오전 RED → 수정 → 오후 재확인), 규칙이 그 재확인을 거부했다. 대신 리포트 파일명에 시각을 넣어(`green-YYYY-MM-DD-HHMM.md`) 오전의 실패 증거가 덮어써지지 않게 했다.
- 2026-08-13 — `outputs/` 를 **git 추적에서 제외**했다(`.gitignore`). 실행마다 트리가 더러워지는데 Loop 는 커밋 권한이 없어 정리도 못 했다. 리포트는 로컬 진단물이지 제출 증거가 아니다.

## Do Not Repeat

- 2026-08-13: 테스트 개수를 **출력 마지막 6줄에서만** 찾지 말 것. vitest 가 요약 뒤에 무언가를 더 찍으면(커버리지 표·종료 훅 로그) 개수를 놓치고 조용히 WARN 으로 떨어진다 — 지금은 출력 전체에서 찾고 **마지막 매칭**을 쓴다.
- 2026-08-13: 유출 대조를 `.env.local` **하나만** 보지 말 것. `.env` 에만 있는 값은 대조 집합에서 빠져, 리포트로 새어나가도 LEAK 이 뜨지 않는다 — "검사했다"는 착각만 남는다.
- 2026-08-13: `spawnSync` 에 **인자 배열 + `shell:true`** 를 함께 쓰지 말 것(Node DEP0190 — 인자가 이스케이프되지 않는다). 커맨드를 문자열 하나로 두거나, 셸 없이 실행 파일을 직접 부른다.
