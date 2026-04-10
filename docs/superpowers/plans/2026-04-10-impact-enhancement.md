# 이모추! 임팩트 강화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이모추! 앱의 UX/디자인, AI 차별화, 데이터 활용을 전면 강화하여 공모전 임팩트를 높인다.

**Architecture:** Phase 0에서 공통 인프라(타입, 컴포넌트, API, AI 유틸)를 구축하고, Phase 1~4에서 각 화면을 순차 업그레이드한다. 각 Phase 완료 시 배포 가능 상태를 유지한다.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Google Gemini API, TourAPI 4.0, CSS scroll-snap, Intersection Observer

**Spec:** `docs/superpowers/specs/2026-04-10-impact-enhancement-design.md`

---

## Phase 0: 공통 인프라

### Task 1: 타입 확장 + Favicon

**Files:**
- Modify: `lib/weekend-types.ts`
- Modify: `app/layout.tsx`
- Create: `public/favicon.svg`

- [ ] **Step 1: FacilityInfo 타입 및 확장 필드 추가**

`lib/weekend-types.ts` 파일 끝(288번째 줄 뒤)에 추가:

```typescript
// ─── 편의시설 정보 ───

export interface FacilityInfo {
  parking?: boolean;
  babyCarriage?: boolean;
  kidsFacility?: boolean;
  pet?: boolean;
  operatingHours?: string;
}
```

`SpotCard` 인터페이스(216행)에 필드 추가:

```typescript
export interface SpotCard {
  contentId: string;
  title: string;
  addr1: string;
  firstImage?: string;
  cat2: string;
  reason: string;
  distanceKm?: number;
  whyNow?: string;              // AI "지금 가면 좋은 이유"
  facilities?: FacilityInfo;
  images?: string[];
}
```

`FestivalCard` 인터페이스(226행)에 필드 추가:

```typescript
export interface FestivalCard {
  contentId: string;
  title: string;
  addr1: string;
  firstImage?: string;
  eventStart: string;
  eventEnd: string;
  aiSummary?: string;
  urgencyTag?: string;
  distanceKm?: number;
  facilities?: FacilityInfo;
  images?: string[];
  dDay?: number;
}
```

`CourseStop` 인터페이스(183행)에 필드 추가:

```typescript
export interface CourseStop {
  order: number;
  contentId: string;
  title: string;
  timeStart: string;
  durationMin: number;
  description: string;
  tip: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  isFestival: boolean;
  isStay?: boolean;
  day?: number;
  images?: string[];
  facilities?: FacilityInfo;
  transitInfo?: string;         // "차로 15분 (4.2km)"
}
```

`CourseResponse` 인터페이스(207행)에 필드 추가:

```typescript
export interface CourseResponse {
  courseId: string;
  shareUrl: string;
  course: CourseData;
  kakaoNaviUrl: string;
  fortuneMessage?: string;
}
```

- [ ] **Step 2: Favicon SVG 생성**

`public/favicon.svg` 생성:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y=".9em" font-size="90">🧳</text>
</svg>
```

- [ ] **Step 3: layout.tsx에 favicon + OG 이미지 추가**

`app/layout.tsx`의 metadata 객체에 icons 추가:

```typescript
export const metadata: Metadata = {
  title: {
    default: '이모추! — 이번 주에 모하지 추천',
    template: '%s | 이모추!',
  },
  description:
    '매주 금요일 열어보는 주말 나들이 AI 코스 플래너. 내 위치 + 축제 + 날씨를 AI가 분석해 10초 만에 맞춤 코스를 만들어드려요.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  keywords: [
    '주말 나들이', '당일치기 여행', 'AI 코스 추천',
    '축제 정보', '주말 갈만한곳', '나들이 코스',
    '관광지 추천', '이모추',
  ],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '이모추! — 이번 주에 모하지 추천',
    description: '3번의 선택 → AI가 10초 만에 주말 나들이 코스 완성!',
    siteName: '이모추!',
    url: 'https://emochu.vercel.app',
  },
  manifest: '/manifest.json',
};
```

- [ ] **Step 4: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공, 타입 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add lib/weekend-types.ts app/layout.tsx public/favicon.svg
git commit -m "feat: 타입 확장 (FacilityInfo, whyNow 등) + favicon 추가"
```

---

### Task 2: 전역 CSS 애니메이션 클래스

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 애니메이션 keyframes + 유틸 클래스 추가**

`app/globals.css` 파일 끝에 추가:

```css
/* ─── 스크롤 페이드인 애니메이션 ─── */
.fade-in-up {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.fade-in-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ─── 슬라이드 전환 ─── */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}
.slide-in-right { animation: slideInRight 0.35s ease-out both; }
.slide-in-left  { animation: slideInLeft 0.35s ease-out both; }

/* ─── 펄스 뱃지 (긴급 축제) ─── */
@keyframes badgePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.8; transform: scale(1.05); }
}
.badge-pulse { animation: badgePulse 2s ease-in-out infinite; }

/* ─── 글로우 프로그레스 ─── */
@keyframes progressGlow {
  0%, 100% { box-shadow: 0 0 4px rgba(251,146,60,0.3); }
  50%      { box-shadow: 0 0 12px rgba(251,146,60,0.6); }
}
.progress-glow { animation: progressGlow 2s ease-in-out infinite; }

/* ─── 스켈레톤 로딩 ─── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}

/* ─── 바운스 선택 피드백 ─── */
@keyframes selectBounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.95); }
  70%  { transform: scale(1.03); }
  100% { transform: scale(1); }
}
.select-bounce { animation: selectBounce 0.3s ease-out; }

/* ─── 날씨 아이콘 ─── */
@keyframes sunSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes cloudFloat {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(6px); }
}
@keyframes rainDrop {
  0%   { transform: translateY(-4px); opacity: 0; }
  50%  { opacity: 1; }
  100% { transform: translateY(4px); opacity: 0; }
}
.weather-sun   { animation: sunSpin 12s linear infinite; }
.weather-cloud { animation: cloudFloat 3s ease-in-out infinite; }
.weather-rain  { animation: rainDrop 1s ease-in-out infinite; }

/* ─── 스태거 페이드인 (리스트 아이템) ─── */
@keyframes staggerFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.stagger-item {
  animation: staggerFadeIn 0.4s ease-out both;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add app/globals.css
git commit -m "feat: 전역 CSS 애니메이션 클래스 추가 (fade-in, skeleton, pulse 등)"
```

