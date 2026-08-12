# Loop Instructions — submission-check

## Before You Start

1. `TASK.md`, `PROGRESS.md` 를 읽는다
2. 오늘 리포트가 `outputs/` 에 이미 있으면 중복 실행하지 않는다

## What You Should Do

1. `node loops/submission-check/check.mjs` 실행 — **직접 검사 로직을 만들지 않는다**
2. 리포트를 읽고 **남은 항목과 D-day** 를 확인
3. `PROGRESS.md` 갱신 — 특히 `Needs Human Review` 에 사람이 해야 할 항목을 옮겨 적는다
4. `attribution` 이 이번 실행에서 **처음으로** 🔴 → ✅ 로 바뀌었으면, `Needs Human Review` 최상단에 리포트의 `file:line` 을 적고 "사람이 페이지를 열어 실제 렌더링 확인 필요"라고 남긴다(아래 판정 규칙의 attribution 의미 참고)

## 판정 규칙

| 신호 | 판정 |
|---|---|
| 9/9 충족 | ✅ READY |
| 미충족 있음 + D-14 초과 | 🟡 진행 중 |
| 미충족 있음 + **D-14 이내** | 🔴 위험 — `Needs Human Review` 최상단에 올린다 |

**`attribution` ✅ 의 의미**: "주석이 아닌 소스에 매칭 문자열이 존재한다"는 뜻이지, "화면에 렌더링된다"는 뜻이 아니다. 처음 ✅ 로 바뀐 시점에는 반드시 사람이 실제 페이지를 열어 확인해야 한다(위 "What You Should Do" 4번).

## Safety Rules

- 🔴 **출처 표기 누락을 발견해도 코드를 고치지 않는다.** 리포트에 적고 사람에게 넘긴다
- 🔴 **`submission.json` 의 `done` 을 바꾸지 않는다.** 사람만 바꾼다
- `outputs/` 와 `PROGRESS.md` 외에는 쓰지 않는다
- 리포트에 인증키·좌표를 남기지 않는다
- 허용 여부가 애매하면 멈추고 물어본다

## Verification Checklist

1. 항목 9종이 전부 판정됐다
2. auto 5종은 기계 검사 결과가, manual 4종은 `submission.json` 의 `done` 이 반영됐다
3. D-day 가 리포트에 있다
4. `outputs/` 와 `PROGRESS.md` 외 파일이 수정되지 않았다
5. 리포트에 민감값이 없다

## Failure Policy

1. 미충족 항목 → 리포트에 남기고 **재시도하지 않는다**. 사람이 해야 낫는다
2. `api-list` 누락/초과 있음 → 🔴 **TourAPI 사용 목록이 바뀌었다는 뜻.** 즉시 사람 호출(제출 서류의 활용 API 목록과 어긋난다). `detail` 의 누락/초과 이름을 그대로 리포트에 남긴다
3. `serviceUrl` 이 **응답은 받았지만 200이 아님**(예: 404/500) → 🔴 **배포 문제.** 즉시 사람 호출
3-1. `serviceUrl` 이 **타임아웃(10초)이거나 네트워크 오류로 응답 자체가 없음** → 🟡 **미확인.** 배포 중단인지 일시 장애인지 사람이 다시 확인해야 한다(즉시 비상 호출은 아니지만 `Needs Human Review` 에는 남긴다)
4. 스크립트 실행 실패 → 환경 문제. 적고 멈춘다
5. 같은 검증이 2회 연속 실패 → `Needs Human Review` 에 적고 멈춘다
