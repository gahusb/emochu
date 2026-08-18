# TourAPI 무장애(barrier-free) 정보 오퍼레이션 조사 결과

- 조사일: 2026-07-31
- 조사자: Task 8 (actionable-course 계획, discovery only — 코드 확정 아님)
- 조사 스크립트: `scripts/probe-barrier-free.mjs`
- 사용 키: `.env.local`의 `TOUR_API_KEY` (기존 11개 오퍼레이션에 이미 사용 중인 키, 값은 본 문서에 기록하지 않음)

## ✅ 2026-08-18 갱신 — 활용신청 승인 후 실호출 성공

아래 「판정: 중단」은 **2026-07-31 시점의 기록**이다. 박재오가 상품ID 15101897 활용신청을 완료해 **403 → 200** 으로 바뀌었다. 확정된 사실은 다음과 같다.

### 확정: 엔드포인트

- 서비스ID: **`KorWithService2`** (7월 추정이 맞았다)
- 오퍼레이션: **`detailWithTour2`**
- 파라미터: `serviceKey` · `contentId` · `MobileOS` · `MobileApp` · `_type` — `KorService2` 와 동일
- 🔴 **contentId 체계가 `KorService2` 와 같다.** 경복궁 `126508`, 국립중앙박물관 `129703` 이 그대로 조회됐다 → **교차 대조 가능**(설계 게이트 통과)

### 확정: 응답 필드 29개 — 4개가 아니었다

`contentTypeId` 와 **무관하게 동일한 스키마**다(관광지 12·문화시설 14 확인). 값은 boolean 이 아니라 **자유 텍스트**이며, 정보가 없으면 **빈 문자열**이다.

| 그룹 | 필드 |
|---|---|
| 지체(휠체어) | `parking` `wheelchair` `exit` `elevator` `restroom` `auditorium` `room` `handicapetc` `route` |
| 시각 | `braileblock` `audioguide` `bigprint` `brailepromotion` `guidesystem` `blindhandicapetc` `guidehuman` |
| 청각 | `signguide` `videoguide` `hearingroom` `hearinghandicapetc` |
| 영유아 | `stroller` `lactationroom` `babysparechair` `infantsfamilyetc` |
| 기타 | `contentid` `publictransport` `ticketoffice` `promotion` |

관측된 실제 값 (경복궁 `126508`):

```
parking   : "장애인 주차장 있음(광화문 우측 옥외 주차장에 9개)_무장애 편의시설"
wheelchair: "대여가능"
exit      : "주출입구는 경사로가 있어 휠체어 접근 가능함"
restroom  : "장애인 화장실 있음"
audioguide: "음성안내 가이드 있음(티켓박스에서 음성안내기기와 PDA 대여가능)"
stroller  : "대여가능"
```

### 🔴 함정 — `wheelchair` 는 "접근 가능"이 아니라 "대여 가능"이다

경복궁의 `wheelchair` 값은 `"대여가능"` 이고, **실제 휠체어 접근성은 `exit`("주출입구는 경사로가 있어 휠체어 접근 가능함")과 `route`("경사로 이용 가능")에 있다.** 필드 이름만 보고 `wheelchair` 를 접근성 판정에 쓰면 **휠체어를 빌려주는 곳**과 **휠체어로 갈 수 있는 곳**을 혼동한다.

커버리지 측정에서도 `wheelchair` 는 관광지 10곳 중 1곳에만 있었던 반면 `route`·`exit` 은 모든 타입에서 상위였다.

### 무장애 정보가 없는 콘텐츠의 응답 형태

**`items` 자체가 없다.** HTTP 200 + `resultCode 0000 OK` 이면서 본문에 항목이 없는 형태다(음식점 `1947036` 에서 관측).

> ⚠️ 이건 `loops/tourapi-watch/PROGRESS.md` 의 `Do Not Repeat` 이 경고한 **"200 + 0000 + 항목 0"** 과 같은 모양이다. 다만 여기서는 **폐기 신호가 아니라 정상적인 "데이터 없음"** 이다 — 무장애 정보는 전수 조사된 것이 아니라서 없는 콘텐츠가 정상적으로 존재한다.

### 커버리지 실측 (2026-08-18, 서울 종로 반경 5km, 타입별 10건 표본)