---

### Task 3: FacilityBadges 공통 컴포넌트

**Files:**
- Create: `app/components/FacilityBadges.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
'use client';

import type { FacilityInfo } from '@/lib/weekend-types';

interface Props {
  facilities: FacilityInfo;
  compact?: boolean;  // true: 아이콘만, false: 아이콘+텍스트
}

const BADGES: { key: keyof FacilityInfo; icon: string; label: string }[] = [
  { key: 'parking',       icon: '🅿️', label: '주차' },
  { key: 'babyCarriage',  icon: '👶', label: '유모차' },
  { key: 'kidsFacility',  icon: '🧒', label: '키즈' },
  { key: 'pet',           icon: '🐾', label: '반려동물' },
];

export default function FacilityBadges({ facilities, compact = false }: Props) {
  const activeBadges = BADGES.filter(b => facilities[b.key] === true);

  if (activeBadges.length === 0 && !facilities.operatingHours) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeBadges.map(b => (
        <span
          key={b.key}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[10px] font-bold"
          title={b.label}
        >
          <span>{b.icon}</span>
          {!compact && <span>{b.label}</span>}
        </span>
      ))}
      {facilities.operatingHours && !compact && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
          <span>⏰</span>
          <span>{facilities.operatingHours}</span>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add app/components/FacilityBadges.tsx
git commit -m "feat: FacilityBadges 공통 컴포넌트"
```

---

### Task 4: ImageGallery 스와이프 컴포넌트

