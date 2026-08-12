# Loop Progress — submission-check

> 창고가 아니라 조종석이다.

## Current State

- Status: **Active** (권한 사다리 1단계)
- Main objective: 2026-09-21 16:00 제출 항목 9종 충족
- Current focus: 손으로 3~5회 실행하며 안정성 확인
- Last updated: (첫 실행 시 기록)

## Last Run

- (아직 없음)

## Open Items

- 손 실행 0/5회
- `submission.json` 의 `serviceUrl` 이 비어 있음 → **사람이 배포 URL 을 채워야 한다**
- 제출 자산(대표1+상세3~5 이미지, 기능설명서 PDF)이 `assets/` 에 없음

## Blockers

- 없음

## Needs Human Review

- 🔴 **UI 출처 표기 누락** — 규정상 필수인 `출처: ⓒ한국관광공사` 가 없다. 푸터에 텍스트로 추가해야 한다. **로고 이미지는 불가, 텍스트만.** `TourAPI` 단독 표기는 지양

## Next Run Should

1. `node loops/submission-check/check.mjs` 실행
2. D-day 를 확인하고, D-14 이내면 미충족 항목을 최상단으로 올린다
3. 이 파일의 `Last Run` 갱신 + 손 실행 횟수(N/5) 올리기

## Decisions Made

- 2026-08-12 — `submission.json` 을 **단일 소스**로 두고 manual 항목은 사람만 `done` 을 바꾼다. 에이전트가 자기 숙제를 채점하지 않게 하기 위함.
- 2026-08-12 — 출처 표기 누락을 **Loop 가 고치지 않는다**로 확정. 권한 1단계 유지 + UI 문구는 사람이 판단할 문제.

## Do Not Repeat

- 2026-08-12: `attribution` 검사는 **느슨한 표기(`ⓒ한국관광`)도 실패로 본다.** 규정이 요구하는 형식은 `출처: ⓒ한국관광공사`(또는 `ⓒ한국관광콘텐츠랩`)다. 느슨하게 통과시키면 규정 미준수를 통과로 착각한다.
