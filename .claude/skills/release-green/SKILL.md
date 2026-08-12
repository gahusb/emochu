---
name: release-green
description: 이모추가 지금 배포 가능한 상태인지 test·lint·build 로 판정하고 리포트·상태 파일을 갱신한다.
when_to_use: 제출 전 상태 확인, 배포 전 점검, 큰 변경 후 회귀 확인
---

# release-green

## 절차

1. `loops/release-green/TASK.md` · `PROGRESS.md` 를 읽는다
2. 오늘 리포트가 이미 있으면 중복 실행하지 않는다
3. `node loops/release-green/gate.mjs` 실행 — **직접 npm 명령을 조합하지 않는다**
4. 리포트를 읽고 판정, `PROGRESS.md` 갱신

## 판정

| 신호 | 판정 | gate.mjs exit |
|---|---|---|
| 3종 exit 0 + 테스트 ≥ 61 + 유출 없음 | ✅ GREEN | **0** |
| 3종 exit 0 + 테스트 < 61 (또는 판독 실패) + 유출 없음 | 🟡 WARN (회귀 의심) | **1** |
| 하나라도 exit ≠ 0 (유출 없음) | 🔴 RED | **1** |
| `.env.local`·`.env` 값이 리포트 본문에서 발견됨 | 🔴 LEAK — **다른 판정보다 우선** | **1** |

> WARN·LEAK도 exit 1이다 — GREEN만 exit 0. 종료 코드만으로 GREEN 단정하지 말고 리포트 헤딩(GREEN/WARN/RED/LEAK)을 확인한다.
> LEAK은 test/lint/build 통과 여부와 무관하게 최우선으로 덮어쓴다.

## 금지

- 실패해도 **소스를 고치지 않는다** (진단 전용)
- `outputs/`·`PROGRESS.md` 외 쓰기 금지
- `git commit`/`push`/배포 금지

## 에스컬레이션

- RED 또는 테스트 개수 감소 → `Needs Human Review` 에 적고 **재시도 없이 멈춘다**.
- 🔴 **LEAK** → `Needs Human Review` 에 **발견 건수만** 적는다 (값 자체는 절대 적지 않는다). **재시도 없이 즉시 멈춘다.** 자격증명 회전(rotate) 여부는 사람이 결정한다.
- 🔴 **행(hang)/시간 초과** → 리포트의 exit 칸에 `시간 초과(10분)` 또는 `출력 과다`가 뜨면 **환경 문제**다(코드 실패가 아니다). `Needs Human Review` 에 어느 검사인지 적고 **재시도 없이 멈춘다**.