**Files:**
- Create: `app/components/ImageGallery.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  images: string[];
  alt: string;
  height?: string;  // Tailwind 높이 클래스 (예: "h-36", "h-48")
}

export default function ImageGallery({ images, alt, height = 'h-36' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIndex(index);
  }, []);

  // 이미지 1장이면 일반 렌더링
  if (images.length <= 1) {
    return (
      <div className={`relative ${height} overflow-hidden`}>
        {images[0] ? (
          <img src={images[0]} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className={`${height} bg-gradient-to-br from-orange-200 to-pink-200 opacity-40`} />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${height} overflow-hidden`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((src, i) => (
          <div key={i} className="flex-shrink-0 w-full h-full snap-center">
            <img src={src} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      {/* 인디케이터 도트 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'bg-white w-3' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add app/components/ImageGallery.tsx
git commit -m "feat: ImageGallery 스와이프 컴포넌트 (CSS scroll-snap)"
```

---

### Task 5: 다중 이미지 API 엔드포인트

**Files:**
- Create: `app/api/spot/images/route.ts`

- [ ] **Step 1: 엔드포인트 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { detailImage } from '@/lib/tour-api';

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get('contentId');

  if (!contentId) {
    return NextResponse.json({ error: 'contentId가 필요합니다.' }, { status: 400 });
  }

  try {
    const items = await detailImage({ contentId });
    const images = items
      .map(item => (item as Record<string, string>).originimgurl || (item as Record<string, string>).smallimageurl)
      .filter(Boolean);

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공, `/api/spot/images` 라우트 등록됨

- [ ] **Step 3: 커밋**

```bash
git add app/api/spot/images/route.ts
git commit -m "feat: 다중 이미지 API 엔드포인트 (GET /api/spot/images)"
```

---

### Task 6: AI 요약 유틸 함수

**Files:**
- Modify: `lib/weekend-ai.ts`

- [ ] **Step 1: AI 요약 함수 3개 추가**

`lib/weekend-ai.ts` 파일의 `export async function generateCourse` 함수 앞(약 907행 부근)에 추가:

```typescript
// ─── AI 요약 유틸 (gemini-2.5-flash-lite) ───

async function callGeminiLite(prompt: string, maxTokens = 100): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const models = ['gemini-2.5-flash-lite', 'gemini-2.0-flash'];
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (text) return text;
    } catch {
      continue;
    }
  }
  return '';
}

export async function generateFestivalSummary(
  title: string,
  overview: string | undefined
): Promise<string> {
  if (!overview || overview.length < 20) return '';
  const prompt = `한국 축제 정보를 한 줄(30자 이내)로 요약해주세요. "왜 지금 가야 하는지"를 담아주세요.
축제명: ${title}
설명: ${overview.slice(0, 300)}
응답은 요약 문장만 출력하세요. 따옴표나 설명 없이.`;
  return callGeminiLite(prompt, 60);
}

export async function generateSpotWhyNow(
  title: string,
  cat2: string,
  overview: string | undefined,
  weather: { sky: string; tempMax: number } | undefined,
  month: number
): Promise<string> {
  const seasonContext = SEASON_NAME[month] || '봄';
  const weatherContext = weather ? `날씨: ${weather.sky}, 최고 ${weather.tempMax}°C` : '';
  const prompt = `한국 관광지를 한 줄(30자 이내)로 "지금 가면 좋은 이유"를 써주세요.
장소: ${title} (${cat2})
계절: ${seasonContext}
${weatherContext}
${overview ? `설명: ${overview.slice(0, 200)}` : ''}
응답은 문장만 출력하세요. 따옴표나 설명 없이. ~요체.`;
  return callGeminiLite(prompt, 60);
}

export async function generateCourseFortuneMessage(
  courseTitle: string,
  feeling: string | undefined,
  weatherSummary: string | undefined
): Promise<string> {
  const prompt = `주말 나들이 코스를 시작하는 사용자에게 "오늘의 나들이 운세" 감성 한마디(50자 이내)를 써주세요.
코스: ${courseTitle}
${feeling ? `기분: ${feeling}` : ''}
${weatherSummary ? `날씨: ${weatherSummary}` : ''}
재미있고 긍정적인 톤으로. 이모지 1개 포함. 응답은 문장만 출력하세요.`;
  return callGeminiLite(prompt, 80);
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add lib/weekend-ai.ts
git commit -m "feat: AI 요약 유틸 (축제 요약, 장소 추천 이유, 나들이 운세)"
```

---

### Task 7: 키워드 검색 API 엔드포인트

**Files:**
- Create: `app/api/search/route.ts`

- [ ] **Step 1: 엔드포인트 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { searchKeyword } from '@/lib/tour-api';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword');
  const contentTypeId = request.nextUrl.searchParams.get('contentTypeId');
  const areaCode = request.nextUrl.searchParams.get('areaCode');
  const numOfRows = request.nextUrl.searchParams.get('numOfRows');

  if (!keyword || keyword.trim().length < 1) {
    return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
  }

  try {
    const items = await searchKeyword({
      keyword: keyword.trim(),
      contentTypeId: contentTypeId ? Number(contentTypeId) : undefined,
      areaCode: areaCode ? Number(areaCode) : undefined,
      numOfRows: numOfRows ? Number(numOfRows) : 20,
    });

    const results = items.map(item => ({
      contentId: String((item as Record<string, unknown>).contentid ?? ''),
      title: String((item as Record<string, unknown>).title ?? ''),
      addr1: String((item as Record<string, unknown>).addr1 ?? ''),
      firstImage: String((item as Record<string, unknown>).firstimage ?? ''),
      contentTypeId: Number((item as Record<string, unknown>).contenttypeid ?? 0),
      cat2: String((item as Record<string, unknown>).cat2 ?? ''),
      mapX: Number((item as Record<string, unknown>).mapx ?? 0),
      mapY: Number((item as Record<string, unknown>).mapy ?? 0),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공, `/api/search` 라우트 등록됨

- [ ] **Step 3: 커밋**

```bash
git add app/api/search/route.ts
git commit -m "feat: 키워드 검색 API 엔드포인트 (GET /api/search)"
```

---

### Task 8: 편의시설 파싱 확장

**Files:**
- Modify: `lib/tour-api.ts`

- [ ] **Step 1: parseFacilities 유틸 함수 추가**

`lib/tour-api.ts`에 export 함수 추가 (파일 끝 부분):

```typescript
// ─── 편의시설 파싱 유틸 ───

export function parseFacilities(introData: Record<string, unknown> | null): {
  parking: boolean;
  babyCarriage: boolean;
  kidsFacility: boolean;
  pet: boolean;
  operatingHours: string;
} {
  if (!introData) {
    return { parking: false, babyCarriage: false, kidsFacility: false, pet: false, operatingHours: '' };
  }

  const hasValue = (val: unknown): boolean => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return s !== '' && s !== '불가' && s !== '불가능' && s !== '없음' && s !== 'n';
  };

  const parking = hasValue(introData.parking) || hasValue(introData.parkingfood);
  const babyCarriage = hasValue(introData.chkbabycarriage) || hasValue(introData.chkbabycarriageculture);
  const kidsFacility = hasValue(introData.kidsfacility);
  const pet = hasValue(introData.chkpet) || hasValue(introData.chkpetculture);

  // 운영시간 추출
  const timeField = introData.usetime || introData.usetimeculture ||
    introData.usetimefestival || introData.opentimefood || introData.playtime || '';
  const operatingHours = String(timeField).replace(/<[^>]*>/g, '').trim().slice(0, 50);

  return { parking, babyCarriage, kidsFacility, pet, operatingHours };
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add lib/tour-api.ts
git commit -m "feat: parseFacilities 유틸 함수 (detailIntro 편의시설 파싱)"
```

---

## Phase 1: 홈 화면 업그레이드

### Task 9: 홈 API 강화 (AI 요약 + 편의시설 + whyNow)

**Files:**
- Modify: `app/api/home/route.ts`

- [ ] **Step 1: 홈 API에 AI 요약/whyNow/편의시설/dDay 추가**

`app/api/home/route.ts`를 전면 수정한다. 핵심 변경:

1. `collectFestivalsForHome()` 함수에서:
   - 각 축제에 `generateFestivalSummary()` 병렬 호출
   - `dDay` 계산 (종료일 - 오늘)
   - 결과를 `FestivalCard.aiSummary`와 `FestivalCard.dDay`에 저장

2. `collectSpotsForHome()` 함수에서:
   - 상위 4개 장소에 `generateSpotWhyNow()` 병렬 호출
   - 상위 4개 장소에 `detailIntro()` + `parseFacilities()` 호출
   - 결과를 `SpotCard.whyNow`와 `SpotCard.facilities`에 저장

3. import 추가:
   ```typescript
   import { generateFestivalSummary, generateSpotWhyNow } from '@/lib/weekend-ai';
   import { detailIntro, parseFacilities } from '@/lib/tour-api';
   ```

4. 축제 AI 요약 병렬 호출:
   ```typescript
   // collectFestivalsForHome 내부, 축제 배열 생성 후
   const today = new Date();
   const festivalCards = rawFestivals.map(f => {
     const endDate = new Date(
       f.eventEndDate.slice(0, 4) + '-' + f.eventEndDate.slice(4, 6) + '-' + f.eventEndDate.slice(6, 8)
     );
     const dDay = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
     return { ...existingCardMapping, dDay };
   });

   // AI 요약 병렬 호출 (실패해도 무시)
   await Promise.allSettled(
     festivalCards.map(async (card, i) => {
       const raw = rawFestivals[i];
       card.aiSummary = await generateFestivalSummary(raw.title, raw.overview ?? '');
     })
   );
   ```

5. 장소 whyNow + 편의시설 병렬 호출:
   ```typescript
   // collectSpotsForHome 내부, 장소 배열 생성 후
   const month = new Date().getMonth() + 1;
   await Promise.allSettled(
     spotCards.map(async (card, i) => {
       const raw = rawSpots[i];
       const [whyNow, introData] = await Promise.all([
         generateSpotWhyNow(raw.title, card.cat2, raw.overview, weather?.saturday, month),
         detailIntro({ contentId: raw.contentId, contentTypeId: raw.contentTypeId }),
       ]);
       card.whyNow = whyNow;
       card.facilities = parseFacilities(introData as Record<string, unknown>);
     })
   );
   ```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add app/api/home/route.ts
git commit -m "feat: 홈 API 강화 (축제 AI 요약, 장소 whyNow, 편의시설, dDay)"
```

---

### Task 10: SearchBar 컴포넌트

**Files:**
- Create: `app/components/SearchBar.tsx`

- [ ] **Step 1: 검색바 컴포넌트 작성**

```tsx
'use client';

import { useState, useRef } from 'react';

interface SearchResult {
  contentId: string;
  title: string;
  addr1: string;
  firstImage: string;
  contentTypeId: number;
  cat2: string;
}

interface Props {
  onSelectSpot?: (contentId: string) => void;
}

const POPULAR_KEYWORDS = ['벚꽃', '야경', '맛집', '카페', '전시', '바다'];

export default function SearchBar({ onSelectSpot }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = async (keyword: string) => {
    if (keyword.trim().length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    setShowResults(true);
    try {
      const res = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&numOfRows=8`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleTagClick = (keyword: string) => {
    setQuery(keyword);
    doSearch(keyword);
  };

  const CONTENT_TYPE_LABELS: Record<number, string> = {
    12: '관광지', 14: '문화시설', 15: '축제', 28: '레포츠', 32: '숙박', 39: '음식점',
  };

  return (
    <div className="relative">
      {/* 검색 입력 */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="장소나 키워드로 검색해보세요"
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-orange-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 shadow-sm transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* 인기 키워드 태그 */}
      {!showResults && (
        <div className="flex flex-wrap gap-2 mt-3">
          {POPULAR_KEYWORDS.map(kw => (
            <button
              key={kw}
              onClick={() => handleTagClick(kw)}
              className="px-3 py-1.5 bg-white border border-orange-100 rounded-full text-xs font-bold text-slate-600 hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm"
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {/* 검색 결과 드롭다운 */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-orange-100 shadow-lg max-h-80 overflow-y-auto z-50">
          {loading && (
            <div className="p-4 text-center text-sm text-slate-400">검색 중...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="p-4 text-center text-sm text-slate-400">
              검색 결과가 없어요 😅
            </div>
          )}
          {!loading && results.map(r => (
            <button
              key={r.contentId}
              onClick={() => {
                onSelectSpot?.(r.contentId);
                setShowResults(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-0"
            >
              {r.firstImage ? (
                <img src={r.firstImage} alt={r.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 text-xs">📍</div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-700 truncate">{r.title}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {CONTENT_TYPE_LABELS[r.contentTypeId] ?? ''} · {r.addr1}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add app/components/SearchBar.tsx
git commit -m "feat: SearchBar 키워드 검색 컴포넌트"
```

---

### Task 11: 홈 화면 UI 전면 리디자인

**Files:**
- Modify: `app/components/WeekendHome.tsx`
- Modify: `app/components/WeatherBar.tsx`
- Modify: `app/components/FestivalBadge.tsx`
- Modify: `app/components/SpotCard.tsx`

이 Task는 4개 컴포넌트를 수정하는 대규모 작업이다. 핵심 변경사항:

- [ ] **Step 1: WeekendHome.tsx 리디자인**

주요 변경:
1. 히어로 섹션에 날씨 연동 인사말 + D-day + 배경 애니메이션 추가
2. 검색바 (SearchBar 컴포넌트) 삽입
3. 축제/장소 섹션에 스크롤 페이드인 적용
4. 스켈레톤 로딩 추가
5. SpotDetailModal 연결 (검색 결과 클릭 시)

히어로 섹션 변경:
```tsx
{/* 기존 히어로를 날씨 연동 인사말로 교체 */}
<section className="relative overflow-hidden px-5 pt-20 pb-6">
  <div className="relative z-10">
    <p className="text-sm text-orange-500 font-bold mb-1">
      {weekendDates} {locationName}
    </p>
    <h1
      className="text-2xl font-black text-slate-800 break-keep"
      style={{ fontFamily: "'CookieRun', sans-serif" }}
    >
      이번 주말, 뭐하지?
    </h1>
    {data?.weather && (
      <p className="text-sm text-slate-500 mt-2 break-keep">
        {data.weather.saturday.summary} — {data.weather.recommendation}
      </p>
    )}
  </div>
</section>
```

검색바 삽입 (히어로 아래):
```tsx
<section className="px-5 mb-4">
  <SearchBar onSelectSpot={(id) => setSelectedSpotId(id)} />
</section>
```

각 섹션에 Intersection Observer 기반 fade-in-up 적용:
```tsx
// 커스텀 훅 또는 인라인 useEffect
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
  return () => observer.disconnect();
}, [data]);
```

- [ ] **Step 2: WeatherBar.tsx 날씨 아이콘 애니메이션 추가**

날씨 상태에 따른 CSS 클래스 적용:
```tsx
function getWeatherAnimation(sky: string, precip: string) {
  if (precip === 'rain' || precip === 'mixed') return 'weather-rain';
  if (sky === 'clear') return 'weather-sun';
  return 'weather-cloud';
}
```

날씨 이모지 요소에 애니메이션 클래스 적용:
```tsx
<span className={`text-2xl inline-block ${getWeatherAnimation(day.sky, day.precipitation)}`}>
  {skyEmoji}
</span>
```

- [ ] **Step 3: FestivalBadge.tsx 강화**

변경:
- AI 요약(`aiSummary`) 텍스트 한 줄 추가
- D-day 뱃지 추가 (`dDay` 필드 활용)
- 긴급 뱃지에 `badge-pulse` 클래스 적용
- 이미지 높이 확대

```tsx
{/* 기존 카드에 추가 */}
{festival.aiSummary && (
  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{festival.aiSummary}</p>
)}
{festival.dDay !== undefined && festival.dDay <= 7 && (
  <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full badge-pulse">
    {festival.dDay <= 0 ? '오늘!' : `D-${festival.dDay}`}
  </span>
)}
```

- [ ] **Step 4: SpotCard.tsx 강화**

변경:
- `whyNow` AI 한마디 표시
- `FacilityBadges` 컴팩트 모드 표시
- 이미지에 그라데이션 오버레이

```tsx
import FacilityBadges from './FacilityBadges';

// 카드 내부
{spot.whyNow && (
  <p className="text-[11px] text-orange-600 font-bold mt-1 line-clamp-1">✨ {spot.whyNow}</p>
)}
{spot.facilities && <FacilityBadges facilities={spot.facilities} compact />}
```

- [ ] **Step 5: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add app/components/WeekendHome.tsx app/components/WeatherBar.tsx app/components/FestivalBadge.tsx app/components/SpotCard.tsx
git commit -m "feat: 홈 화면 전면 리디자인 (히어로, 검색바, AI 요약, 애니메이션)"
```

---

## Phase 2: 코스 만들기 위저드

### Task 12: 1박2일 옵션 + 세부 카테고리

**Files:**
- Modify: `app/components/CourseWizard.tsx`
- Modify: `lib/weekend-types.ts`
- Modify: `lib/tour-api.ts`

- [ ] **Step 1: 세부 카테고리 매핑 추가**

`lib/tour-api.ts`의 `PREFERENCE_CAT_MAP` 확장:

```typescript
export const PREFERENCE_SUB_CATEGORIES: Record<string, { label: string; cat2?: string; cat3?: string }[]> = {
  nature: [
    { label: '산/산책로', cat2: 'A0101' },
    { label: '해변/바다', cat2: 'A0101', cat3: 'A01011200' },
    { label: '공원/정원', cat2: 'A0102' },
    { label: '호수/계곡', cat2: 'A0101', cat3: 'A01011100' },
  ],
  food: [
    { label: '한식', cat2: 'A0502', cat3: 'A05020100' },
    { label: '양식', cat2: 'A0502', cat3: 'A05020200' },
    { label: '일식', cat2: 'A0502', cat3: 'A05020300' },
    { label: '분식/야시장', cat2: 'A0502', cat3: 'A05020700' },
  ],
  culture: [
    { label: '박물관', cat2: 'A0201' },
    { label: '미술관', cat2: 'A0205' },
    { label: '공연장', cat2: 'A0206' },
    { label: '역사유적', cat2: 'A0201' },
  ],
  activity: [
    { label: '수상레포츠', cat2: 'A0302' },
    { label: '등산/트레킹', cat2: 'A0301' },
    { label: '테마파크', cat2: 'A0202' },
    { label: '체험활동', cat2: 'A0303' },
  ],
};
```

`lib/weekend-types.ts`에 서브 카테고리 선택 타입 추가:

```typescript
export interface SubCategorySelection {
  preference: Preference;
  subLabels: string[];  // 선택된 세부 카테고리 라벨
}
```

- [ ] **Step 2: CourseWizard에 1박2일 + 세부 카테고리 UI 추가**

CourseWizard.tsx 변경:

1. `DURATIONS` 배열은 이미 `'overnight'`을 포함하고 있음. `DURATION_LABELS`에도 `overnight: '1박 2일'`이 이미 있음. UI에서 필터링하고 있다면 제거.

2. overnight 선택 시 안내 표시:
```tsx
{duration === 'overnight' && (
  <p className="text-xs text-orange-500 font-bold mt-2 px-2">
    🏨 AI가 숙소도 함께 추천해드려요! 1박 2일 풀코스를 만들어볼게요.
  </p>
)}
```

3. 취향 선택 단계(step 4)에서, 선택된 취향에 대한 서브 카테고리 칩 표시:
```tsx
{/* 메인 카테고리 선택 후, 선택된 항목에 대해 서브 카테고리 표시 */}
{preferences.length > 0 && (
  <div className="mt-4 space-y-3">
    {preferences.map(pref => {
      const subs = PREFERENCE_SUB_CATEGORIES[pref];
      if (!subs) return null;
      return (
        <div key={pref} className="animate-[fadeSlide_0.3s_ease-out]">
          <p className="text-xs text-slate-400 mb-1.5">{PREFERENCE_LABELS[pref]} 세부</p>
          <div className="flex flex-wrap gap-2">
            {subs.map(sub => (
              <button
                key={sub.label}
                onClick={() => toggleSubCategory(pref, sub.label)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isSubSelected(pref, sub.label)
                    ? 'bg-orange-400 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      );
    })}
  </div>
)}
```

4. 상태 추가:
```typescript
const [subCategories, setSubCategories] = useState<SubCategorySelection[]>([]);

const toggleSubCategory = (pref: Preference, label: string) => {
  setSubCategories(prev => {
    const existing = prev.find(s => s.preference === pref);
    if (!existing) return [...prev, { preference: pref, subLabels: [label] }];
    const has = existing.subLabels.includes(label);
    const newLabels = has
      ? existing.subLabels.filter(l => l !== label)
      : [...existing.subLabels, label];
    return prev.map(s => s.preference === pref ? { ...s, subLabels: newLabels } : s);
  });
};

const isSubSelected = (pref: Preference, label: string) =>
  subCategories.find(s => s.preference === pref)?.subLabels.includes(label) ?? false;
```

- [ ] **Step 3: import 추가**

CourseWizard.tsx에:
```typescript
import { PREFERENCE_SUB_CATEGORIES } from '@/lib/tour-api';
import type { SubCategorySelection } from '@/lib/weekend-types';
```

- [ ] **Step 4: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add app/components/CourseWizard.tsx lib/weekend-types.ts lib/tour-api.ts
git commit -m "feat: 위저드 1박2일 옵션 활성화 + 세부 카테고리 필터"
```

---

### Task 13: 위저드 애니메이션 + AI 로딩 경험

**Files:**
- Modify: `app/components/CourseWizard.tsx`

- [ ] **Step 1: 단계 전환 슬라이드 애니메이션**

step 변경 시 방향 기반 애니메이션 적용:

```typescript
const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');

const goNext = () => {
  setSlideDir('right');
  setStep(s => s + 1);
};
const goPrev = () => {
  setSlideDir('left');
  setStep(s => s - 1);
};
```

각 step 컨텐츠 래퍼에 애니메이션 클래스 적용:
```tsx
<div key={step} className={slideDir === 'right' ? 'slide-in-right' : 'slide-in-left'}>
  {/* step 내용 */}
</div>
```

옵션 카드 선택 시 바운스:
```tsx
onClick={() => {
  e.currentTarget.classList.add('select-bounce');
  setTimeout(() => setDuration(d), 150);
}}
```

프로그레스 바에 글로우:
```tsx
<div className="h-1.5 bg-orange-100 rounded-full overflow-hidden progress-glow">
  <div
    className="h-full bg-gradient-to-r from-orange-400 to-pink-400 rounded-full transition-all duration-500"
    style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
  />
</div>
```

- [ ] **Step 2: AI 생성 로딩 단계별 메시지**

로딩 화면의 메시지를 단계별로 순환:

```typescript
const LOADING_STEPS = [
  { emoji: '🔍', text: '주변 관광지 검색 중...' },
  { emoji: '🍽️', text: '맛집 찾는 중...' },
  { emoji: '☕', text: '카페도 빠질 수 없죠...' },
  { emoji: '🎪', text: '근처 축제 확인 중...' },
  { emoji: '🤖', text: 'AI가 최적 코스 설계 중...' },
  { emoji: '✨', text: '거의 다 됐어요!' },
];

const [loadingStep, setLoadingStep] = useState(0);

useEffect(() => {
  if (!isGenerating) return;
  const interval = setInterval(() => {
    setLoadingStep(s => (s + 1) % LOADING_STEPS.length);
  }, 2000);
  return () => clearInterval(interval);
}, [isGenerating]);
```

로딩 UI:
```tsx
{isGenerating && (
  <div className="flex flex-col items-center justify-center min-h-[50dvh]">
    <span className="text-5xl animate-bounce">{LOADING_STEPS[loadingStep].emoji}</span>
    <p className="text-slate-600 text-sm font-bold mt-4">{LOADING_STEPS[loadingStep].text}</p>
    {/* 가짜 프로그레스 바 */}
    <div className="w-48 h-1.5 bg-orange-100 rounded-full mt-6 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-orange-400 to-pink-400 rounded-full transition-all duration-[2000ms] ease-linear"
        style={{ width: `${Math.min(((loadingStep + 1) / LOADING_STEPS.length) * 100, 95)}%` }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 3: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add app/components/CourseWizard.tsx
git commit -m "feat: 위저드 슬라이드 전환 + 바운스 피드백 + AI 로딩 단계별 메시지"
```

---

## Phase 3: 코스 결과 화면

### Task 14: AI 프롬프트 내레이션 강화 + 운세 메시지

**Files:**
- Modify: `lib/weekend-ai.ts`
- Modify: `app/api/course/route.ts`

- [ ] **Step 1: Gemini 시스템 프롬프트에 내레이션 지시 추가**

`lib/weekend-ai.ts`의 `SYSTEM_INSTRUCTION` 문자열에 추가 (꿀팁 작성 섹션 근처):

```
## 내레이션 스타일 (매우 중요!)
- description: 친구가 추천하듯 감성적인 톤으로 작성하세요.
  - 이전 장소와의 연결을 자연스럽게 언급: "점심 든든하게 먹었으니 바로 옆 산책로에서 소화시키면 딱이에요 🚶"
  - "여기는 ~해서 좋아요", "~하면 꼭 들러야 하는 곳이에요" 같은 추천 어조
  - 시간대에 맞는 표현: 아침엔 "상쾌한 아침 공기", 저녁엔 "노을이 물드는"
  - 이모지 1~2개 자연스럽게 포함
- tip: 실용적이고 구체적인 꿀팁. 주차, 웨이팅, 추천 메뉴, 포토존 등.
```

- [ ] **Step 2: 코스 API에 운세 메시지 + 이동정보 추가**

`app/api/course/route.ts` 변경:

1. import 추가:
```typescript
import { generateCourseFortuneMessage } from '@/lib/weekend-ai';
```

2. 코스 생성 후, 운세 메시지 생성 + stops에 이동정보 추가:
```typescript
// 코스 생성 성공 후 (course 변수에 CourseData가 있는 시점)

// 이동 정보 추가
for (let i = 1; i < course.stops.length; i++) {
  const prev = course.stops[i - 1];
  const curr = course.stops[i];
  const dist = haversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  const mins = Math.round(dist * 1.5 * 2);
  curr.transitInfo = `차로 ${mins}분 (${dist.toFixed(1)}km)`;
}

// 운세 메시지 생성
let fortuneMessage = '';
try {
  fortuneMessage = await generateCourseFortuneMessage(
    course.title,
    req.feeling,
    weather?.saturday?.summary
  );
} catch { /* 실패해도 무시 */ }

// 응답에 fortuneMessage 추가
const response: CourseResponse = {
  courseId,
  shareUrl: `/course/${shareSlug}`,
  course,
  kakaoNaviUrl: buildKakaoNaviUrl(course.stops),
  fortuneMessage,
};
```

3. `haversine` 함수는 이미 `weekend-ai.ts`에 있을 수 있음. 없으면 route.ts에 인라인:
```typescript
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add lib/weekend-ai.ts app/api/course/route.ts
git commit -m "feat: AI 내레이션 강화 + 나들이 운세 + 이동 정보"
```

---

### Task 15: 코스 결과 UI 리디자인

**Files:**
- Modify: `app/components/CourseResult.tsx`

이 Task는 코스 결과 화면의 전면 리디자인이다. 핵심 변경:

- [ ] **Step 1: 운세 메시지 카드 추가**

코스 헤더 영역 상단에 운세 카드 추가:

```tsx
{data.fortuneMessage && (
  <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 via-pink-50 to-violet-50 rounded-2xl border border-orange-100/50">
    <p className="text-xs font-bold text-orange-400 mb-1">✨ 오늘의 나들이 운세</p>
    <p className="text-sm text-slate-700 font-bold break-keep">{data.fortuneMessage}</p>
  </div>
)}
```

- [ ] **Step 2: 타임라인 디자인 변경**

기존 카드 나열을 세로 타임라인으로 변경:

```tsx
{/* 타임라인 컨테이너 */}
<div className="relative">
  {/* 세로 연결선 */}
  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-300 via-pink-300 to-violet-300" />

  {course.stops.map((stop, i) => {
    const color = getStopColor(i);
    const prevStop = i > 0 ? course.stops[i - 1] : null;
    const showDayDivider = stop.day && prevStop?.day && stop.day !== prevStop.day;

    return (
      <div key={stop.contentId + i}>
        {/* 1박2일 일차 구분 */}
        {showDayDivider && (
          <div className="relative flex items-center gap-3 py-4 ml-10">
            <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent" />
            <span className="text-xs font-black text-indigo-500 whitespace-nowrap">
              🌄 둘째 날
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-indigo-200 to-transparent" />
          </div>
        )}

        {/* 이동 정보 */}
        {stop.transitInfo && (
          <div className="relative flex items-center gap-2 py-2 ml-10">
            <span className="text-[11px] text-slate-400">🚗 {stop.transitInfo}</span>
          </div>
        )}

        {/* 타임라인 마커 + 카드 */}
        <div className="relative flex gap-4 pb-6" style={{ animationDelay: `${i * 0.1}s` }}>
          {/* 원형 마커 */}
          <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-black shadow-md`}>
            {stop.order}
          </div>

          {/* 카드 */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden stagger-item" style={{ animationDelay: `${i * 0.1}s` }}>
            {/* 이미지 (갤러리 또는 단일) */}
            <ImageGallery
              images={stop.images?.length ? stop.images : (stop.imageUrl ? [stop.imageUrl] : [])}
              alt={stop.title}
              height="h-36"
            />

            {/* 숙박/축제 뱃지 */}
            {(stop.isFestival || stop.isStay) && (
              <span className={`absolute top-2 left-14 ${stop.isStay ? 'bg-indigo-500' : 'bg-red-500'} text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10`}>
                {stop.isStay ? '🏨 숙박' : '🎪 축제'}
              </span>
            )}

            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${color} text-white`}>
                  {formatTime(stop.timeStart, stop.durationMin)}
                </span>
                <span className="text-[10px] text-slate-400">{stop.durationMin}분</span>
              </div>
              <h3 className="text-base font-black text-slate-800 break-keep">{stop.title}</h3>
              <p className="text-sm text-slate-600 mt-1 break-keep leading-relaxed">{stop.description}</p>
              {stop.tip && (
                <p className="text-xs text-orange-500 mt-2 font-bold">💡 {stop.tip}</p>
              )}
              {stop.facilities && <FacilityBadges facilities={stop.facilities} compact />}
            </div>
          </div>
        </div>
      </div>
    );
  })}
</div>
```

- [ ] **Step 3: import 추가**

```typescript
import ImageGallery from './ImageGallery';
import FacilityBadges from './FacilityBadges';
```

- [ ] **Step 4: 1박2일 첫째 날 헤더 추가**

코스 시작 부분에 1박2일이면 "첫째 날" 표시:

```tsx
{course.stops[0]?.day === 1 && (
  <div className="flex items-center gap-3 mb-4">
    <span className="text-xs font-black text-orange-500">🌅 첫째 날</span>
    <div className="flex-1 h-px bg-orange-100" />
  </div>
)}
```

- [ ] **Step 5: OG 메타태그 동적 생성**

`app/(pages)/course/[slug]/page.tsx`에 `generateMetadata` 추가:

```typescript
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://emochu.vercel.app';
    const res = await fetch(`${baseUrl}/api/course/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const course = data.course;
    const image = course?.stops?.find((s: { imageUrl?: string }) => s.imageUrl)?.imageUrl;

    return {
      title: course?.title ?? '코스 보기',
      description: course?.summary ?? '이모추! AI가 만든 주말 나들이 코스',
      openGraph: {
        title: course?.title ?? '이모추! 코스',
        description: course?.summary ?? '이모추! AI가 만든 주말 나들이 코스를 확인해보세요!',
        images: image ? [{ url: image }] : undefined,
      },
    };
  } catch {
    return { title: '코스 보기' };
  }
}
```

- [ ] **Step 6: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add app/components/CourseResult.tsx app/(pages)/course/[slug]/page.tsx
git commit -m "feat: 코스 결과 타임라인 리디자인 + 운세 카드 + OG 메타"
```

---

## Phase 4: 축제 페이지

### Task 16: 축제 API 강화

**Files:**
- Modify: `app/api/festival/route.ts`

- [ ] **Step 1: 축제 API에 AI 요약 + dDay 추가**

기존 축제 API에서 축제 데이터 반환 시:

1. import 추가:
```typescript
import { generateFestivalSummary } from '@/lib/weekend-ai';
```

2. 축제 목록 반환 전, 상위 10개에 대해 AI 요약 병렬 호출:
```typescript
// 축제 배열 생성 후
const today = new Date();
festivals.forEach(f => {
  const endDate = new Date(f.eventEnd.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  f.dDay = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
});

// 상위 10개에만 AI 요약 (토큰 절약)
await Promise.allSettled(
  festivals.slice(0, 10).map(async (f) => {
    if (!f.aiSummary) {
      f.aiSummary = await generateFestivalSummary(f.title, f.overview ?? '');
    }
  })
);
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add app/api/festival/route.ts
git commit -m "feat: 축제 API 강화 (AI 요약, dDay)"
```

---

### Task 17: 축제 페이지 UI 리디자인

**Files:**
- Modify: `app/components/FestivalList.tsx`

- [ ] **Step 1: 축제 카드 리디자인**

FestivalList.tsx의 축제 카드 렌더링 변경:

1. 풀 너비 이미지 + 그라데이션 오버레이
2. AI 요약 표시
3. D-day 뱃지 (종료 임박 시 빨간색 펄스)
4. 상태 뱃지: "진행 중" 녹색 / "이번 주 시작" 파란색 / "이번 주 마지막" 빨간색

```tsx
{/* 축제 카드 */}
<div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
  {/* 이미지 */}
  <div className="relative h-40 overflow-hidden">
    {f.firstImage ? (
      <img src={f.firstImage} alt={f.title} className="w-full h-full object-cover" loading="lazy" />
    ) : (
      <div className="h-full bg-gradient-to-br from-orange-200 to-pink-200 opacity-40" />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

    {/* D-day 뱃지 */}
    {f.dDay !== undefined && f.dDay <= 7 && (
      <span className={`absolute top-2 right-2 px-2 py-0.5 text-white text-[10px] font-black rounded-full ${
        f.dDay <= 0 ? 'bg-red-500 badge-pulse' : f.dDay <= 3 ? 'bg-red-500' : 'bg-orange-500'
      }`}>
        {f.dDay <= 0 ? '오늘!' : `D-${f.dDay}`}
      </span>
    )}

    {/* 상태 뱃지 */}
    {f.urgencyTag && (
      <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">
        {f.urgencyTag}
      </span>
    )}

    {/* 하단 제목 */}
    <div className="absolute bottom-2 left-3 right-3">
      <h3 className="text-base font-black text-white drop-shadow-md break-keep">{f.title}</h3>
    </div>
  </div>

  <div className="p-3">
    {f.aiSummary && (
      <p className="text-[12px] text-orange-600 font-bold mb-1 line-clamp-1">✨ {f.aiSummary}</p>
    )}
    <p className="text-[11px] text-slate-400">{f.addr1}</p>
    <p className="text-[11px] text-slate-400">{f.eventStart} ~ {f.eventEnd}</p>
    {f.distanceKm !== undefined && (
      <span className="text-[10px] text-slate-400">📍 {f.distanceKm.toFixed(1)}km</span>
    )}
  </div>
</div>
```

- [ ] **Step 2: 필터 UX 개선**

1. 필터 칩에 선택/해제 시 `select-bounce` 클래스 적용
2. 필터 결과 카운트 실시간 표시:
```tsx
<p className="text-xs text-slate-400 mb-3">{filteredFestivals.length}개 축제</p>
```
3. 빈 결과 UI:
```tsx
{filteredFestivals.length === 0 && (
  <div className="flex flex-col items-center py-16">
    <span className="text-5xl mb-3">🎪</span>
    <p className="text-sm text-slate-500 font-bold">조건에 맞는 축제가 없어요</p>
    <p className="text-xs text-slate-400 mt-1">검색 조건을 바꿔보세요</p>
  </div>
)}
```

- [ ] **Step 3: 상세 모달에 "이 축제 포함 코스 만들기" CTA 추가**

SpotDetailModal에서 축제인 경우:
```tsx
{isFestival && (
  <Link
    href={`/course?festivalId=${contentId}`}
    className="block mt-4 text-center py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white text-sm font-black rounded-2xl shadow-md"
  >
    🎪 이 축제 포함 코스 만들기
  </Link>
)}
```

- [ ] **Step 4: Intersection Observer로 stagger 페이드인**

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
  return () => observer.disconnect();
}, [filteredFestivals]);
```

- [ ] **Step 5: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add app/components/FestivalList.tsx
git commit -m "feat: 축제 페이지 리디자인 (카드, 필터 UX, 애니메이션)"
```

---

## Phase 5: 최종 통합 + .gitignore

### Task 18: .gitignore 업데이트 + 최종 빌드 확인

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: .gitignore에 .superpowers 추가**

```
.superpowers/
```

- [ ] **Step 2: 전체 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공, 모든 라우트 정상 등록

- [ ] **Step 3: 커밋 + push**

```bash
git add .gitignore
git commit -m "chore: .gitignore에 .superpowers 추가"
git push origin main
```

---

## 요약

| Phase | Tasks | 핵심 |
|-------|-------|------|
| 0 | Task 1~8 | 타입, CSS, 컴포넌트, API, AI 유틸 인프라 |
| 1 | Task 9~11 | 홈 화면 전면 리디자인 |
| 2 | Task 12~13 | 위저드 1박2일 + 세부카테고리 + 애니메이션 |
| 3 | Task 14~15 | 코스 결과 타임라인 + 운세 + 내레이션 |
| 4 | Task 16~17 | 축제 페이지 리디자인 |
| 5 | Task 18 | 최종 통합 |
