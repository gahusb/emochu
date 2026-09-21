# 이모추! (EmoChoo) — AI 주말 나들이 코스 플래너

## 프로젝트 개요
**이모추!**(이번 주에 모하지 추천)는 한국관광공사 TourAPI와 AI를 활용한 주말 나들이 코스 추천 서비스.
2026 관광데이터 활용 공모전 출품작 — 웹·앱 개발 부문

> 🎉 **2026-09-21 1차 심사자료 제출 완료**(마감 16:00 정각, 약 3시간 전). 다음 강제 일정은 **10/21 최종심사 대상자 발표**까지 없다.
> 🔖 **제출 이후 작업을 이어받는다면 `docs/2026-09-21-작업-인수인계.md` 부터 읽어라** — 할 일(P1~P7)·건드리면 안 되는 것(제출 정합성 6가지)·Do Not Repeat 이 거기 있다. 사실 기록은 `docs/2026-09-21-제출완료-기록과-개선사항.md`.
> ✅ **제출 후 개선 P1~P7 처리 + 배포 완료(9/21):** 커밋 `7d2808f`(배지·대기 안내·submission, 격리 **247 GREEN**) → `0d259ff`(9/8~9/13 누적 품질 보완 116파일 + 계측·P3·P4·P5). 운영 확인: 4개 페이지 200·콘솔 오류 0, **홈 배지가 세종문화회관→공연장 / 이화여고100주년기념관→기념관 / 신문박물관→박물관**, 축제 49건, 코스 생성 종단 1회 **22.6초·`persistence: saved`·`generationMode: ai`**(→ anon 폴백 제거가 운영에서 통과). 🔴 **남은 것: 단계별 소요 로그는 Vercel 대시보드에서 `이모추API` 로 검색해야 보인다**(이 세션은 열람 수단 없음), P1 표본 부족(1회·반나절 조건), P3 재현·카카오 공유·장소 교체·iPhone 미확인. 처리 내용: P2 홈 배지 정정(`A0206`=문화시설 + 소분류 라벨, 스코어링 무관 확인)·P4 교체 스켈레톤·P5 배너 12초 자동 접힘·P6 API 개수 근거·P7 manual 4건 → **10/10**. P1 은 절반 — `lib/course-stage-timer.ts` 로 **단계 계측만** 붙였고 **표본 0건**, 단계 표시(스트리밍)는 미구현이라 화면은 「흘러간 시간」만 말한다. P3 은 「가족+아이」 한정 20km→12km **잠정**(표본 2회, 재현 미확인). 로컬 **561 tests / lint / build GREEN**. `docs/2026-09-21-제출후-개선-작업결과.md` 참조.

> **최신 9/13 사진 전체 보기 배포 완료:** SpotDetail 대표/썸네일 클릭→SpotImageViewer(native dialog, 원본 URL/object-contain), 이전·다음·원본 새 탭·Tab/Escape. 부모 상세와 lockBodyScroll을 공유해 확대 중 브라우저 뒤로가기의 스크롤 잔류 회귀도 수정. 13:19 **537 tests / lint / build GREEN**, 브라우저 모의 4폭/20상태·흐름/16장 통과. 기능 6개 파일만 `5c7e757` 커밋·main push, 격리 커밋 234 tests/lint/build 및 Vercel Production 성공. 운영 사이트에서 합성 API 응답으로 실제 배포 UI 전체 보기·원본 비율·다음·Escape 통과, 브라우저 오류 0·외부 관광 API 0. `docs/2026-09-13-축제사진-전체보기-개발결과.md` 참조. 다음은 실제 iPhone 확인. 다른 누적 변경·AI·DB는 미배포/미호출.

> **최신 9/12 공유 수정 배포 완료:** 사용자 승인으로 SaveShareBar·공유 회귀 테스트 두 파일만 `075b160` 커밋·main push, 기존 Vercel `gahusbs-projects/emochu` 배포 성공. 13:30 KST 운영 청크 `0lwnlxu1xz4im.js`에서 카카오 카드/버튼·클립보드의 전체 주소 변환 확인, 사용자 제공 기존 코스 HTML/API 200. 격리 배포 소스 221 통과/4 skip, lint 오류 0(기존 경고 10), build 성공. 전체 작업 트리의 516 GREEN 재실행이 아니다. 다음은 기존 화면 새로고침→새 카카오 메시지→iPhone ‘코스 보기’ 사용자 확인. 새 AI 생성·DB 권한 변경·실제 메시지 발송은 미실행. `docs/2026-09-12-카카오공유-수정-배포결과.md` 참조. 아래 9/11의 공유 미배포/연결 미확인 상태는 당시 기록이며, 다른 누적 변경(서버 anon 폴백 제거 등)은 여전히 미배포다.