| 타입 | 조회 | 정보 있음 | 커버리지 |
|---|---|---|---|
| 문화시설 | 10 | 8 | **80%** |
| 숙박 | 10 | 5 | 50% |
| 관광지 | 10 | 4 | 40% |
| 음식점 | 10 | 4 | 40% |
| 레포츠 | 9 | 3 | 33% |

**평균 약 48%.** 이 숫자가 설계 판단 하나를 검증한다 — 무장애 정보가 없는 장소를 후보에서 **제외하지 않기로** 한 결정(`docs/superpowers/specs/2026-08-18-barrier-free-accessibility-design.md` 6.2)이 옳았다. 제외했다면 후보의 절반이 사라져 코스 구성이 자주 실패했을 것이다.

재현: 측정 스크립트는 일회성이라 저장하지 않았다. `locationBasedList2` 로 타입별 10건을 뽑아 각 `contentId` 를 `detailWithTour2` 로 조회하고, `contentid` 를 제외한 필드 중 비어 있지 않은 것이 하나라도 있으면 "정보 있음"으로 셌다.

---

## 판정: 중단 *(2026-07-31 시점 — 위 갱신으로 해소됨)*

**결론부터: Task 9(무장애 정보 엔드포인트 추가)는 스킵한다.** 이유는 "오퍼레이션이 존재하지 않아서"가 아니라 **"존재하는 것으로 보이지만 현재 `TOUR_API_KEY`로는 접근 권한이 없어서(HTTP 403 Forbidden)"**다. 별도의 공공데이터포털 활용신청(승인) 없이는 실호출이 불가능하다는 것이 실제 응답으로 확인됐다.

M1+M2로 이미 완결된 상태이므로 이 기능 없이 계획을 종료해도 문제없다 (task-8-brief.md 기준).

---

## 조사 과정 요약

### 1차 시도 — 브리프의 기본 가설 (실패)

브리프가 제안한 후보 `detailWithTour2`, `detailWithTour`를 `KorService2`(이 프로젝트가 이미 쓰고 있는 서비스, `lib/tour-api.ts`의 `BASE_URL`)에 대해 호출:

```
GET https://apis.data.go.kr/B551011/KorService2/detailWithTour2?...
GET https://apis.data.go.kr/B551011/KorService2/detailWithTour?...
```

→ 둘 다 **HTTP 404, 본문 `API not found`**. `KorService2`에는 이런 이름의 오퍼레이션이 없다.

### 2차 조사 — 웹 검색으로 실제 서비스 식별

공공데이터포털을 검색한 결과, "무장애 정보"는 `KorService2`(국문 관광정보서비스_GW, 상품ID 15101578)의 일부가 **아니라**, 완전히 별도의 상품으로 등록돼 있음을 확인:

- 상품명: **한국관광공사_무장애 여행 정보_GW**
- 상품ID: **15101897**
- URL: https://www.data.go.kr/data/15101897/openapi.do
- 설명: 장애인·어르신·영유아 동반 여행자를 위한 무장애 관광정보 제공 서비스
- 개발단계 활용신청: 자동승인이라는 언급은 있었으나, **이 프로젝트의 `TOUR_API_KEY`가 이 상품에 대해 활용신청·승인된 상태인지는 별개 문제**임이 실호출로 드러남 (아래 참조).

즉 이 API는 `KorService2`의 12번째 오퍼레이션이 아니라, **완전히 다른 서비스ID를 쓰는 별개 API 상품**이다.

### 3차 조사 — 서비스ID 후보 실호출 (핵심 발견)

기존 `KorService2`가 `...2` 접미사 오퍼레이션 명명 규칙(GW 버전)을 쓰는 것과 동일한 관례를 적용해 서비스ID 후보 2개(`KorWithService1`, `KorWithService2`)와 오퍼레이션 접미사 후보(`1`, `2`, 접미사 없음)를 전수 조합해 호출했다. 대조군으로 이미 작동이 확인된 `KorService2/areaCode2`(정상 키/정상 상품), 잘못된 키, 완전히 존재하지 않는 상품명도 함께 호출해 HTTP 상태코드의 의미를 구분했다.

