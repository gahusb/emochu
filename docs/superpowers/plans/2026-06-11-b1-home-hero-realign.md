# B1 Home Hero 재정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement Task 2. Task 1(이미지)·Task 3(검증·푸시)은 메인 세션이 직접 수행(MCP 이미지 생성·자율 품질 판정·배포 결정).

**Goal:** 현 main의 Home Hero를 "랜덤 TourAPI 사진 우선"에서 "AI 시네마틱 실사 큐레이션 6장(.png) 메인"으로 전환하고, 플레이스홀더 .png를 실사로 교체한다.

**Architecture:** `lib/hero-image.ts`의 `getCuratedHeroImage`(계절·날씨 결정적, .png)를 단일 소스로 쓰고, 실패 시 CSS 그라데이션. 랜덤 spot 경로(`pickHeroFromSpots`)·`spots` prop 제거. 운세 슬롯 없음(사주는 Wizard 소관). 이미지는 higgsfield `soul_location`(16:9).

**Tech Stack:** Next.js 16, React 19, Tailwind v4, next/image, higgsfield MCP.

> **테스트 러너 없음**: 검증은 `npx tsc --noEmit` + `npm run build` + 시각. 신규 테스트 프레임워크 금지.
> **브랜치**: `feat/b1-home-hero-v2` (spec 커밋 존재). 배포 결정은 §Task 3.

---

## File Structure
| 파일 | 변경 |
|---|---|
| `public/hero/{spring-clear,summer-clear,autumn-clear,winter-clear,rain,snow}.png` | 플레이스홀더 → 실사 교체 |
| `lib/hero-image.ts` | `pickHeroFromSpots` + 미사용 `SpotCard` import 제거 |
| `app/components/home/HomeHero.tsx` | spot-first·`spots` prop·`tried`·`useEffect(spot)` 제거 → 큐레이션 단일 + `failed` 폴백 + aria |
| `app/components/home/HomeView.tsx` | `<HomeHero>` 호출에서 `spots` prop 제거 |

---

## Task 1: 시네마틱 실사 6장 생성·교체 (메인 세션 직접)

**Files:** `public/hero/*.png` (6장 덮어쓰기)

- [ ] **Step 1: 6장 생성** — higgsfield `soul_location`, `aspect_ratio: "16:9"`, 공통 스타일 접미: `cinematic photoreal, golden-hour warm tone, wide establishing shot, no people, bottom third darkened, warm tone, no text`. 장면: spring=벚꽃 산책로 / summer=시원한 바다·계곡 / autumn=단풍 산·고궁 / winter=맑은 겨울 햇살(설경 아님) / rain=비 오는 거리·따뜻한 창가 / snow=눈 내리는 한옥.
- [ ] **Step 2: 자율 시각 검토** — 각 생성물을 Read로 확인. 비현실 왜곡·톤 불일치·하단 너무 밝아 텍스트 안 묻힘 → 재생성(크레딧 충분).
- [ ] **Step 3: 채택본을 `public/hero/<name>.png`로 다운로드**(PowerShell `Invoke-WebRequest`), 기존 플레이스홀더 덮어쓰기.
- [ ] **Step 4: 6장 200 확인**(`Get-ChildItem public/hero`). **Step 5: 커밋** `feat(home): AI 시네마틱 실사 Hero 6장 (.png 플레이스홀더 교체)`.

---

## Task 2: 코드 — 큐레이션 우선 전환 (subagent)

**Files:** `lib/hero-image.ts`, `app/components/home/HomeHero.tsx`, `app/components/home/HomeView.tsx`

- [ ] **Step 1: `lib/hero-image.ts` 교체** (`pickHeroFromSpots`·`SpotCard` import 제거, .png 경로 유지):

```ts
import type { WeekendWeather } from './weekend-types';
import { getSeason, type Season } from './hero-copy';

const CURATED: Record<Season | 'rain' | 'snow', string> = {
  spring: '/hero/spring-clear.png',
  summer: '/hero/summer-clear.png',
  autumn: '/hero/autumn-clear.png',
  winter: '/hero/winter-clear.png',
  rain: '/hero/rain.png',
  snow: '/hero/snow.png',
};

export function getCuratedHeroImage(
  weather: WeekendWeather | null,
  date: Date = new Date(),
): string {
  const sat = weather?.saturday;
  const sun = weather?.sunday;

  if (sat?.precipitation === 'snow' || sun?.precipitation === 'snow') return CURATED.snow;
  if (
    sat?.precipitation === 'rain' || sun?.precipitation === 'rain' ||
    sat?.precipitation === 'mixed' || sun?.precipitation === 'mixed'
  ) return CURATED.rain;

  return CURATED[getSeason(date)];
}
```