> ✅ **9/22 수정 적용·재측정:** 503 재시도 제거 + 모델별 타임아웃(앞 12초·마지막 남은 전부 최대 45초, 예산 6초 미만이면 호출 생략)을 배포(`e28a37b`, 568 tests GREEN). 같은 8조건 재측정에서 **규칙 폴백 5/8 → 0/8, 평균 46.7초 → 28.7초**. 🔴 **전부 수정 덕으로 읽지 마라** — 그 시각엔 503 이 아예 나지 않아 「503 → 즉시 다음 모델」 경로는 **발동도 안 했다**(단위 검사 4개로만 고정). 수정 효과로 말할 수 있는 건 AI 단계 31.6초·38.1초였던 2건이 **예전 고정 25초 상한이면 폴백**이었다는 점이다. 정정: 1순위 모델 지연은 20.4초가 아니라 **8.9초**(앞선 측정에 `thinkingBudget: 512` 가 빠졌었다) → 12초 상한 타당. 다음은 **503 이 나는 저녁 시간대 재측정**이다.
> 🔴 **9/21 P1 측정 완료 — 범인은 AI 단계다.** 운영 8회 생성(헤더 `x-emochu-timings` 배포 후): `ai`가 전체의 **72~94%**, collect 2.2~2.9s·enrich 0.06~1.7s·persist 0.3~1.0s·score/finalize ~0ms. 🔴 **8회 중 5회가 53초 예산 초과로 규칙 폴백**(총 소요가 53~55초에 몰린 건 상한에 걸린 것). 원인은 모델별 직접 측정으로 확정: **3.6-flash·3.5-flash 가 실제 크기 요청에 503(high demand), 2.5-flash 만 200이지만 48.6초**. 여기에 `weekend-ai.ts:1415` 의 「503 → 3초 대기 → 재시도」가 10~13초를 더 태운다. 고칠 후보 순위와 한계는 `docs/2026-09-21-P1-단계측정-실측결과.md`. P3(가족 12km)는 최장 구간이 0.7~0.9km라 **발동 상황이 없어 효과 확인 불가**. enrich 는 범인이 아니다(9/10 보호가 듣고 있다).

> 🔎 **9/21 운영 검증 2차(AI 생성 제외):** TourAPI **11/11 PASS**(폐기 예정 2종 포함), API 계약·경계 23건 기대대로, 4폭×4페이지 **가로 넘침 0·콘솔 오류 0·푸터 16/16**, 축제 필터/반경/지역(19+9+1=29)·검색 12건·사진 전체 보기(1/7→2·Escape)·커뮤니티 방문자 **편집 버튼 0**·공유 클립보드 **절대 주소**·위저드 4스텝(1박2일 안내·접근성 4/4·draft 복구)·OG 200·Kakao SDK 초기화·404 안내 화면·**viewport maximum-scale 해소** 확인. 🟡 발견 1건: 주말이 기상청 예보 범위(3일) 밖일 때 홈이 「주말 날씨를 확인하고 있어요」라고 **로딩처럼** 말한다(`lib/weekend-summary.ts:43`) — 버그 아님, 문구 개선 후보. 🔴 AI 생성·장소 교체·실기기·실제 카카오 발송은 미확인. `docs/2026-09-21-제출후-개선-작업결과.md` 「운영 검증 2차」.

