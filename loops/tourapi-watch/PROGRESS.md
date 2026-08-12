# Loop Progress — tourapi-watch

> 이 파일은 **창고가 아니라 조종석**이다. 다음 실행이 행동을 정하는 데 필요한 것만 남긴다.
> 과거 리포트 전문은 `outputs/`에 있다.

## Current State

- Status: **Active** (권한 사다리 **1단계** — 읽기 + 리포트만)
- Main objective: TourAPI 11개 실호출 감시 + 폐기 예정 오퍼레이션 조기 경보
- Current focus: 손으로 3~5회 실행하며 안정성 확인 (스케줄 미등록)
- Last updated: 2026-08-10

## Last Run

- Date: **2026-08-10**
- Summary: **PASS 11 / WARN 0 / FAIL 0**
- 폐기 예정 오퍼레이션: ✅ `areaCode2`·`categoryCode2` 모두 정상
- Output: `outputs/api-health-2026-08-10.md`

## Open Items

- 손 실행 **1/5회** 완료. 나머지 4회를 다른 날에 돌려 안정성 확인
- 검증자 서브에이전트(`.claude/agents/verifier.md`) 분리 — 도입 4단계
- `/loop 24h` 스케줄 등록 — 도입 5단계 (**손 실행 3~5회 안정 확인 전에는 금지**)

## Blockers

- 없음

## Needs Human Review

- 없음

## Next Run Should

1. `node loops/tourapi-watch/smoke.mjs` 실행
2. `areaCode2`·`categoryCode2` 생존 여부를 **가장 먼저** 확인
3. 전날 리포트와 비교해 **totalCount가 급변한 오퍼레이션**이 있으면 기록
4. 이 파일의 `Last Run`·`Open Items`를 갱신하고, **손 실행 횟수(N/5)를 올린다**

## 🔖 다음 세션 재개 지점 (2026-08-10 기준)

> 이 레포에서 새 세션을 열면 **여기부터** 보면 된다.

**지금까지**: 도입 5단계 중 **1~4단계 완료**. 5단계(스케줄)만 남았다.

**남은 작업 딱 두 가지**

1. **손 실행 4회 더** (현재 **1/5**). 하루 1회씩, 다른 날에 돌린다.
   - 매번 `node loops/tourapi-watch/smoke.mjs` → 리포트 확인 → 이 파일 갱신
   - 확인할 것: **매 실행이 이전 상태를 이어받는가** (첫 실행처럼 굴지 않는가)
2. **3~5회가 안정적이면** `/loop 24h` 스케줄 등록. 프롬프트는 이렇게:

   ```
   /loop 24h Run the tourapi-watch loop.
   Follow `loops/tourapi-watch/LOOP_INSTRUCTIONS.md` exactly.
   Read `TASK.md` and `PROGRESS.md` first.
   Run `node loops/tourapi-watch/smoke.mjs`, then update `PROGRESS.md`.
   Do not modify any files except `loops/tourapi-watch/outputs/` and `PROGRESS.md`.
   If areaCode2 or categoryCode2 is not PASS, stop and report to the human.
   ```

   > ⚠️ **3~5회 안정 확인 전에는 걸지 않는다.** 손으로도 안정적이지 않은 것을 스케줄에 걸면 자는 동안 실패가 반복된다.

**아직 커밋 안 됨** — `.claude/`·`loops/`가 untracked다. 커밋 여부는 박재오 판단.

**검증 완료 사항** (다시 안 해도 됨)
- Gate red-green ✅ — 없는 오퍼레이션 400 / 잘못된 키 403 / 스크립트 주입 시 **exit 1**, 정상 시 **exit 0**
- 키 유출 스캔 ✅ 0건 (마스킹 + 최종 안전망 `exit 3`)
- 허용 경로 밖 변경 ✅ 0건 / 기존 테스트 ✅ 61/61 그린

**이 Loop 밖의 이모추 미결** (별도 트랙, 여기서 건드리지 말 것)
- 육안 확인 2건 → 푸시(로컬 `main`이 origin보다 **16커밋 앞섬**) → 1차 심사자료 접수
- `areaCode2`·`categoryCode2` **정적 코드표 마이그레이션** (이 Loop는 감시만 한다)
- 위치기반서비스 — **익명·가명 처리 시 신고 대상 제외**(lbsc.kr 사전검토 권장)

## Decisions Made

- **2026-08-10** — 첫 Loop 대상을 `tourapi-watch`로 확정. 이유 = 심사가 호출건수를 검증하므로 **Loop가 도는 것 자체가 이력이 되고**, 동시에 폐기 예정 API 경보를 겸한다.
- **2026-08-10** — 호출은 **스크립트(`smoke.mjs`) 단일 경유점**으로 고정. 에이전트는 판정·기록만 한다(결정적 작업은 모델이 아니라 스크립트).
- **2026-08-10** — `.claude/settings.json`에서 **`.env.local` 읽기를 deny**. 스크립트만 키를 읽고, 출력은 마스킹한다.

## Do Not Repeat

- **2026-08-10**: `WARN`(HTTP 200 + `resultCode 0000` + 항목 0)을 "정상"으로 넘기지 말 것. red 테스트에서 **없는 `contentId`가 정확히 이 모습**이었고, 폐기된 오퍼레이션도 404가 아니라 이 형태로 먼저 나타날 수 있다.
- **2026-08-10**: 리포트를 만들 때 **API 응답 원문을 그대로 붙이지 말 것**. 인증키가 URL에 담겨 에러 메시지로 새어 나올 수 있다 → 반드시 마스킹.

## Stop conditions met since last review

- 2026-08-10: 검증 체크리스트 6/6 통과 → 실행 정상 종료
