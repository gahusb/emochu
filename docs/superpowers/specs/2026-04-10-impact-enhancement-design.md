# 이모추! 임팩트 강화 설계 스펙

> 작성일: 2026-04-10
> 마감: 2026-05-06 (공모전 제출)
> 접근 방식: 화면별 순차 개선 (Phase 0~4)

## 목표

현재 기능적으로 동작하는 앱을 공모전에서 임팩트 있게 보이도록 전면 강화한다.

| 우선순위 | 영역 | 핵심 |
|---------|------|------|
| 1순위 | UX/디자인 | 전체 화면 톤 업, 애니메이션/인터랙션 강화 |
| 2순위 | AI 차별화 | 축제 AI 요약, 장소별 추천 이유, 코스 내레이션, 나들이 운세 |
| 3순위 | 데이터 활용 | 다중 이미지, 편의시설 뱃지, 키워드 검색, 1박2일, 세부 카테고리 |

디자인 톤: 현재 오렌지/핑크 그라데이션 + CookieRun 폰트 유지, 퀄리티 업.

---

## Phase 0: 공통 인프라

Phase 1~4에서 공통으로 사용하는 기반을 먼저 구축한다.

### 0-1. Favicon + OG 메타태그

- **Favicon**: 🧳 이모지 기반 SVG favicon. `app/layout.tsx` 메타데이터에 추가.
- **OG 메타태그**: 카카오톡/SNS 공유 시 미리보기 이미지+제목+설명 표시.
  - 홈: "이모추! AI 주말 나들이 코스 플래너" + 대표 이미지
  - 코스 결과(`/course/[slug]`): 코스 제목 + 첫 번째 장소 이미지를 동적 OG로 생성
- **파일**: `app/layout.tsx` 메타데이터 수정, `public/` 에 favicon 파일 추가

### 0-2. 다중 이미지 API

- **엔드포인트**: `GET /api/spot/images?contentId=xxx`
- **로직**: `detailImage2` API 호출 → 최대 10장 이미지 URL 배열 반환
- **응답 형태**: `{ images: string[] }`
- **파일**: `app/api/spot/images/route.ts` 신규, `lib/tour-api.ts`의 기존 `detailImage()` 활용

### 0-3. AI 요약 유틸

Gemini를 활용한 텍스트 요약/생성 유틸리티 함수들.

#### `generateSpotWhyNow(spot, weather, season): string`
- 입력: 장소 정보(title, cat2, overview) + 현재 날씨 + 계절
- 출력: "4월 벚꽃이 만개한 산책로, 오늘 같은 맑은 날 딱이에요" 같은 한 줄
- 모델: gemini-2.5-flash-lite (빠르고 저렴)
- 실패 시: 빈 문자열 반환 (UI에서 미표시)

#### `generateFestivalSummary(festival): string`
- 입력: 축제 overview (TourAPI의 긴 텍스트)
- 출력: 30자 이내 한 줄 요약 + "왜 지금 가야 하는지"
- 모델: gemini-2.5-flash-lite
- 실패 시: overview 앞 50자 잘라서 사용

#### `generateCourseFortuneMessage(course, weather, feeling): string`
- 입력: 생성된 코스 데이터 + 날씨 + 사용자 감정
- 출력: "오늘의 나들이 운세" 감성 한마디 (50자 이내)
- 모델: gemini-2.5-flash-lite
- 코스 생성 직후 1회 호출

- **파일**: `lib/weekend-ai.ts`에 함수 추가
- **호출 시점**: 홈 API(`/api/home`)에서 축제/장소 데이터 반환 시 병렬 호출, 코스 API(`/api/course`)에서 코스 생성 후 호출

### 0-4. 편의시설 파싱 & 아이콘 뱃지 컴포넌트

- **파싱 강화**: `lib/tour-api.ts`에서 `detailIntro2` 응답 파싱 확장
  - 주차(parking), 유모차(babyCarriage), 키즈(kidsFacility), 반려동물(pet), 운영시간(operatingHours)
  - 이미 `enrichWithFacilities()`에 일부 구현됨 → 홈/축제 페이지에서도 사용 가능하게 확장
- **공통 컴포넌트**: `app/components/FacilityBadges.tsx`
  - 입력: `{ parking?: boolean, babyCarriage?: boolean, kidsFacility?: boolean, pet?: boolean, operatingHours?: string }`
  - 출력: 아이콘+라벨 가로 배열 (🅿️ 주차 / 👶 유모차 / 🧒 키즈 / 🐾 펫 / ⏰ 09:00~18:00)
  - 컴팩트 모드 (아이콘만) / 풀 모드 (아이콘+텍스트) 지원