- [ ] **Step 2: `app/components/home/HomeHero.tsx` 교체** (spot 경로·spots prop 제거, 큐레이션 단일 + failed 폴백 + imgSrc 변경 시 failed 리셋 + aria-labelledby, 운세 슬롯 없음, LCP 애니메이션 없음):

```tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { WeekendWeather } from '@/lib/weekend-types';
import { getHeroCopy, getWeekendLabel } from '@/lib/hero-copy';
import { getCuratedHeroImage } from '@/lib/hero-image';
import { useLocation } from '../nav/LocationContext';

interface Props {
  weather: WeekendWeather | null;
}

export default function HomeHero({ weather }: Props) {
  const { location } = useLocation();
  const [failed, setFailed] = useState(false);
  const imgSrc = getCuratedHeroImage(weather);

  useEffect(() => {
    setFailed(false);
  }, [imgSrc]);

  const copy = getHeroCopy(weather);
  const weekendLabel = getWeekendLabel();
  const locationLabel = location?.name ?? '내 근처';

  return (
    <section className="relative w-full h-[50vh] lg:h-[60vh] min-h-[420px] overflow-hidden" aria-labelledby="hero-heading">
      {/* Always-on gradient base — visible if the curated image fails to load */}
      <div className="absolute inset-0 bg-gradient-to-br from-hero-fallback-start via-hero-fallback-mid to-hero-fallback-end" aria-hidden="true" />
      {!failed && (
        <Image
          src={imgSrc}
          alt="이번 주말의 풍경"
          fill
          sizes="100vw"
          priority
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-1/70 via-ink-1/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pb-8 lg:pb-12">
          <p className="text-sm lg:text-base font-semibold text-white/80 mb-2">
            {weekendLabel} · {locationLabel}
          </p>
          <h1
            id="hero-heading"
            className="text-3xl lg:text-5xl font-bold text-white leading-tight break-keep max-w-2xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {copy}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              href="/course"
              className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
            >
              <Sparkles size={18} strokeWidth={2} />
              <span>AI 코스 만들기</span>
            </Link>
            <a
              href="#recommended"
              className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-white/15 backdrop-blur text-white font-semibold border border-white/30 hover:bg-white/25 transition-colors"
            >
              <span>추천 둘러보기</span>
              <ArrowRight size={18} strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: `app/components/home/HomeView.tsx`** — `<HomeHero weather={weather} spots={spots} />`(184행 부근)를 `<HomeHero weather={weather} />`로. `useHomeData`의 `spots` 구조분해는 유지(추천 관광지 섹션에서 사용).

- [ ] **Step 4: 검증** — `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npx tsc --noEmit`(0 에러, 미사용 import 경고 없음) + `npm run build`(`✓ Compiled successfully`). (PowerShell, 한 줄)

- [ ] **Step 5: 커밋** — `git add lib/hero-image.ts app/components/home/HomeHero.tsx app/components/home/HomeView.tsx` → `refactor(home): Hero 랜덤 spot 경로 제거 → 큐레이션(.png) 단일 렌더`. 본문 끝 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Task 3: 검증 · 배포 결정 (메인 세션 직접)

- [ ] **Step 1: 최종 build** — `npm run build` 통과 재확인(Task1 이미지 + Task2 코드 합쳐서).
- [ ] **Step 2: 배포 결정 (자율 규칙)**:
  - **이미지 6장 양호(자체 검토 통과) + build OK** → `git checkout main; git merge --ff-only feat/b1-home-hero-v2; git push origin main` (Vercel 배포). 푸시 후 자동배포 안 잡히면 빈 커밋 재트리거(`6959bbf` 사례).
  - **품질 확신 부족** → `git push -u origin feat/b1-home-hero-v2`만(브랜치, main 미머지·배포 안 함). 기상 후 검토 요청.
- [ ] **Step 3: 기상 후 항목 메모** — 4 브레이크포인트 시각·라이브 Hero 재확인은 사용자 기상 후.

---

## 완료 기준
- `public/hero/*.png` 6장 실사 교체, `tsc`/`build` 통과
- 큐레이션 단일 렌더(랜덤 spot 제거), HomeView AI CTA 카드도 실사
- 배포 결정 규칙(§Task3 Step2)에 따라 push 완료(main 또는 브랜치)
