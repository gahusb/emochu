# Loop Progress — submission-check

> 창고가 아니라 조종석이다.

## Current State

- Status: **Active** (권한 사다리 1단계)
- Main objective: 2026-09-21 16:00 제출 항목 9종 충족
- Current focus: 손으로 3~5회 실행하며 안정성 확인
- Last updated: 2026-08-31

## Last Run

- Date: **2026-08-31 10:05**
- Summary: **4 / 10 충족** · **D-22** · 남은 항목 6건 (사람 4 + 기계 2)
- Output: `outputs/submission-2026-08-31-1005.md`
- 충족: `service-url`(HTTP 200) · `api-list`(11개 일치) · `barrier-free`(KorWithService2 연동) · `attribution`(`SiteFooter.tsx:12`)
- 📌 항목이 **9종 → 10종** 으로 늘었다(2026-08-18 `barrier-free` 추가). 이 파일의 옛 기록(N/9)은 낡은 표기다.
- 🔴 미충족 6건은 **전부 사람·자산 작업**이다 — 코드로 해결되지 않는다

## Open Items

- 🔴 **기능설명서 지정양식 PDF 가 레포 어디에도 없다.** `assets/` 에는 `README.md` 뿐이고, `docs/` 의 PDF 는 5월 예비심사용 **제안서**다(1차 심사용 기능설명서가 아니다). 임의 양식은 심사 제외 — **양식 다운로드가 남은 일 중 최대 리스크**다
- 제출 이미지(대표1 + 상세3~5)가 0장. 🔑 **UI 변경이 끝난 뒤에 찍어야** 재촬영이 없다
- manual 4종(`team-info`·`service-info`·`test-account`·`api-keys`)이 전부 `done: false`
  - `test-account` 는 이모추가 로그인 없는 서비스이므로 **'불필요' 선택 1분 작업**이다
- 📌 `api-list` 는 KorService2 11개만 센다. 실제 활용은 **2상품 12 오퍼레이션**(무장애 별도) — 서류에 11로 적으면 **과소 신고**다

## Blockers

- 없음

## Needs Human Review

- ✅ ~~출처 표기 렌더링 육안 확인~~ — 2026-08-13 완료. `SiteFooter.tsx:9` · 로컬 dev + **라이브(`emochu.vercel.app`) 양쪽에서 확인**. 다음에 이 항목이 다시 🔴 로 바뀌면 같은 절차를 반복한다(검사기의 ✅ 는 문자열 존재만 증명한다).
- 🔴 **`api-keys` 항목에 실제 인증키를 적지 말 것.** `submission.json` 은 git 추적 대상이다. "제출 완료" 표시만 한다

## Next Run Should

1. `node loops/submission-check/check.mjs` 실행
2. D-day 를 확인하고, **D-14 이내(2026-09-07 부터)면 미충족 항목을 최상단으로 올린다**
3. 이 파일의 `Last Run` 갱신
4. 🔴 제출 목표일은 **마감 이틀 전(9/19)** 이다 — 마감 당일 접수 시스템 과부하는 지원자 책임이다

## Decisions Made

- 2026-08-12 — `submission.json` 을 **단일 소스**로 두고 manual 항목은 사람만 `done` 을 바꾼다. 에이전트가 자기 숙제를 채점하지 않게 하기 위함.
- 2026-08-12 — 출처 표기 누락을 **Loop 가 고치지 않는다**로 확정. 권한 1단계 유지 + UI 문구는 사람이 판단할 문제.
- 2026-08-13 — 위 결정대로, 출처 표기는 **Loop 밖의 사람 주도 세션**에서 추가했다(위치·문구를 사람이 정한 뒤 전역 푸터 신설). Loop 는 검사만 했다.
- 2026-08-13 — **당일 중복 실행 금지 규칙을 해제**했다. 제출 항목은 하루에도 바뀐다(자산 추가·`submission.json` 편집). 대신 리포트 파일명에 시각을 넣어 이전 결과를 덮어쓰지 않게 했다.
- 2026-08-13 — `submission.json` 의 **auto 항목에서 `done` 필드를 삭제**했다. `check.mjs` 는 auto 를 매번 기계 검사하므로 그 값을 읽지 않는다 — 사람이 손대면 "고쳤는데 안 바뀐다"는 헛수고만 남는다.

## Do Not Repeat

- 2026-08-12: `attribution` 검사는 **느슨한 표기(`ⓒ한국관광`)도 실패로 본다.** 규정이 요구하는 형식은 `출처: ⓒ한국관광공사`(또는 `ⓒ한국관광콘텐츠랩`)다. 느슨하게 통과시키면 규정 미준수를 통과로 착각한다.
- 2026-08-12 (fix round 1): `grepUi`/`checkApiList` 는 **주석을 제거한 소스**에서만 매칭해야 한다. 초판은 주석·죽은 코드에 적힌 문구도 통과시켰다(Step 5 red-green이 `export const ATTRIBUTION = "..."` 로 이를 증명함) — 코드에 존재하는 것과 화면에 렌더링되는 것은 다르다. `attribution` ✅ 는 지금도 "문자열 존재"만 증명하며 "렌더링됨"은 사람이 확인해야 한다.
- 2026-08-12 (fix round 1): `checkApiList` 는 **개수(`size===11`)가 아니라 이름 집합**으로 비교해야 한다. 개수만 맞으면 API 하나가 다른 것으로 바뀌어도(모양만 같으면) 조용히 통과한다.
- 2026-08-13: 🔴 **fetch 를 한 스크립트에서 `process.exit()` 를 부르지 말 것.** Windows + Node 24 에서 undici 핸들이 정리 중일 때 강제 종료하면 libuv 가 죽는다 — `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` 과 함께 **종료 코드가 127** 이 되어, exit code 로 판정하는 Loop 가 "미충족 1건"과 "스크립트 붕괴"를 구분하지 못한다. `process.exitCode = N` 만 세우고 이벤트 루프가 스스로 비게 둔다(실측 종료까지 ~300ms).
  - `serviceUrl` 이 비어 fetch 를 건너뛸 땐 안 터졌다. **채우자마자 매번 터졌다** — 조건이 갖춰지기 전엔 보이지 않는 종류의 결함이다.
  - 응답 body 를 소비해도 소용없었다. 원인은 body 가 아니라 `process.exit()` 자체다(최소 재현으로 확인).
- 2026-08-13: `grepUi` 는 히트를 찾아도 **파일 목록을 끝까지 돌아야 한다.** 첫 히트에서 즉시 반환하면 그 뒤의 파싱 실패 파일이 `unscannable` 에 누적되지 않아, "무엇을 못 봤는지"를 사람에게 절반만 알려준다(판정은 맞아도 진단이 불완전하다).
- 2026-08-12 (fix round 1): `checkServiceUrl` 은 **10초 AbortController 타임아웃**이 반드시 있어야 한다. 타임아웃 없으면 배포 확인 하나가 리포트 9개 항목 전체를 무기한 블록한다. 타임아웃/네트워크 오류는 "배포 죽음"이 아니라 "미확인"으로 구분해서 오경보를 막는다.
