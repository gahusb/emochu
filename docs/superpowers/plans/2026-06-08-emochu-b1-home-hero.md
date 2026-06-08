# B1 — Home Hero 품질 상향 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home Hero(및 AI 코스 CTA 카드)를 통제 불가능한 랜덤 TourAPI 사진/404 대신, AI 시네마틱 실사풍 큐레이션 6장 기반으로 전환해 심사 데모의 첫인상을 고품질·예측가능하게 만든다.

**Architecture:** `public/hero/`에 계절·날씨별 6장(`spring-clear`/`summer-clear`/`autumn-clear`/`winter-clear`/`rain`/`snow`)을 배치. `HomeHero`는 `getCuratedHeroImage(weather)`가 반환하는 큐레이션 컷을 메인으로 즉시 렌더하고, 로드 실패 시에만 항상 깔려있는 CSS 그라데이션이 노출된다. 랜덤 spot 사진 우선 경로(`pickHeroFromSpots`)와 그에 딸린 `spots` prop은 제거한다.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, next/image, 이미지 생성 = higgsfield MCP(우선) 또는 NAS image-lab.

> **테스트 인프라 주의:** 이 프로젝트엔 테스트 러너가 없다(package.json scripts = dev/build/start/lint, 이전 Phase 1·2·3도 무테스트 프론트 작업). 신규 프레임워크 도입은 YAGNI·기존 패턴 위반이므로 하지 않는다. 본 plan의 검증 게이트는 **`next lint` + `next build` 통과 + 명시적 수동 시각 확인**이다. 변경되는 로직(`getCuratedHeroImage`의 계절·날씨 분기)은 **수정 대상이 아니므로**(경로만 제거) 신규 단위 테스트 불필요.

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `public/hero/{spring-clear,summer-clear,autumn-clear,winter-clear,rain,snow}.jpg` | 큐레이션 Hero 자산 | **신규 6장** |
| `lib/hero-image.ts` | 계절·날씨 → 큐레이션 이미지 경로 매핑 | `pickHeroFromSpots` 및 미사용 import 제거 |
| `app/components/home/HomeHero.tsx` | Hero 섹션 렌더 | spot 경로·`spots` prop 제거, 큐레이션 단일 렌더 + onError→그라데이션, 운세 슬롯 주석 |
| `app/components/home/HomeView.tsx` | Home 조립 | `<HomeHero>` 호출에서 `spots` prop 제거 (184줄) |

---

## Task 1: Hero 이미지 6장 생성·큐레이션·배치

**Files:**
- Create: `public/hero/spring-clear.jpg`, `public/hero/summer-clear.jpg`, `public/hero/autumn-clear.jpg`, `public/hero/winter-clear.jpg`, `public/hero/rain.jpg`, `public/hero/snow.jpg`

- [ ] **Step 1: 공통 스타일 토큰 + 6장 프롬프트 확정**

모든 컷에 아래 접미 스타일을 동일하게 붙여 통일감을 확보한다:

```
— cinematic photoreal, golden-hour warm tone, wide establishing shot,
soft natural depth of field, no people, bottom third naturally darker
for text overlay, warm orange-leaning color grade, ultra detailed,
16:9 aspect, no text, no watermark
```

장면별 프롬프트(앞부분):

| 파일 | 장면 프롬프트 |
|---|---|
| `spring-clear.jpg` | `A serene Korean walking path lined with blooming cherry blossoms and fresh green foliage in soft spring light` |
| `summer-clear.jpg` | `A refreshing Korean coastal view with clear blue sea and lush green hills under bright summer sky` |
| `autumn-clear.jpg` | `A Korean mountain valley with traditional palace rooftops covered in golden and red autumn foliage` |
| `winter-clear.jpg` | `A clear crisp Korean winter landscape with bare trees and warm low sunlight against a deep blue sky, no snow` |
| `rain.jpg` | `A cozy rainy Korean street scene with wet pavement reflections and warm glowing shop lights, moody atmosphere` |
| `snow.jpg` | `A peaceful snowy Korean hanok village with gently falling snow, calm warm tones` |

