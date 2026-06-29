# TODO — TourAPI 실시간 호출 규정 준수 (공모전 심사 대비)

> ✅ **2026-06-29 해결 완료**: 🔴 항목 모두 처리됨 (`lib/tour-api.ts`·`app/api/spot/route.ts` `revalidate:60`, 로컬 사전적재 없음, 빌드 검증 통과). 통합 계획·현황은 **`docs/2026-06-29-실행계획-마스터.md`** 참조. (아래 본문은 6/9 점검 기록 — 보존용)
>
> 작성: 2026-06-09 / 근거: 2026 관광데이터 활용 공모전 웹·앱 개발 부문 공식 공지(FAQ).
> **이 작업은 emochu 세션에서 수행한다.** (위키 세션은 점검·기록만 담당 — 코드 미수정)
> 점검 출처: 위키 `프로젝트-이모추.md` / `raw/2026-06-08-관광데이터공모전-웹앱개발-공통안내-노션.md`

## 배경 (규정)

- 한국관광공사 OpenAPI는 **로컬 DB 저장/캐싱이 아닌 실시간 호출 방식 강력 권고**.
- 1차 심사 자료 제출 시 **운영계정 신청정보(신청자명·인증키)** 제출 → **실제 API 호출 내역을 검증**.
- **개발 기간 내 호출 이력이 확인되지 않으면 심사 불이익.** 부득이 캐싱 시 별도 신청서(tourapi@knto.or.kr).

## 점검 결과 (2026-06-09, 정적 분석)

| 우선 | 위치 | 현재 | 문제 |
|---|---|---|---|
| 🔴 | `lib/tour-api.ts:34` (`callTourApi`) | `fetch(url, { next: { revalidate: 3600 } })` | **모든 TourAPI 호출이 1시간 캐싱.** 같은 URL은 1시간 실호출 안 함 → 호출 이력 미확보 위험 (단일 경유점이라 여기 하나가 전역 적용) |
| 🟡 | `app/api/spot/route.ts:9` | `export const revalidate = 3600` | spot 상세 라우트 1시간 ISR 캐싱 |
| 🟢 | `app/api/course/route.ts:588` (`wk_courses` insert, `course_data`) | 생성 코스 스냅샷 저장 | 정당한 저장·공유 기능. 생성 시 실호출됨 → 위험 낮음. (조치 선택) |

> 참고: 이모추는 위치 좌표가 파라미터(`locationBasedList` 등)라 캐시 미스가 잦지만, `areaBasedList`·`searchFestival`처럼 고정 파라미터 호출은 캐시 히트율이 높아 위험 구간.

## 작업 지시 (3단 조건)

### 🔴 [완료 조건]
- `lib/tour-api.ts:34` 의 `next: { revalidate: 3600 }` 를 **`revalidate: 60`(권장 절충) 또는 `cache: 'no-store'`(완전 실시간)** 로 변경.
- `app/api/spot/route.ts:9` 의 `revalidate = 3600` 를 **`60` 으로 축소** 또는 `export const dynamic = 'force-dynamic'`.
- (선택 🟢) 공유 코스 조회 `/api/course/[slug]` 에서 `contentId`로 핵심 정보 재호출해 방어력 보강 — 여력 있을 때만.
- 변경 후 실제로 호출 이력이 남는지 확인(개발 중 트래픽 발생).

### 🚫 [금지 조건]
- `wk_courses` 의 코스 저장·공유 기능 자체를 제거하지 말 것(정당한 제품 기능, 위험 낮음).
- TourAPI를 **사전 적재(prefetch)해 로컬 DB로 서빙**하는 구조를 새로 만들지 말 것.
- `no-store` 채택 시 rate limit/응답속도 영향을 무시하지 말 것 — 60초 절충 우선 검토.

### ✅ [검증 조건]
- `lib/tour-api.ts` / `app/api/spot/route.ts` 에서 `revalidate: 3600` 잔존 없음(`grep -rn "revalidate" lib app/api`).
- 운영계정 호출 통계(또는 로그)에서 개발/심사 기간 **실호출 이력이 충분히 누적**되는지 확인.
- 캐싱을 일부 유지하기로 했다면(60초) 그 사유를 1차 제출 기능설명서/별도 신청서에 기재 가능하게 메모.

## 트레이드오프 메모
- `no-store` = 규정상 가장 안전, 성능·rate limit 부담 ↑.
- `revalidate: 60` = 호출 이력 충분히 남으면서 성능 유지 — **권장 기본값**.
- 위키 Phase 8 "TourAPI 클라이언트 캐싱 LRU"는 **보류**(규정 충돌). 심사 종료 후 재검토.