### 0-5. 이미지 스와이프 갤러리 컴포넌트

- **컴포넌트**: `app/components/ImageGallery.tsx`
- 입력: `images: string[]`, `alt: string`
- 터치 스와이프 + 인디케이터 도트
- 1장일 때는 일반 이미지로 렌더링
- 외부 라이브러리 없이 CSS scroll-snap 기반 구현

---

## Phase 1: 홈 화면 업그레이드

파일: `app/components/WeekendHome.tsx`, `app/api/home/route.ts`

### 1-1. 히어로 섹션 강화

**현재**: "이번 주말, 뭐하지?" 텍스트 + 정적 설명
**변경**:
- 날씨 연동 인사말: "이번 주말 서울은 ☀️ 맑음! 나들이 가기 딱 좋아요" (날씨 API 데이터 활용)
- 날씨 아이콘 애니메이션 (해: 회전, 구름: 떠다니기, 비: 낙하)
- 주말 D-day: "토요일까지 D-2" 뱃지
- 배경에 은은한 그라데이션 애니메이션

### 1-2. 키워드 검색바

**현재**: 없음
**추가**:
- 히어로 아래에 검색 입력 필드
- 인기 키워드 태그: "벚꽃", "야경", "맛집", "카페", "전시" (탭하면 바로 검색)
- `searchKeyword2` API 연동
- 검색 결과는 모달 또는 인라인으로 SpotCard 리스트 표시
- **API**: `GET /api/search?keyword=xxx&lat=&lng=&radius=20000`
- **파일**: `app/api/search/route.ts` 신규, `app/components/SearchBar.tsx` 신규

### 1-3. 축제 카드 강화

**현재**: 작은 카드에 제목+날짜+거리만
**변경**:
- AI 요약 한 줄 추가 (Phase 0-3의 `generateFestivalSummary` 결과)
- 이미지 비율 확대 (높이 증가)
- 긴급 뱃지("이번 주 마지막! 🔥") 펄스 애니메이션
- D-day 뱃지 추가 ("D-3", "오늘!")

### 1-4. 추천 장소 카드 강화

**현재**: 이미지 1장 + 제목 + 카테고리
**변경**:
- "지금 가면 좋은 이유" AI 한마디 표시 (Phase 0-3의 `generateSpotWhyNow`)
- 편의시설 아이콘 뱃지 (Phase 0-4의 `FacilityBadges` 컴팩트 모드)
- 이미지에 그라데이션 오버레이 + 카테고리 뱃지
- 탭 시 scale 피드백 애니메이션

### 1-5. 전체 인터랙션

- 섹션별 스크롤 페이드인 (Intersection Observer)
- 스켈레톤 로딩 (데이터 로드 전 뼈대 UI)
- 축제 가로 스크롤에 스크롤 힌트 표시 (첫 방문 시 좌우 화살표 깜빡임)

### 1-6. 홈 API 변경

`GET /api/home` 응답에 추가 필드:
- `festivals[].aiSummary`: AI 요약 문자열
- `recommended[].whyNow`: "지금 가면 좋은 이유" 문자열
- `recommended[].facilities`: 편의시설 객체
- AI 요약은 병렬 호출로 지연 최소화. 실패 시 빈 문자열.

---

## Phase 2: 코스 만들기 위저드

파일: `app/components/CourseWizard.tsx`, `app/api/course/route.ts`

### 2-1. 1박2일 옵션 활성화

**현재**: 시간 선택에 half_day / full_day / leisurely만 존재
**변경**:
- `overnight` 옵션 추가: "1박 2일 🌙" 카드
- overnight 선택 시 숙소 관련 안내 표시 ("AI가 숙소도 함께 추천해드려요")
- AI 엔진은 이미 overnight 지원 → 위저드 UI만 연결
- `searchStay2` API로 숙소 후보 검색 → AI에 전달 (기존 로직 활용)

### 2-2. 세부 카테고리 필터링

**현재**: 취향 6개 (nature/food/culture/cafe/activity/photo) 단일 레벨
**변경**:
- 메인 카테고리 선택 후 서브 카테고리 칩 표시
- 서브 카테고리 매핑 (cat2/cat3 활용):
  - 자연: 산/산책로, 해변/바다, 공원/정원, 호수/계곡
  - 음식: 한식, 양식, 일식, 카페/디저트, 분식/야시장
  - 문화: 박물관, 미술관, 공연장, 역사유적
  - 액티비티: 수상레포츠, 등산/트레킹, 테마파크, 체험활동
- 서브 카테고리는 선택 사항 (미선택 시 기존처럼 대분류 전체)
- `PREFERENCE_CAT_MAP` 확장하여 cat2/cat3 매핑 추가