- [ ] **Step 2: 6장 생성**

higgsfield MCP `generate_image`(우선) 또는 NAS image-lab(`flux`/`gpt_image`)로 위 6개 프롬프트를 16:9로 생성한다. 한 컷씩 생성해 스타일 일관성을 비교한다.

- [ ] **Step 3: 사용자 시각 검토 게이트 (필수)**

생성 결과를 사용자에게 보여주고(`SendUserFile` 또는 MCP 미리보기) 채택 여부를 받는다. 검수 포인트:
- 비현실적 왜곡(이상한 건축·잔물체) 없는가
- 6장 간 톤·grade 일관성
- 하단 1/3이 텍스트 얹기에 충분히 어두운가
- 피사체가 중앙 위주라 모바일 좌우 크롭에도 핵심이 살아있는가

반려 시 해당 컷만 프롬프트 미세조정 후 재생성. **사용자 채택 전 다음 단계로 넘어가지 않는다.**

- [ ] **Step 4: 채택본을 `public/hero/`에 저장**

채택된 이미지 URL을 정확한 파일명으로 내려받는다(PowerShell):

```powershell
$dir = "C:\Users\jaeoh\Desktop\workspace\emochu\public\hero"
New-Item -ItemType Directory -Force $dir | Out-Null
Invoke-WebRequest -Uri "<생성된 spring URL>" -OutFile "$dir\spring-clear.jpg"
# summer-clear / autumn-clear / winter-clear / rain / snow 동일 반복
```

- [ ] **Step 5: 6장 존재·용량 확인**

Run:
```powershell
Get-ChildItem "C:\Users\jaeoh\Desktop\workspace\emochu\public\hero" | Select-Object Name, @{n='KB';e={[math]::Round($_.Length/1KB)}}
```
Expected: 6개 파일(`spring-clear/summer-clear/autumn-clear/winter-clear/rain/snow.jpg`) 모두 존재.
참고: next/image가 로컬 이미지를 서빙 시 자동 최적화하므로 원본 용량은 절대 기준 아님. 다만 레포 비대화 방지를 위해 1장당 1MB를 크게 넘으면 압축 검토.

- [ ] **Step 6: Commit**

```powershell
cd "C:\Users\jaeoh\Desktop\workspace\emochu"
git add public/hero
git commit -m "feat(home): AI 시네마틱 실사풍 Hero 큐레이션 6장 추가 (404 해소)"
```

---

## Task 2: HomeHero·hero-image.ts 재배선 (랜덤 spot 경로 제거)

**Files:**
- Modify: `lib/hero-image.ts`
- Modify: `app/components/home/HomeHero.tsx`
- Modify: `app/components/home/HomeView.tsx:184`

- [ ] **Step 1: `lib/hero-image.ts`에서 `pickHeroFromSpots` 제거**

파일을 아래 내용으로 교체한다(미사용이 된 `SpotCard` import도 제거):

```ts
import type { WeekendWeather } from './weekend-types';
import { getSeason, type Season } from './hero-copy';

const CURATED: Record<Season | 'rain' | 'snow', string> = {
  spring: '/hero/spring-clear.jpg',
  summer: '/hero/summer-clear.jpg',
  autumn: '/hero/autumn-clear.jpg',
  winter: '/hero/winter-clear.jpg',
  rain: '/hero/rain.jpg',
  snow: '/hero/snow.jpg',
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

- [ ] **Step 2: `app/components/home/HomeHero.tsx` 교체**

`spots` prop·`pickHeroFromSpots`·spot 우선 useEffect를 제거하고, 큐레이션 단일 렌더 + onError 폴백 + 운세 슬롯 주석으로 정리한다. (LCP 보호를 위해 Hero 이미지엔 진입 애니메이션을 걸지 않는다.)

```tsx
'use client';