| 호출 대상 | 예시 | HTTP | 본문 | 해석 |
|---|---|---|---|---|
| `KorService2` + 정상 오퍼레이션 + 정상 키 | `areaCode2` | **200** | 정상 JSON | 대조군 — 정상 동작 확인 |
| `KorService2` + 존재하지 않는 오퍼레이션 | `detailWithTour2/1` 등 | **404** | `API not found` | 상품은 맞지만 그런 오퍼레이션이 없음 |
| `KorService2` + 정상 오퍼레이션 + **잘못된 키** | `areaCode2` (bad key) | **401** | `Unauthorized` | 대조군 — 키 자체가 틀렸을 때의 시그니처 |
| 완전히 존재하지 않는 상품명 + 정상 키 | `TotallyBogusService9/areaCode1` | **500** | `Unexpected errors` | 대조군 — 라우팅 자체가 안 되는 상품의 시그니처 |
| `KorWithService1` + 모든 오퍼레이션 후보 | `detailWithTour(1/2/없음)`, `areaCode1`, `areaCode2` | **500** | `Unexpected errors` | 완전 가짜 상품과 동일한 시그니처 → 이 서비스ID 자체가 게이트웨이에 라우팅되지 않음 (오퍼레이션명 문제가 아니라 서비스ID 자체가 틀렸을 가능성) |
| `KorWithService2` + `1` 접미사/무접미사 오퍼레이션 | `detailWithTour`, `detailWithTour1`, `areaCode1` | **404** | `API not found` | 상품은 라우팅되지만 이 오퍼레이션명 형태는 없음 |
| `KorWithService2` + **`2` 접미사 오퍼레이션** | `detailWithTour2`, `areaCode2` | **403** | `Forbidden` | **상품과 오퍼레이션명 패턴이 실제로 존재함(게이트웨이가 인식) + 키는 유효한 형식이지만 이 상품에 대한 권한이 없음** |

**결론**: `KorWithService2`가 실제 서비스ID이고, `KorService2`와 동일하게 `...2` 접미사 명명 규칙을 쓰는 것으로 보인다 (`detailWithTour2`, `areaCode2` 모두 이 패턴에서만 404가 아닌 403을 반환). 그러나 **403 Forbidden**은 401(잘못된 키)이나 404(존재하지 않는 라우트)와 명확히 다른 세 번째 시그니처로, "라우트는 존재하지만 이 키/계정은 이 상품에 대한 활용신청·승인이 없다"는 뜻으로 해석하는 것이 가장 합리적이다.

이 403 패턴은 아래 3개 contentId 전부에서 **동일하게, contentId와 무관하게** 재현됐다 — 즉 콘텐츠 조회 이전 단계(인가 단계)에서 이미 거부되고 있다는 뜻이다.

---

## 오퍼레이션명 — 확정 불가