> 🎯 **킥 = 사주(오행).** 근거·실측은 `docs/2026-08-29-킥-사주-인수인계.md`.
> **홈의 기준 축은 「이번 주말」이다**(2026-09-03) — 주말 나들이 서비스라 오늘 기준이면 어긋난다.
> `getWeekendElements()` 가 토·일 오행을 주고, `summarizeWeekendElements()` 가 **같으면 한 줄로 합쳐 / 다르면 한 줄 안에서 나눠** 말한다.
> **두 축은 분리돼 있다**: 기분은 **사용자가 직접** 고르고(`SET_FEELING`), 사주는 **조언**이며 오늘의 오행이 `elementScore()` 로 **장소 점수**에 얹힌다(최대 5점). 사주는 feeling 을 정하지 않는다.
> `getTodayElement()` 가 일주 기준이라 **날마다 답이 바뀐다** — 그게 리텐션 장치다.
> **공유 진단 후속 URL 확인 완료:** 사용자가 제공한 실제 코스 URL을 페이지/API 각 1회 GET해 모두 200·코스 존재·상대 shareUrl 반환·최상위 토큰 필드 없음 확인. 사용자도 직접 URL 정상/카카오 버튼 실패를 확인했다. 같은 URL을 다시 요구하지 않는다. 실제 코스 slug/제목/위치/내용은 문서에 옮기지 않는다. 기존 SaveShareBar 절대 주소 수정의 승인된 운영 반영과 새 메시지 검증이 다음이며 DB 익명 권한을 되돌리지 않는다. 일반 GET의 조회수 증가는 가능, AI/생성/편집/발송/배포는 미실행. 아래 최초 진단의 ‘실제 URL 미확인’은 이 후속으로 갱신됐다.
> **최신 9/11 23:31 공유 진단:** 카카오 메시지 ‘코스 보기’가 홈으로 간다는 사용자 보고. 운영 `16j3uxhrkvijs.js`에 상대 shareUrl을 mobileWebUrl/webUrl·클립보드로 그대로 보내는 구 코드 확인. 로컬 SaveShareBar의 절대 주소 변환은 기존 수정이나 운영 미반영. 메모리 모킹으로 HEAD/로컬 각각 5개 주소 대상 비교 확인. 실제 메시지 URL/리다이렉트·제품 링크 도메인은 미확인이라 해당 메시지 원인을 완전히 확정하지 않는다. 고정 미존재 코스 HTML은 200/같은 경로 유지(코스 조회 성공 아님). 이번에는 진단만 수행, 앱 소스/배포/DB/Kakao 설정 변경 없음. `docs/2026-09-11-카카오공유-홈이동-진단.md` 참조. 실제 전체 코스 URL 확인 후 승인된 배포와 새 메시지 재검증이 다음이다. DB 익명 권한을 다시 열지 않는다.
> 최신 개발/확인은 `docs/2026-09-11-DB-권한-보완-적용안.md`. 9/11 22:18 **516 tests / lint / build GREEN**, 별도 격리 SQL 14개 통과(PGlite 0.5.8/PostgreSQL 18.3). 이후 사용자가 017 실행 성공을 보고했고 **23:20 KST 사후 메타데이터에서 anon/authenticated의 세 객체 테이블·열 권한 및 사용량 RPC 차단, 공개 정책 제거, service_role CRUD·RPC·BYPASSRLS 유지**를 확인했다. 017 재실행을 요청하지 않는다. 서버 anon 폴백 제거는 로컬 구현이며 앱 배포 반영은 미확인. 에이전트는 운영 DB 쓰기·토큰 폐기·배포·AI 호출을 하지 않았다.
> **다음 확인:** DB 직접 접근 차단 목표는 사용자 제공 메타데이터로 확인 완료. 실제 기존 공유 링크·로그인 내 코스·생성자 편집/방문자 편집 거부는 별도 운영 회귀 검사가 필요하다. Production 서비스롤 키 존재는 사용자 확인, 실제 프로젝트 일치/운영 버전은 미확인. 과거 유출·변조도 미확인이다. 기존 토큰은 권한 회수만으로 무효화되지 않으므로 폐기 영향/범위는 별도 승인. usage fail-open은 기존대로 남아 있다. `.vercel/project.json`·vercel CLI 없음, 배포 연결/승인 확인 전 앱 배포 보류. `docs/weekend-deploy-checklist.md` 참조. 문서 갱신만으로 게이트나 AI를 재실행하지 않는다.
> 이전 UI 수정은 `docs/2026-09-11-운영안내-수정-배포전점검.md`. 운영시간 단정 2곳 교체·1박2일 미확인 안내·4개 폭×2개 여행 기간 8상태 로컬 확인. iPhone 사용자 검사와 신규 로컬 수정본의 배포/실기기 통과를 구분한다.
> **9/11 iPhone 17 수동 검사:** PC 연결 없이 사용자가 조작하고 ‘특이사항 없음’ 보고. 사진 5장에서 확대된 홈·축제 탭/목록 변화·상세 지도·최종 취향 다중 선택을 확인했다. 확대된 사진의 잘림을 기본 배율 오류로 판정하지 않는다. 정확한 iOS 버전·배율은 미수집. AI 생성→저장→공유 종단간은 미검증이며, 외부 지도 전환·복귀는 개별 영상 없이 사용자 총괄 보고만 있다. 이를 자동 실기기 테스트나 최신 로컬 수정본의 배포 완료로 표현하지 않는다.
> **9/10 재실측 후 AI 중단 유지:** 작은 JSON 확인은 성공했지만 배치 6은 서울 AI 성공→강릉 429→울릉도 AI 미전송(규칙)이다. 코스 AI 전송 2회/성공 1회, 최종 3조건 알려진 검사 통과, 운영시간 7/12 미확인. 관광 상세 66/66 HTTP 200. 배치 7·8 미실행, 이전 AI 미시도 9개 중 7개는 여전히 미시도다. 잔여 한도·제한 종류·리셋 시각은 미확인. 한도 확인 없이 추가 호출하지 않는다.
> 9/10 배포 390px에서 실제 축제 필터 34→17개, 장소 상세·Kakao 지도·4단계 입력(생성 미실행)을 확인했다. 당시 maximum-scale=1·약29.3px 반경 버튼은 로컬과 달랐다. 운영시간 단정 문구는 9/11 로컬에서 수정했으며 배포 반영은 아직이다.
> 생성 테마는 `getTripSaju`의 **KST 여행 시작일** 기준이다. 날짜별 예보 범위, 원본 대조, 시간표 보정은 `weather-coverage.ts`·`course-quality.ts`가 담당한다. 사주로 기분을 덮어쓰지 않는다.
> 코스 후보 수집은 `lib/course-candidates.ts`에서 생성 API와 실측기가 공유한다. `node scripts/verify-live-course.mjs`는 명시적 실측 요청 때만 실행(AI 최대 3회, DB 미사용). 표본 성공을 운영 성공률로 일반화하지 않는다.
> 식사·긴 이동 구간 보완은 `course-repair.ts`, 단순 운영시간 대조는 `operating-window.ts`다. 예비 후보는 AI 응답의 원본 대조 **이후에만** 서버가 사용하며 AI 프롬프트로 보내지 않는다. 추가 AI/API 호출은 없다. 기존 실측 보고서의 `--replay`는 최신 관광 원본만 조회하고 Gemini 호출을 차단한다.
> 축제는 `festival-data.ts`의 전국 주말 조회→원본 좌표·기간 대조를 공유한다. 실측에서 기존 서울 지역 필터가 0건을 반환했으므로 구 지역코드로 코스 축제를 거르지 않는다. 최대 600건/3페이지, 코스 후보 최대 6개는 행사시간 원문을 상세 조회한다. 축제 목록의 불필요한 AI 요약 제거, 503·부분 조회·정상 빈 결과 UI 분리.
> 공연 시간은 `festival-timing.ts`·`course-festival.ts`가 원문 전체를 보수적으로 해석한다. 일반 시간표 보완은 축제를 임의로 늦추지 않는다. 회차당 체류시간 반영 후 실제 시작 목록 안에서만 보완하며, 복합 예외는 미확인이다. 식사 보완은 빈 구간→중복 관광→같은 날 2개 이상인 축제 중 식사와 겹치는 하나의 순서다. 시간 예산은 `course-budget.ts`에서 체류 보존·대기 간격 축소→끝 선택 관광 한 곳 제외 순으로, 전체 검사에 통과하는 경우만 반영한다.
> **9/9 외부 검사 중단:** 24조건 중 AI 첫 시도 15개(성공 3), 규칙 전용 9개를 분리 집계했다. Gemini 429·503·25초 초과 및 관광 `detailIntro2` 429를 관측했다. 전체 운영시간 미확인 95/127, 재생에서도 상세 조회 실패. 9/10 후속은 외부 호출 없이 상세 중복·캐시·429 대기 억제와 운영시간 미확인 표시를 보완했다. 날짜 변경을 한도 회복으로 가정하지 않는다. 다음은 한도 상태 확인 후 작은 표본 재검증, 실제 폰·공식 양식/시연이다. 자동 재시도·스케줄 미등록.
> `tour-detail-guard.ts`: detailIntro2만 프로세스 내부 동일 요청 합치기·정상 60초/128건 캐시·동시 4개·대기 포함 7초·미완료 고유 요청 256개. 429 억제는 Retry-After 최소60초/최대24시간, 자동 재시도 없음. 분산 한도 관리나 모든 API 보호가 아니다. `hoursStatus`는 정기휴무(openStatus)와 별개이고 원문 운영구간만 판정한다. 교체/순서 변경은 unknown으로 되돌린다. UI 전용 집계/라벨은 `course-hours-summary.ts`로 API 의존성과 분리한다.
> ✅ **1차 심사자료 제출 완료(2026-09-21).** 다음 강제 일정은 10/21 최종심사 대상자 발표. 하네스·루프는 `docs/2026-08-13-하네스-작업-인수인계.md`.

