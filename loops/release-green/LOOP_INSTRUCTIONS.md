# Loop Instructions — release-green

## Before You Start

1. `TASK.md`, `PROGRESS.md` 를 읽는다 (특히 `Do Not Repeat`)
2. 오늘 날짜 리포트가 `outputs/` 에 이미 있으면 **중복 실행하지 않는다**

## What You Should Do

1. `node loops/release-green/gate.mjs` 실행 — **직접 npm 명령을 조합하지 않는다**
2. `outputs/green-YYYY-MM-DD.md` 를 읽고 판정
3. `PROGRESS.md` 갱신

## 판정 규칙

| 신호 | 판정 |
|---|---|
| 3종 전부 exit 0 + 테스트 ≥ 61 | ✅ GREEN |
| 3종 전부 exit 0 + **테스트 < 61** | 🟡 WARN — 회귀 의심 |
| 하나라도 exit ≠ 0 | 🔴 RED |

> 🔴 **테스트 개수가 줄었는데 전부 통과했다고 GREEN으로 넘기지 마라.** 테스트가 삭제됐거나 skip 됐을 수 있다.

## Safety Rules

- 실패해도 **소스를 고치지 않는다.** 이 Loop는 진단만 한다
- `outputs/` 와 `PROGRESS.md` 외에는 쓰지 않는다
- `git commit`/`push`/배포 금지
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
3. 스크립트 자체가 실행 안 됨(exit 2 이상) → 환경 문제. 적고 멈춘다
4. 금지 경로 파일이 수정됨 → 즉시 멈춘다
