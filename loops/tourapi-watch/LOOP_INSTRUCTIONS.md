# Loop Instructions — tourapi-watch

You are running the TourAPI health-watch loop for 이모추.

## Before You Start

1. Read `TASK.md`
2. Read `PROGRESS.md` — 특히 **`Do Not Repeat`**과 **`Needs Human Review`**
3. 오늘 날짜의 리포트가 `outputs/`에 **이미 있으면 중복 실행하지 않는다.** 그대로 종료하고 그 사실만 보고한다.
   > 이 규칙은 **이 Loop 에만** 남아 있다(`release-green`·`submission-check` 는 하루 여러 번 실행을 허용한다). 여기는 **하루 1회 표본**이 관측 단위이기 때문이다 — API 생존 여부는 하루 안에서 오르내리는 값이 아니고, 같은 날 반복 호출은 전날 대비 `totalCount` 비교를 흐린다. 실제 장애가 의심되면 사람이 직접 스크립트를 돌린다.

## What You Should Do

1. `node loops/tourapi-watch/smoke.mjs` 를 실행한다.
   - 🔴 **호출 자체를 직접 만들지 마라.** 스크립트가 단일 경유점이다. (결정적 작업은 모델이 아니라 스크립트가 한다)
   - 스크립트가 `outputs/api-health-YYYY-MM-DD.md`를 쓴다.
2. 리포트를 읽고 **판정**한다.
3. `PROGRESS.md`를 갱신한다 — 아래 항목을 채운다:
   - `Last Run` (날짜 · PASS/WARN/FAIL 수)
   - `Open Items` / `Blockers`
   - `Needs Human Review`
   - `Next Run Should`
   - 새로 배운 것이 있으면 `Do Not Repeat`

## 판정 규칙

| 신호 | 판정 |
|---|---|
| HTTP 200 + `resultCode 0000` + 항목 수 > 0 | ✅ PASS |
| HTTP 200 + `resultCode 0000` + **항목 수 0** | 🟡 WARN |
| 그 외 (HTTP ≠ 200, JSON 파싱 실패, `resultCode ≠ 0000`) | 🔴 FAIL |

> 🔴 **WARN을 가볍게 넘기지 마라.** 폐기된 오퍼레이션은 404가 아니라 **「200인데 결과 0」**으로 먼저 나타날 수 있다. (2026-08-10 red 테스트에서 없는 `contentId`가 정확히 이 모습이었다.)

## Safety Rules

- 소스 파일(`app/`·`lib/`·`components/`·`tests/`)을 **수정하지 않는다**
- 파일을 삭제하거나 이름을 바꾸지 않는다
- `outputs/` 와 `PROGRESS.md` **외에는 아무것도 쓰지 않는다**
- 🔴 `git commit` / `git push` / 배포를 하지 않는다 — **2026-08-13 부터 `git commit`·`git push` 는 `.claude/settings.json` 에서 차단(deny)이 아니라 확인(ask)이다.** 도구가 대신 막아주지 않으므로 이 규칙이 유일한 방어선이다. 승인 프롬프트가 떴다는 건 이미 규칙을 어긴 뒤다
- 🔴 인증키를 리포트·로그·커밋 메시지에 **절대 쓰지 않는다**
- 허용 여부가 애매하면 **멈추고 물어본다**

## Verification Checklist

실행을 끝내기 전에 확인한다:

1. 11개 오퍼레이션이 전부 호출됐다 (11/11)
2. 각 응답의 HTTP 상태와 `resultCode`가 리포트에 기록됐다
3. 결과 항목 수가 0인 오퍼레이션이 있으면 WARN으로 표시됐다
4. **`areaCode2`·`categoryCode2`의 생존 여부가 명시됐다**
5. `outputs/` 와 `PROGRESS.md` 외의 파일이 수정되지 않았다
6. 🔴 리포트에 인증키 문자열이 없다

## Failure Policy

1. **일시적 5xx / 타임아웃** → 1회 재시도
2. 재시도 후에도 실패 → `PROGRESS.md`의 `Needs Human Review`에 적고 **나머지 오퍼레이션은 계속 진행**
3. 🔴 **`areaCode2` 또는 `categoryCode2`가 FAIL** → 재시도하지 않고 **즉시 멈추고 사람 호출**. 이건 서비스가 곧 깨진다는 신호다
4. **금지 경로 파일이 수정됨** → 즉시 멈춤
5. **같은 검증이 2회 연속 실패** → 사람 검토로 넘기고 멈춤

## Boundary (혼자 해도 되는 범위)

- 리포트 작성과 `PROGRESS.md` 갱신은 혼자 한다
- **판정이 애매하면 사람에게 넘긴다.** 애매한 것을 스스로 PASS로 만들지 않는다
- 코드 수정 제안은 `PROGRESS.md`에 **글로만** 남긴다. 직접 고치지 않는다