> 🧭 **2026-09-04 단순화 (사용자 테스트 반영).** 피드백: *"선택지가 너무 많아 복잡하고, 뭘 원하는지 모르겠다."*
> **홈은 히어로 랜딩이다** — 첫 화면의 주장은 「주말 코스를 짜준다」 하나. 조건(날씨·기운)은 카드가 아니라 **한 줄씩**(`lib/weekend-summary.ts`), 그 아래 CTA 하나가 화면에서 제일 크다.
> **축제는 홈에서 뺐다** — 탭이 따로 있어서 `FestivalTabInvite` 한 줄이 탭으로 보낸다. 같은 걸 네 군데서 보여주면 정보가 아니라 소음이다.
> **위저드는 6스텝 → 4스텝**(`WIZARD_TOTAL_STEPS`): ①어디로+기분(장소를 고르면 기분이 이어서 나타난다) ②내 기운(사주 — **건너뛸 수 있다**) ③언제+누구랑 ④취향(+접근성 접이식).
> 🎲 **랜덤**은 UI 전용 선택지다(`DestinationPick`). 뽑힌 도시를 **이름으로 보여주고** 다시 뽑게 한다 — 서버로는 `destinationType: 'city'` 로 나가 계약이 그대로다.
> 🔴 draft 키가 `emochu.wizard_draft.v2` 다. 6스텝 시절 draft(`step: 5`)를 복구하면 없는 스텝에 갇힌다.