- **확정된 오퍼레이션명 없음.** `detailWithTour2`가 가장 유력한 후보(패턴상 `KorWithService2`에서 유일하게 403을 반환하는 detail류 오퍼레이션)이지만, 실제 응답 필드를 단 하나도 받지 못했으므로 이것이 정확한 오퍼레이션명인지, 파라미터가 맞는지조차 검증할 수 없다.
- 콘텐츠랩 API 명세 사이트(https://api.visitkorea.or.kr/)는 이번 조사에서 직접 열람하지 못했다 (WebFetch/WebSearch로는 Swagger 상세 스펙까지 도달하지 못함). 실제 오퍼레이션명·파라미터를 확정하려면 사람이 직접 그 사이트 또는 공공데이터포털의 Swagger UI에 로그인해 확인해야 한다.

## 파라미터 — 확인 불가

권한이 없어 실제 응답을 받지 못했으므로 필수/선택 파라미터를 확인할 수 없다. `contentId`, `MobileOS`, `MobileApp`, `_type`, `serviceKey`를 다른 오퍼레이션과 동일하게 시도했으나, 403은 이 파라미터들을 검증하는 단계 이전에 발생하는 것으로 보인다 (파라미터를 바꿔도 결과가 달라지지 않음을 확인함 — contentId 3종 모두 동일한 403).

## 응답 필드 — 확인 불가

**단 하나의 실제 응답 필드도 받지 못했다.** `wheelchair`, `parking`, `braileblock`, `helpdog` 등 브리프에 예시로 언급된 필드명은 **추측이며 실제로 관찰한 바 없다.** 이 문서에는 기록하지 않는다 (추측 금지 원칙).

## 무장애 정보 없는 콘텐츠의 응답 형태 — 확인 불가

동일한 이유로 확인 불가. "빈 items"인지 "필드가 빈 문자열"인지는 실제 200 응답을 받아야만 알 수 있는데, 세 콘텐츠 모두 403에서 막혔다.

---

## 테스트한 contentId 목록과 결과

기존에 이미 작동 중인 `KorService2/searchKeyword2`, `locationBasedList2`(대조군 확인용으로만 사용, 애플리케이션 코드는 건드리지 않음)로 서로 다른 contentTypeId의 실제 contentId 3개를 확보해 테스트했다.

| contentId | title | contentTypeId | 분류 | `KorWithService2/detailWithTour2` 결과 |
|---|---|---|---|---|
| `126508` | 경복궁 | 12 | 관광지 | HTTP 403 `Forbidden` |
| `129703` | 국립중앙박물관 | 14 | 문화시설 | HTTP 403 `Forbidden` |
| `1947036` | 스미스가 좋아하는 한옥 | 39 | 음식점 | HTTP 403 `Forbidden` |

세 contentId 모두 **동일한 403**을 반환했다. 브리프가 제안한 기본값 `126508`(경복궁)은 실제로 존재하는 유효한 contentId임을 `searchKeyword2`로 재확인했다 (`contenttypeid=12`, title=경복궁 일치).

---

## 판정 근거 정리

브리프의 판정 기준:

- **진행**: 오퍼레이션이 200을 반환하고 무장애 관련 필드가 존재 → **해당 없음. 단 한 번도 200을 받지 못함.**
- **중단**: 오퍼레이션이 존재하지 않거나 별도 인증키·별도 서비스 등록이 필요 → **이 케이스에 해당.** `KorWithService2`라는 별도 서비스ID(별도 공공데이터포털 상품, ID 15101897)가 존재하고 오퍼레이션 라우트 자체는 살아있는 것으로 보이지만(403 ≠ 404), 이 프로젝트의 `TOUR_API_KEY`는 그 상품에 대한 활용신청/승인이 되어 있지 않아 접근이 거부된다.

**판정: 중단.**

Task 9(무장애 정보 12번째 엔드포인트 추가)는 스킵한다. 계획은 M1+M2로 이미 완결된 상태이며, 이 기능은 애초에 선택 사항이었다.

### 향후 재개 조건 (참고용, 이번 태스크의 범위 밖)

이 기능을 나중에 다시 시도하려면:
1. 공공데이터포털(data.go.kr)에서 "한국관광공사_무장애 여행 정보_GW"(상품ID 15101897) 활용신청 후 승인 대기
2. 승인된 키로 `KorWithService2/detailWithTour2`(또는 콘텐츠랩 공식 명세에서 확인한 정확한 오퍼레이션명)를 다시 호출해 실제 응답 필드 확인
3. 그 결과로 이 문서를 갱신한 뒤에만 Task 9를 시작

---

## 재현 방법

```bash
set -a && . ./.env.local && set +a
node scripts/probe-barrier-free.mjs 126508
node scripts/probe-barrier-free.mjs 129703
node scripts/probe-barrier-free.mjs 1947036
```

스크립트는 `KorService2`(대조군 3종: 정상 호출/잘못된 오퍼레이션/잘못된 키)와 `KorWithService1`, `KorWithService2`(각각 오퍼레이션 접미사 후보 5종) 전체 조합, 그리고 완전 가짜 상품명 대조군까지 자동으로 호출하고 HTTP 상태코드 + 본문을 출력한다.

## 관측된 원본 로그 (요약, 키는 제외)

```
[KorService2] areaCode2                        → HTTP 200  (정상, 대조군)
[KorService2] detailWithTour / detailWithTour2  → HTTP 404  API not found
[KorService2] + 잘못된 키                        → HTTP 401  Unauthorized
[KorWithService1] 모든 후보 오퍼레이션            → HTTP 500  Unexpected errors (가짜 상품명과 동일 시그니처)
[KorWithService2] detailWithTour / detailWithTour1 / areaCode1 → HTTP 404  API not found
[KorWithService2] detailWithTour2 / areaCode2   → HTTP 403  Forbidden  (contentId 3종 전부 동일)
완전 가짜 상품명 + 정상 키                        → HTTP 500  Unexpected errors
```