### 2-3. 단계별 전환 애니메이션

**현재**: 단계 변경 시 즉시 전환
**변경**:
- 좌우 슬라이드 전환 (다음: 왼쪽→오른쪽, 이전: 오른쪽→왼쪽)
- 옵션 카드 선택 시 bounce + scale 피드백
- 프로그레스 바에 글로우 효과 + 단계 완료 시 체크 아이콘 애니메이션
- CSS `@keyframes` + `transition` 기반 (라이브러리 없음)

### 2-4. AI 생성 로딩 경험

**현재**: 스피너 + "AI가 코스를 만들고 있어요..." 단일 메시지
**변경**:
- 단계별 진행 메시지 (2초 간격 순환):
  1. "🔍 주변 관광지 검색 중..."
  2. "🍽️ 맛집 찾는 중..."
  3. "☕ 카페도 빠질 수 없죠..."
  4. "🎪 근처 축제 확인 중..."
  5. "🤖 AI가 최적 코스 설계 중..."
  6. "✨ 거의 다 됐어요!"
- 각 단계에 해당하는 이모지 애니메이션
- 프로그레스 바 (가짜지만 시각적 진행감)

---

## Phase 3: 코스 결과 화면

파일: `app/components/CourseResult.tsx`, `app/api/course/route.ts`, `lib/weekend-ai.ts`

### 3-1. 코스 내레이션 강화

**현재 Gemini 프롬프트**: description에 "왜 이 장소가 좋은지 2-3문장" 지시
**변경**: 프롬프트에 추가 지시:
- 각 장소 description을 친구가 추천하듯 감성적 톤으로 작성
- 이전 장소와의 연결 멘트 포함: "점심 든든하게 먹었으니 바로 옆 산책로에서 소화시키면 딱이에요 🚶"
- tip에 실용적 꿀팁: "주차는 뒷편 공영주차장이 무료예요"
- `lib/weekend-ai.ts`의 시스템 프롬프트 수정

### 3-2. 오늘의 나들이 운세

- 코스 결과 최상단에 감성 카드로 표시
- Phase 0-3의 `generateCourseFortuneMessage()` 결과
- 디자인: 그라데이션 배경 카드 + ✨ 아이콘 + 감성 텍스트
- 예: "오늘은 새로운 길을 걸어볼 운명이에요. 예상치 못한 맛집을 발견할지도! 🍀"
- **API 변경**: `/api/course` 응답에 `fortuneMessage: string` 필드 추가

### 3-3. 타임라인 디자인 리뉴얼

**현재**: 카드 나열 + 컬러 뱃지
**변경**:
- 세로 타임라인 라인 (왼쪽에 연결선)
- 원형 순서 마커 (1, 2, 3... 숫자 + 그라데이션)
- 장소 카드에 이미지 갤러리 (Phase 0-5 `ImageGallery`) — 다중 이미지 API 호출
- 편의시설 뱃지 (Phase 0-4 `FacilityBadges`)
- 장소 간 이동 표시: "🚗 차로 15분 (4.2km)" 구간 카드
- 카드 진입 시 fade-slide 애니메이션

### 3-4. 1박2일 코스 구분

- Day 1 / Day 2 구분 헤더 카드 (🌅 "첫째 날" / 🌄 "둘째 날")
- 숙소 카드 특별 디자인: 보라색 그라데이션 + 🏨 아이콘 + 체크인/체크아웃 시간
- Day 1→Day 2 사이에 일몰 구분선 + "편히 쉬고 내일 또 즐겨요 🌙" 메시지

### 3-5. 공유 강화

- 코스 결과 페이지의 OG 메타태그 동적 생성
  - `title`: 코스 제목
  - `description`: 코스 요약 + 장소 목록
  - `image`: 첫 번째 장소 이미지
- 카카오톡 공유 시 미리보기가 풍성하게 표시됨

---

## Phase 4: 축제 페이지

파일: `app/components/FestivalList.tsx`, `app/api/festival/route.ts`

### 4-1. 축제 카드 리디자인

**현재**: 작은 카드 + 기본 정보
**변경**:
- 풀 너비 이미지 카드 (높이 확대)
- AI 요약 한 줄 (Phase 0-3)
- 편의시설 뱃지 (주차/접근성)
- D-day 뱃지: 종료 임박 시 빨간색 펄스
- 상태 뱃지: "진행 중" 녹색 / "이번 주 시작" 파란색 / "이번 주 마지막" 빨간색

### 4-2. 상세 모달 강화