> 💰 **실서비스 과금·저장·공유는 `docs/2026-08-31-실서비스-과금-저장-공유-설계.md`.**
> 🔴 **배포 전에 마이그레이션을 `013 → 014 → 015 → 016` 순서로 실행한다** — 순서가 뒤바뀌면 공유 링크가 404 가 된다.
> 코스 생성은 이제 **1회 생성**(B는 눌러야 만들어짐)이고, 개인·전체 **일일 상한**이 걸려 있다.
> 코스 편집(장소 교체·순서)은 **편집 토큰**으로 권한을 가른다. 로그인은 `NEXT_PUBLIC_AUTH_ENABLED` 로 **기본 꺼짐**.

> 🤝 **2026-09-05 커뮤니티 코스 추천 — `/community`.** "AI 로 새로 만드는 대신 남이 만든 코스도 보여주자"는
> 제안을 받아 구현. **opt-in**이다 — 코스 결과 화면(`SaveShareBar`)에서 소유자(edit_token 보유자)가
> 직접 켜야 `is_public=true` 가 되고, 그때 `keepCourse()` 도 같이 불러 영구 보존시킨다(끌 때는 되돌리지 않음).
> **재검증은 안 한다**(1차 범위) — `COMMUNITY_FRESH_DAYS`(기본 45일, env override) 신선도 필터로만
> 오래된 코스를 자동으로 뺀다. 축제 종료·영업시간 재확인은 2차 과제. 하루 생성 한도(429)에도
> `lib/course-community.ts` 의 `fetchSuggestionsForLimitError()` 로 인기 코스 몇 개를 곁들인다.
> 목록/상세는 기존 `/course/[slug]` 를 그대로 재사용 — `editable = Boolean(editToken)` 이 이미
> 방문자를 편집 불가로 가르기 때문에 새 상세 페이지가 필요 없었다.

## 개발자
- 이름: 박재오
- 이메일: bgg8988@gmail.com

## 기술 스택
| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| AI 엔진 | Google Gemini (코스 생성: gemini-3.6-flash → gemini-3.5-flash → gemini-2.5-flash) |
| 관광 데이터 | 한국관광공사 **OpenAPI 2종 · 오퍼레이션 12개** (KorService2 11 + KorWithService2 1) |
| 날씨 데이터 | 기상청 단기예보 API |
| DB | Supabase (코스 저장/공유) |
| 지도 | Kakao Maps SDK |
| Deployment | Vercel (예정) |