import { useState } from 'react';
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

  const copy = getHeroCopy(weather);
  const weekendLabel = getWeekendLabel();
  const locationLabel = location?.name ?? '내 근처';

  return (
    <section className="relative w-full h-[50vh] lg:h-[60vh] min-h-[420px] overflow-hidden">
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

      {/* 운세 토스트 슬롯 — 트랙 A(오늘의 운세) 도입 시 여기에 <FortuneToast /> 마운트 */}

      <div className="absolute inset-x-0 bottom-0">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pb-8 lg:pb-12">
          <p className="text-sm lg:text-base font-semibold text-white/80 mb-2">
            {weekendLabel} · {locationLabel}
          </p>
          <h1
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

- [ ] **Step 3: `app/components/home/HomeView.tsx`에서 `spots` prop 제거**

184번 줄을 수정한다:

```tsx
// Before
<HomeHero weather={weather} spots={spots} />
// After
<HomeHero weather={weather} />
```

`spots`는 HomeView의 "추천 관광지" 섹션에서 계속 쓰이므로 `useHomeData` 구조분해는 그대로 둔다.

- [ ] **Step 4: Lint 통과 확인**

Run:
```powershell
cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run lint
```
Expected: 에러 없음. 특히 미사용 import(`pickHeroFromSpots`, `SpotCard`, `useEffect`) 관련 경고가 없어야 한다.

- [ ] **Step 5: 빌드 통과 확인**

Run:
```powershell
cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run build
```
Expected: 빌드 성공(타입 에러 0). `HomeHero` prop 타입 변경이 호출처와 일치.

- [ ] **Step 6: Commit**

```powershell
git add lib/hero-image.ts app/components/home/HomeHero.tsx app/components/home/HomeView.tsx
git commit -m "refactor(home): Hero 랜덤 spot 경로 제거 → 큐레이션 단일 렌더 + 운세 슬롯 확보"
```

---

## Task 3: 검증 · 배포

**Files:** (코드 변경 없음 — 검증·배포만)

- [ ] **Step 1: 로컬 dev 기동 + 404 박멸 확인**

Run:
```powershell
cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run dev
```
브라우저 `http://localhost:3007` → DevTools Network 탭에서 `/hero/*.jpg`가 **200**으로 로드되는지 확인(이전엔 404). Hero 배경과 AI 코스 CTA 카드(`autumn-clear.jpg`) 둘 다 이미지가 보여야 한다.

- [ ] **Step 2: 계절·날씨 결정 선택 확인**

오늘(6월)은 `getSeason` 기준 `summer` → Hero가 `summer-clear.jpg`여야 한다. 날씨 분기 확인을 위해 일시적으로 `getCuratedHeroImage` 반환을 강제하거나, `weather` mock으로 `precipitation: 'rain'` 시 `rain.jpg`, `'snow'` 시 `snow.jpg`가 나오는지 확인 후 원복.

- [ ] **Step 3: 4 브레이크포인트 텍스트 가독성**

DevTools 반응형으로 375 / 768 / 1024 / 1440에서 6장 각각(또는 대표 컷)에 대해 라벨·H1·CTA 버튼이 하단 그라데이션 위에서 또렷이 읽히는지 확인. 모바일(375)에서 피사체 중앙 크롭이 깨지지 않는지 확인.

- [ ] **Step 4: Vercel 배포 + 라이브 확인**

main에 push되면 Vercel 자동 배포. 배포 후 `https://emochu.vercel.app`에서 Hero·CTA 카드 이미지 정상 로드, 콜드스타트 시 레이아웃 시프트 없는지 재확인.

```powershell
cd "C:\Users\jaeoh\Desktop\workspace\emochu"; git push
```

- [ ] **Step 5: 진행 트래커 갱신 (선택)**

`TODOLIST.md` Phase 3.3 "Home Hero 이미지 품질 상향" 항목 체크 + 트랙 B 진행 메모. 별도 커밋.

---

## 완료 기준 (Definition of Done)

- `public/hero/` 6장 200 OK, Hero·AI CTA 카드 모두 실 이미지 노출
- `npm run lint` · `npm run build` 통과
- 4 브레이크포인트 텍스트 가독성 확인
- 계절·날씨 시드에 따른 올바른 컷 선택 확인
- Vercel 라이브 URL에서 정상
- 6장 간 브랜드 톤 일관성(사용자 채택 게이트 통과)