**현재**: 이미지 1장 + overview 텍스트
**변경**:
- 다중 이미지 갤러리 (Phase 0-5 `ImageGallery`)
- AI 요약 섹션
- 편의시설 상세 (운영시간, 주차, 접근성)
- "이 축제 포함 코스 만들기" CTA 버튼 (위저드로 연결, 축제 위치 기반)

### 4-3. 필터/검색 UX 개선

- 필터 칩 선택/해제 애니메이션 (scale bounce)
- 필터 변경 시 결과 카운트 실시간 표시 ("23개 축제")
- 빈 결과 시 일러스트 + 안내 메시지
- 리스트 아이템 진입 시 stagger 페이드인 애니메이션

---

## 타입 변경 사항

`lib/weekend-types.ts` 수정:

```typescript
// SpotCard에 추가
interface SpotCard {
  // 기존 필드...
  whyNow?: string;              // AI "지금 가면 좋은 이유"
  facilities?: FacilityInfo;     // 편의시설 정보
  images?: string[];             // 다중 이미지
}

// FestivalCard에 추가
interface FestivalCard {
  // 기존 필드...
  aiSummary?: string;            // AI 요약 (이미 필드 존재, 실제 데이터 채우기)
  facilities?: FacilityInfo;
  images?: string[];
  dDay?: number;                 // 종료까지 남은 일수
}

// 편의시설 정보 타입 신규
interface FacilityInfo {
  parking?: boolean;
  babyCarriage?: boolean;
  kidsFacility?: boolean;
  pet?: boolean;
  operatingHours?: string;
}

// CourseResponse에 추가
interface CourseResponse {
  // 기존 필드...
  fortuneMessage?: string;       // 나들이 운세
}

// CourseStop에 추가
interface CourseStop {
  // 기존 필드...
  images?: string[];             // 다중 이미지
  facilities?: FacilityInfo;     // 편의시설
  transitInfo?: string;          // "차로 15분 (4.2km)" 이동 정보
}
```

---

## 신규 파일 목록

| 파일 | 역할 |
|------|------|
| `app/components/FacilityBadges.tsx` | 편의시설 아이콘 뱃지 공통 컴포넌트 |
| `app/components/ImageGallery.tsx` | 이미지 스와이프 갤러리 컴포넌트 |
| `app/components/SearchBar.tsx` | 키워드 검색바 컴포넌트 |
| `app/api/spot/images/route.ts` | 다중 이미지 API 엔드포인트 |
| `app/api/search/route.ts` | 키워드 검색 API 엔드포인트 |
| `public/favicon.svg` | SVG favicon |

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `app/layout.tsx` | favicon, OG 메타태그 추가 |
| `app/globals.css` | 스크롤 페이드인, 스켈레톤, 글로우 등 애니메이션 클래스 |
| `app/components/WeekendHome.tsx` | 히어로/축제/추천 전면 리디자인 |
| `app/components/WeekendHeader.tsx` | 필요시 디자인 조정 |
| `app/components/WeatherBar.tsx` | 날씨 아이콘 애니메이션 |
| `app/components/FestivalBadge.tsx` | AI 요약, 이미지 확대, D-day |
| `app/components/SpotCard.tsx` | whyNow, 편의시설, 이미지 강화 |
| `app/components/SpotDetailModal.tsx` | 다중 이미지, 편의시설 상세 |
| `app/components/CourseWizard.tsx` | 1박2일, 세부카테고리, 애니메이션, 로딩 |
| `app/components/CourseResult.tsx` | 타임라인, 운세, 이미지갤러리, 편의시설 |
| `app/components/FestivalList.tsx` | 카드 리디자인, 모달 강화, 필터 UX |
| `app/components/BottomTabBar.tsx` | 필요시 디자인 조정 |
| `app/api/home/route.ts` | AI 요약/whyNow/편의시설 추가 |
| `app/api/course/route.ts` | 운세 메시지, 이미지, 편의시설, 이동정보 추가 |
| `app/api/festival/route.ts` | AI 요약, 편의시설 추가 |
| `lib/weekend-types.ts` | 타입 확장 |
| `lib/weekend-ai.ts` | AI 요약 함수 추가, 코스 프롬프트 내레이션 강화 |
| `lib/tour-api.ts` | 편의시설 파싱 확장 |

---

## 제약사항

- 외부 UI 라이브러리 추가 최소화 (Tailwind CSS + CSS 네이티브로 처리)
- AI 요약 호출은 병렬로, 실패해도 기능에 지장 없게 (graceful degradation)
- 모바일 퍼스트 유지 (max-w-lg 기준)
- 기존 동작하는 기능을 깨뜨리지 않음
- CookieRun(제목)/Pretendard(본문) 폰트 유지
- 테마 색상 유지: 배경 #FFF8F0, 액센트 orange-400~500
