# Loop Progress — tourapi-watch

> 이 파일은 **창고가 아니라 조종석**이다. 다음 실행이 행동을 정하는 데 필요한 것만 남긴다.
> 과거 리포트 전문은 `outputs/`에 있다.

## Current State

- Status: **Active** (권한 사다리 **1단계** — 읽기 + 리포트만)
- Main objective: TourAPI 11개 실호출 감시 + 폐기 예정 오퍼레이션 조기 경보
- Current focus: 손으로 3~5회 실행하며 안정성 확인 (스케줄 미등록)
- Last updated: 2026-09-01

## Last Run

- Date: **2026-09-01 11:12**
- Summary: **PASS 11 / WARN 0 / FAIL 0** — 폐기 예정 `areaCode2`·`categoryCode2` 모두 정상
- Output: `outputs/api-health-2026-09-01.md`
- 손 실행 **3/5**
- 📌 8/13 대비 `totalCount` 급변 없음. `searchFestival2` 118 → 160 은 계절 반영으로 보이고
  나머지는 소폭 증감(`locationBasedList2` 800→759, `areaBasedList2` 419→395)이다.
  상세 계열(detail*)·코드 계열은 값이 그대로다.
- 📌 8/13 이후 **19일 만의 실행**이다. 심사가 인증키로 「개발 기간 내 호출건수」를 검증하므로
  이 공백은 이력에서 손해다 — 아래 Open Items 참조.

## Open Items

- 🔴 **호출 이력이 19일 비었다**(8/13 → 9/01). 마감이 2026-09-21 이라 **남은 20일을 매일 채우는 게
  지금 할 수 있는 최선**이다. 하루 한 번이면 11회씩 쌓인다.
- 손 실행 **3/5**. CLAUDE.md 규약상 3~5회 안정 확인 후 `/loop` 스케줄 등록이 가능하다 —
  **이제 등록해도 되는 구간에 들어왔다**(다만 스케줄 등록은 사람이 결정한다).
- 📌 라이브 서비스 자체도 호출 이력을 만든다. 다만 트래픽이 적으면 빈약하므로 이 루프가 바닥을 깐다.

## Blockers

- 없음

## Needs Human Review

- 없음

## Next Run Should

1. `node loops/tourapi-watch/smoke.mjs` 실행
2. 🔴 `areaCode2`·`categoryCode2` 가 PASS 가 아니면 **재시도하지 말고 즉시 사람 호출**
3. `totalCount` 는 `awk -F'|'` 기준 **7번째 컬럼**이다(8번째는 응답 시간 — 한 칸 밀려 읽지 말 것)
4. 이 파일의 `Last Run` 갱신 + 손 실행 횟수 올리기

## 🔖 다음 세션 재개 지점 (2026-08-13 기준)

> 이 레포에서 새 세션을 열면 **여기부터** 보면 된다.
> (레포 전체의 하네스 상태는 `docs/2026-08-13-하네스-작업-인수인계.md` 에 있다.)

**지금까지**: 도입 5단계 중 **1~4단계 완료**. 5단계(스케줄)만 남았다.
검증자(`.claude/agents/verifier.md`)는 2026-08-13 에 **3개 Loop 공용으로 범용화**됐다 — 호출할 때 Loop 이름을 반드시 넘긴다(이름이 없으면 검증을 거부한다).

**남은 작업 딱 두 가지**

1. **손 실행 3회 더** (현재 **2/5**). 하루 1회씩, 다른 날에 돌린다.
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

**커밋됨** — `.claude/`·`loops/`는 `feat/harness-loop-minimum` 브랜치에 들어가 있다. **아직 main 에 병합하지 않았다.** 병합·푸시는 박재오 판단(푸시하면 Vercel 배포가 트리거된다).
`outputs/` 는 2026-08-13 부터 **git 추적 대상이 아니다**(`.gitignore`) — 리포트는 로컬 진단물이고, 심사가 보는 호출 이력의 근거는 TourAPI 서버 쪽이다.

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
  - **2026-08-13 보충**: 이 deny 가 지키는 것은 **에이전트의 컨텍스트**다. 파일이 잠긴 게 아니라서 allow 된 `smoke.mjs`·`gate.mjs` 는 실제로 읽는다 — TASK.md·SKILL.md 의 *"읽기 자체가 금지"* 라는 표현이 오해를 불러 정정했다.
- **2026-08-13** — 이 Loop 만 **당일 중복 실행 금지를 유지**한다. `release-green`·`submission-check` 는 하루에도 상태가 바뀌어 규칙을 풀었지만, 여기는 **하루 1회 표본**이 관측 단위다 — 같은 날 반복 호출은 전날 대비 `totalCount` 비교를 흐린다.

## Do Not Repeat

- **2026-08-10**: `WARN`(HTTP 200 + `resultCode 0000` + 항목 0)을 "정상"으로 넘기지 말 것. red 테스트에서 **없는 `contentId`가 정확히 이 모습**이었고, 폐기된 오퍼레이션도 404가 아니라 이 형태로 먼저 나타날 수 있다.
- **2026-08-10**: 리포트를 만들 때 **API 응답 원문을 그대로 붙이지 말 것**. 인증키가 URL에 담겨 에러 메시지로 새어 나올 수 있다 → 반드시 마스킹.
- **2026-08-13**: 🔴 **키 유출 스캔은 두 번 오탐했다. 정확한 형태는 `verifier.md` 의 C3 에만 둔다** — 여기에 패턴을 다시 적지 않는다(적는 순간 그 문장이 스캔에 걸린다).
  1. 대상을 `loops/` 전체로 잡으면 **스크립트 소스**(마스킹 정규식·키 처리 코드)가 걸린다 → 대상은 `outputs/` 와 `PROGRESS.md` 뿐이다.
  2. 패턴을 느슨하게 잡으면 **패턴을 설명하는 문서 문장 자체**가 걸린다(자기 참조) → 실제 키가 20자 이상 URL-safe 문자열이라는 점을 이용해 **길이로** 가른다.
  교훈: 비밀 스캔은 "무엇을 찾는가"만큼 **"무엇을 보지 않는가"**가 설계의 일부다.
- **2026-08-13**: 리포트 표에서 `totalCount` 를 뽑을 때 **컬럼 번호를 확인할 것.** 열 순서는 `오퍼레이션│판정│HTTP│resultCode│항목│totalCount│응답(ms)│비고` 라서 `awk -F'|'` 기준 **`$7` 이 totalCount** 이고 `$8` 은 응답 시간이다. 한 칸 밀려 읽으면 "급변 없음"을 응답 시간으로 판정하게 된다.
- **2026-08-13**: 마스킹 대상은 키 원문만이 아니다. TourAPI 인증키는 **인코딩본·디코딩본이 따로 발급**되고 URL 에서 한 번 더 인코딩된다 — `smoke.mjs` 는 세 변형(`KEY_VARIANTS`)을 모두 지우고, **파일을 쓰기 전에** 최종 검사를 한다(쓰고 나서 검사하면 키가 담긴 파일이 이미 디스크에 남는다).

## Stop conditions met since last review

- 2026-08-10: 검증 체크리스트 6/6 통과 → 실행 정상 종료
