---
name: submission-check
description: 이모추 1차 심사자료 제출 항목 9종의 충족 여부를 점검하고 리포트·상태 파일을 갱신한다.
when_to_use: 제출 준비 상태 확인, 마감 전 점검, 무엇이 남았는지 물을 때
---

# submission-check

## 절차

1. `loops/submission-check/TASK.md` · `PROGRESS.md` 를 읽는다
2. 오늘 리포트가 이미 있으면 중복 실행하지 않는다
3. `node loops/submission-check/check.mjs` 실행 — **직접 검사 로직을 만들지 않는다**
4. 리포트를 읽고 `PROGRESS.md` 갱신

## 판정

| 신호 | 판정 |
|---|---|
| 9/9 충족 | ✅ READY |
| 미충족 + D-14 초과 | 🟡 진행 중 |
| 미충족 + D-14 이내 | 🔴 위험 |

## 금지

- 🔴 출처 표기 누락을 발견해도 **코드를 고치지 않는다**
- 🔴 `submission.json` 의 `done` 을 **바꾸지 않는다** (사람만)
- `outputs/`·`PROGRESS.md` 외 쓰기 금지
- 리포트에 인증키·좌표 기록 금지

## 에스컬레이션

- `api-list` ≠ 11 → 활용 API 목록이 바뀐 것. 제출 서류와 어긋나므로 **즉시 사람 호출**
- `serviceUrl` ≠ 200 → 배포가 죽음. **즉시 사람 호출**