## 핵심 기능
1. **AI 코스 생성**: 위치+취향+동반자+기분 → Gemini AI가 최적 코스 설계
2. **TourAPI 연동**: 관광지/음식점/축제/숙박 등 실시간 공공데이터 활용
3. **날씨 반영**: 기상청 API로 주말 날씨 확인, AI가 날씨 고려한 코스 추천
4. **축제 통합**: 주변 진행 중 축제를 코스에 자동 반영
5. **1박2일 코스**: 숙박 연동, 일차별 코스 분리
6. **감정 기반 추천**: 피곤함/에너지/로맨틱/힐링/모험/맛집 6가지 기분 반영
7. **동반자 맞춤**: solo/couple/family/friends별 편의시설(유모차/키즈/주차) 반영
8. **카카오맵 연동**: 코스 지도 표시, 내비게이션 연결, 카카오톡 공유
9. **코스 저장/공유**: Supabase에 저장, 고유 URL로 공유

## 환경변수
```
TOUR_API_KEY=         # 한국관광공사 TourAPI 인증키
WEATHER_API_KEY=      # 기상청 단기예보 API 인증키
GEMINI_API_KEY=       # Google Gemini API 키
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_KAKAO_JS_KEY=  # Kakao JavaScript 앱 키

# 운영 파라미터 (없으면 기본값. 상세: docs/2026-08-31-실서비스-과금-저장-공유-설계.md)
COURSE_DAILY_LIMIT_PER_CLIENT=20   # 한 사람당 하루 코스 생성 수
COURSE_DAILY_LIMIT_GLOBAL=500      # 서비스 전체 하루 상한 = 하루 최대 지출
USAGE_HASH_SALT=                   # IP 해시 솔트. 운영에선 지정 권장
COURSE_TTL_DAYS=30                 # 공유·저장 안 한 코스의 보관 기간
COMMUNITY_FRESH_DAYS=45            # 커뮤니티 추천 후보로 남는 신선도(일). 재검증 대신 쓰는 필터
NEXT_PUBLIC_AUTH_ENABLED=          # 로그인 스위치. OAuth 공급자 설정 후에만 true
NEXT_PUBLIC_AUTH_PROVIDER=         # kakao(기본) | google. 카카오가 KOE205로 막히면 google 로 우회
```

