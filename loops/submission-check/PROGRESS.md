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
- 2026-08-12 (fix round 1): `grepUi`/`checkApiList` 는 **주석을 제거한 소스**에서만 매칭해야 한다. 초판은 주석·죽은 코드에 적힌 문구도 통과시켰다(Step 5 red-green이 `export const ATTRIBUTION = "..."` 로 이를 증명함) — 코드에 존재하는 것과 화면에 렌더링되는 것은 다르다. `attribution` ✅ 는 지금도 "문자열 존재"만 증명하며 "렌더링됨"은 사람이 확인해야 한다.
- 2026-08-12 (fix round 1): `checkApiList` 는 **개수(`size===11`)가 아니라 이름 집합**으로 비교해야 한다. 개수만 맞으면 API 하나가 다른 것으로 바뀌어도(모양만 같으면) 조용히 통과한다.
- 2026-08-12 (fix round 1): `checkServiceUrl` 은 **10초 AbortController 타임아웃**이 반드시 있어야 한다. 타임아웃 없으면 배포 확인 하나가 리포트 9개 항목 전체를 무기한 블록한다. 타임아웃/네트워크 오류는 "배포 죽음"이 아니라 "미확인"으로 구분해서 오경보를 막는다.
