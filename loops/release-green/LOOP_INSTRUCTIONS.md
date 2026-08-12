# Loop Instructions — release-green

## Before You Start

1. `TASK.md`, `PROGRESS.md` 를 읽는다 (특히 `Do Not Repeat`)
2. **하루에 여러 번 돌려도 된다.** 배포 가능 상태는 하루 안에서도 바뀐다 — 오전 RED 를 고친 뒤 오후에 재확인하는 것이 이 Loop 의 정상 사용법이다. 리포트 파일명에 시각이 들어가므로(`green-YYYY-MM-DD-HHMM.md`) 오전의 실패 증거가 덮어써지지 않는다
   > 🔴 단, **소스가 바뀌지 않았는데 실패한 검사를 재시도하지 마라.** 입력이 같으면 결과도 같다 — 아래 `Failure Policy` 를 따른다

## What You Should Do

1. `node loops/release-green/gate.mjs` 실행 — **직접 npm 명령을 조합하지 않는다**
2. 방금 만들어진 `outputs/green-YYYY-MM-DD-HHMM.md` 를 읽고 판정 (스크립트가 마지막 줄에 경로를 출력한다)
3. `PROGRESS.md` 갱신

## 판정 규칙

| 신호 | 판정 | gate.mjs exit |
|---|---|---|
| 3종 전부 exit 0 + 테스트 ≥ 61 + 유출 없음 | ✅ GREEN | **0** |
| 3종 전부 exit 0 + **테스트 < 61** (또는 판독 실패) + 유출 없음 | 🟡 WARN — 회귀 의심 | **1** |
| 하나라도 exit ≠ 0 (유출 없음) | 🔴 RED | **1** |
| `.env.local`·`.env` 값이 리포트 본문에서 발견됨 | 🔴 LEAK — 다른 판정보다 **우선** | **1** |

> 🔴 **테스트 개수가 줄었는데 전부 통과했다고 GREEN으로 넘기지 마라.** 테스트가 삭제됐거나 skip 됐을 수 있다.
> 🔴 **WARN·LEAK도 exit 1이다.** GREEN만 exit 0 — gate.mjs 자체가 이 넷을 구분해서 종료 코드를 낸다. exit 코드만 보고 GREEN이라 단정하지 말고, 리포트 헤딩(GREEN/WARN/RED/LEAK)을 반드시 확인한다.
> 🔴 **LEAK은 test/lint/build 결과와 무관하게 최우선**이다. 3종이 전부 통과해도 비밀값이 리포트에 남아있으면 LEAK로 덮어써진다.

## Safety Rules

- 실패해도 **소스를 고치지 않는다.** 이 Loop는 진단만 한다
- `outputs/` 와 `PROGRESS.md` 외에는 쓰지 않는다
- 🔴 `git commit` / `git push` / 배포를 하지 않는다 — **2026-08-13 부터 `git commit` 은 `.claude/settings.json` 에서 차단(deny)이 아니라 확인(ask)이다.** 도구가 대신 막아주지 않으므로 이 규칙이 유일한 방어선이다
- 허용 여부가 애매하면 멈추고 물어본다

## Verification Checklist

1. 검사 3종이 전부 실행됐다
2. 각 exit code 가 리포트에 기록됐다
3. 테스트 개수가 기록됐고 61과 비교됐다
4. `outputs/` 와 `PROGRESS.md` 외 파일이 수정되지 않았다
5. 리포트에 비밀값이 없다

## Failure Policy

1. **RED** → `PROGRESS.md` 의 `Needs Human Review` 에 실패 검사와 마지막 6줄을 적고 **멈춘다**. 재시도 없음
2. **테스트 개수 감소** → `Needs Human Review` 에 적고 멈춘다
3. 🔴 **LEAK (비밀값 유출 감지)** → `Needs Human Review` 에 **몇 건 발견됐는지만** 적는다 (값 자체는 절대 적지 않는다). **재시도하지 않고 즉시 멈춘다.** 유출된 자격증명을 회전(rotate)할지는 사람이 판단할 일이다 — Loop가 임의로 재실행하거나 "다음엔 안 새겠지"로 넘기지 않는다
4. 스크립트 자체가 실행 안 됨(exit 2 이상) → 환경 문제. 적고 멈춘다
5. 🔴 **행(hang)/시간 초과** → 검사 중 하나가 `시간 초과(10분)` 또는 `출력 과다`로 표시되면(리포트 exit 칸에 bare `null` 대신 이 문구가 뜬다) 이것도 **환경 문제**다 — 코드가 실패한 게 아니라 빌드/테스트가 멈췄거나 출력이 넘친 것이다. `Needs Human Review` 에 어느 검사가 시간 초과/출력 과다였는지 적고 **재시도 없이 멈춘다** (반복 실행이 같은 행을 또 유발할 수 있다)
6. 금지 경로 파일이 수정됨 → 즉시 멈춘다