## 파일 구조 (Phase 1·2·3 재디자인 반영)
```
app/
  layout.tsx                        — 루트 레이아웃 (GlobalHeader, BottomTabBar, LocationProvider, {modal} slot, KakaoSDK)
  page.tsx                          — / (Home — 매거진 레이아웃)
  globals.css                       — 토큰(@theme inline) + 폰트 + shimmer/fadeIn 키프레임
  (pages)/
    course/page.tsx                 — /course (Wizard 마운트)
    course/[slug]/page.tsx          — /course/:slug (CourseResultShell, 커뮤니티 코스 상세도 재사용)
    festival/page.tsx               — /festival (FestivalPageShell)
    community/page.tsx              — /community (CommunityPageShell — 커뮤니티 코스 목록)
  spot/[contentId]/page.tsx         — /spot/:id 전용 페이지 (server, generateMetadata OG)
  @modal/
    default.tsx                     — Parallel Route 빈 slot
    (.)spot/[contentId]/page.tsx    — 인터셉트된 모달 (client)
  api/
    home/route.ts                   — GET 홈 데이터 (날씨+축제+추천)
    course/route.ts                 — POST AI 코스 생성 (429 에 커뮤니티 suggestions 곁들임)
    course/[slug]/route.ts          — GET 저장된 코스(isPublic 포함) · PATCH 편집
    course/[slug]/public/route.ts   — POST 커뮤니티 추천 opt-in 토글 (edit_token 인증)
    course/community/route.ts       — GET 커뮤니티 코스 목록 (신선도+공개 필터, 재검증 없음)
    spot/route.ts                   — GET 장소 상세
    spot/images/route.ts            — GET 장소 이미지
    festival/route.ts               — GET 축제 목록
    search/route.ts                 — GET 검색
  components/
    ui/                             — Phase 1 프리미티브 (Button, Card, Badge, Container, SectionHeader)
    nav/                            — GlobalHeader, BottomTabBar, LocationContext/Selector/Modal, GlobalSearchBar
    home/                           — HomeView, HomeHeroLanding(히어로 랜딩), FestivalTabInvite/CommunityInvite(탭·목록 유도)
    course/
      wizard/                       — WizardShell, Stepper, ProgressBar, Nav
        steps/                      — StepWhereMood, StepEnergy, StepWhenWho, StepTaste (4스텝)
      loading/                      — CourseLoading, SkeletonStopCard
      result/                       — CourseResultShell, Summary, DayTabs, Timeline, StopCard, CourseTip, SaveShareBar(공개 토글 포함), CourseMapPane
    festival/                       — FestivalPageShell, Header, FilterBar, Radius, RegionFilter, Grid, Card, Skeleton, Empty
    community/                      — CommunityPageShell, Header, SortTabs, Grid, Card, Empty (festival 패턴 본뜸, FestivalSkeleton 재사용)
    spot/                           — SpotDetail, SpotDetailSkeleton, SpotDetailModalFrame, SpotPageBackButton
    SpotCard.tsx                    — Home 관광지 카드
    FacilityBadges.tsx              — 편의시설 뱃지 (Lucide + size API)
    ImageGallery.tsx                — 가로 스크롤 갤러리 (next/image)
    SearchBar.tsx                   — Home 검색 입력
    KakaoSDK.tsx                    — Kakao SDK 로더
lib/
  weekend-types.ts                  — 공용 타입 정의
  weekend-ai.ts                     — Gemini 코스 생성 엔진
  tour-api.ts                       — TourAPI 4.0 클라이언트
  weather-api.ts                    — 기상청 API 클라이언트
  course-role.ts                    — stop role 매핑 (contentTypeId → spot/food/cafe/festival/stay)
  course-community.ts               — 커뮤니티 코스 목록·opt-in (재검증 없음, 신선도 필터만)
  weekend-summary.ts                — 홈 히어로의 「한 줄」들 (날씨·기운·주말 날짜)
  random-pick.ts                    — 랜덤 뽑기(도시·기분). rng 주입으로 테스트 가능
  loading-messages.ts               — 코스 생성 대기 멘트 15종 + 셔플
  wizard-steps.ts                   — 스텝 진행 조건(canProceedAtStep) · DestinationPick
  hero-copy.ts · hero-image.ts      — 계절 판정 + Hero 이미지 선택
  use-course-generation.ts          — Wizard → AI 호출 + 로딩 메시지 훅 + errorSuggestions(429)
  use-active-stop.ts                — Timeline ↔ Map 연동 상태
  use-home-data.ts                  — Home 데이터 fetch
  supabase/
    server.ts · client.ts · admin.ts
docs/
  superpowers/specs/                — Phase 1·2·3 spec 문서
  superpowers/plans/                — Phase 1·2·3 plan 문서
  weekend-app-design.md · weekend-ai-engine-design.md · weekend-deploy-checklist.md
```

## TourAPI 활용 현황 — **OpenAPI 2종 · 오퍼레이션 12개**

> 🔴 **서류에는 「12개」로 적는다.** 2026-08-18 무장애 활용신청이 승인되어 상품이 2종이 됐다.
> 「11개」로 적으면 **과소 신고**이고, 데이터 활용 배점(20점)에서 손해다.
| API | 용도 |
|-----|------|
| searchFestival2 | 주변 축제 검색 |
| locationBasedList2 | 위치 기반 관광지/음식점/숙박 검색 |
| areaBasedList2 | 지역 기반 관광지 검색 |
| detailCommon2 | 장소 공통 상세정보 |
| detailIntro2 | 소개 상세정보 (운영시간, 편의시설) |
| detailImage2 | 이미지 목록 |
| detailInfo2 | 반복 정보 (코스, 객실 등) |
| searchKeyword2 | 키워드 검색 |
| searchStay2 | 숙박 검색 |
| areaCode2 | 지역 코드 조회 |
| categoryCode2 | 분류 코드 조회 |

**별도 API 상품** (상품ID 15101897, 서비스ID `KorWithService2`)

| API | 용도 |
|-----|------|
| detailWithTour2 | 무장애 여행 정보 — 휠체어·시각·청각·영유아 4그룹 29개 필드 |

## 콘텐츠 타입 ID
| ID | 분류 |
|----|------|
| 12 | 관광지 |
| 14 | 문화시설 |
| 15 | 행사/축제 |
| 28 | 레포츠 |
| 32 | 숙박 |
| 39 | 음식점 |

## AI 엔진 핵심 로직 (`lib/weekend-ai.ts`)
1. **후보 수집**: TourAPI로 위치/지역 기반 관광지 후보 수집
2. **사전 스코어링**: 역할(관광지/맛집/카페/문화/액티비티)별 + 취향 + 감정 + 편의시설 + 날씨 가중치 점수 계산
3. **편의시설 보강**: detailIntro에서 유모차/반려동물/키즈/주차/운영시간 정보 추출
4. **AI 코스 생성**: Gemini에 스코어링된 후보 + 조건 + 날씨를 전달, JSON 코스 생성
5. **검증**: contentId 유효성, 시간순서, 동선 거리 검증 → 실패 시 폴백 코스 자동 생성

## 개발 규칙
- `.env` 파일 절대 커밋 금지
- API 키는 모두 서버사이드에서만 사용 (NEXT_PUBLIC_ 접두사 사용 주의)
- 모바일 퍼스트 디자인 (max-w-lg 기준)
- CookieRun 폰트 (제목), Pretendard 폰트 (본문)
- 테마 색상: 배경 #FFF8F0, 액센트 orange-400~500

## 공모전 정보 (2026-08-10 갱신)
- 대회: 2026 관광데이터 활용 공모전 (한국관광공사) — **웹·앱 개발 부문**, 예비심사 **합격**
- **1차 심사자료 접수: 2026-08-10 ~ 09-21 16:00 정각** — ✅ **2026-09-21 13시경 제출 완료**(마감 전까지는 수정 가능)
- 제출처: 한국관광 콘텐츠랩 `api.visitkorea.or.kr` → 공모전 접수확인
- 1차 배점: 기획력 30 + 완성도 30 + 데이터 활용 20 + 발전성 20 (가점: Start-up NEST·지역특화 각 +2)
- 필수: 공사 **OpenAPI 형태만 인정**(파일 데이터 불가) · 개발 완료된 완성 서비스
- 제출 필수 = **인증키(인코딩·디코딩)** / 운영계정 신청은 **선택**
- 🔴 **인증키로 「개발 기간 내 호출건수」를 검증**한다 → 캐시로 때우면 이력이 안 남는다
- 출처 표기: `출처: ⓒ한국관광공사` (**`TourAPI` 단독 표기 지양**, 로고 불가·텍스트만)
- 상세: 옵시디언 위키 `프로젝트-이모추`

## 🔁 Loops
- 🔖 **하네스 작업을 이어받는다면 `docs/2026-08-13-하네스-작업-인수인계.md` 부터 읽어라** — 남은 일·순서·되풀이하지 말 것이 거기 있다
- **먼저 해당 Loop 의 `PROGRESS.md` 를 읽어라.** 상태·다음 할 일·`Do Not Repeat` 이 거기 있다
- `loops/tourapi-watch/` — KorService2 **11개 오퍼레이션** 실호출 감시 + 폐기 예정 API 경보 (`node loops/tourapi-watch/smoke.mjs`)
  - 무장애(`KorWithService2`)는 이 루프가 아니라 `submission-check` 의 `barrier-free` 항목이 본다
- `loops/release-green/` — test·lint·build 배포 가능 상태 (`node loops/release-green/gate.mjs`)
- `loops/submission-check/` — 1차 제출 항목 9종 (`node loops/submission-check/check.mjs`)
- 공통: 스크립트가 **검사 단일 경유점**. 권한 **사다리 1단계**(읽기+리포트). 소스 수정·commit·push 금지
- ⚠️ **권한 정책 (2026-08-13)**: `.claude/settings.json` 에서 `git commit`·`git push` 는 **deny 가 아니라 ask** 다. 예전엔 deny 라 레포의 **모든** 세션이 막혔다(Loop 세션만이 아니다). 이제 실행은 되지만 **매번 사람 승인**을 거친다 — 🔴 특히 `git push` 는 **Vercel 배포를 트리거**하므로 프롬프트를 습관적으로 넘기지 말 것. Loop 의 commit·push 금지는 각 `LOOP_INSTRUCTIONS.md` 의 Safety Rules 가 지킨다 — 도구가 대신 막아주지 않는다
