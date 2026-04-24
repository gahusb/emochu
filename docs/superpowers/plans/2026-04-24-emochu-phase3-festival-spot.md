# 이모추 Phase 3 — FestivalList · Spot 상세 · Intercepting Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이모추의 마지막 옛 톤 영역 4개 파일(`FestivalList`·`SpotDetailModal`·`FacilityBadges`·`ImageGallery` 총 913줄)을 Phase 1/2 토큰·프리미티브 위로 이전하고, `SpotDetailModal` 을 Next.js App Router 의 Intercepting Routes + Parallel Routes 패턴(공유 URL + 모달 UX 하이브리드)으로 전환한다.

**Architecture:** `app/components/festival/` 하위 9개 파일로 FestivalList 분해 + 매거진 그리드. `SpotDetailModal` 폐기 후 `app/spot/[contentId]/page.tsx`(전용 페이지, 서버 컴포넌트) + `app/@modal/(.)spot/[contentId]/page.tsx`(인터셉트된 모달, 클라이언트) + `app/components/spot/SpotDetail.tsx`(공통 표시 UI) 3분해. 호출처 3곳(Home · CourseResultShell · FestivalCard)은 `setContentId` state 대신 `<Link href={`/spot/${id}`}>` 사용.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript 5 · Tailwind CSS v4 · Lucide React · Kakao Maps (기존)

**Spec:** `docs/superpowers/specs/2026-04-24-emochu-phase3-festival-spot-design.md`

---

## 검증 전략 (테스트 없음 환경)

Phase 1·2 와 동일하게 프로젝트에는 단위 테스트 인프라가 없다. UI 리팩토링 + 라우팅 구조 변화 특성상 다음 전략으로 검증:

- **빌드 검증**: 각 task 말미 `rm -rf .next && npm run build` → TypeScript·import·Next 빌드 0 에러
- **grep 검증**: 옛 컬러 클래스 · 이모지 · dead import 0건 확인
- **시각·라우팅 검증** (사용자 액션): `npm run dev` 로 모달 ↔ 전용 페이지 전환, 뒤로가기, 새로고침, 공유 링크 시나리오 확인
- **회귀 체크리스트**: 각 task 에 명시 (기존 저장 코스 조회, TourAPI fallback, 카카오맵 링크, 전화 연결 등)

---

## 파일 구조 (전체 변경 요약)

### 신규 파일 (16개)

```
app/
  @modal/
    default.tsx                                       (Task 1)
    (.)spot/
      [contentId]/
        page.tsx                                      (Task 1)
  spot/
    [contentId]/
      page.tsx                                        (Task 1)

  components/spot/
    SpotDetail.tsx                                    (Task 2)
    SpotDetailSkeleton.tsx                            (Task 2)
    SpotDetailModalFrame.tsx                          (Task 2)
    SpotPageBackButton.tsx                            (Task 2)

  components/festival/
    FestivalPageShell.tsx                             (Task 5)
    FestivalHeader.tsx                                (Task 5)
    FestivalFilterBar.tsx                             (Task 5)
    FestivalRadius.tsx                                (Task 5)
    FestivalRegionFilter.tsx                          (Task 5)
    FestivalGrid.tsx                                  (Task 5)
    FestivalCard.tsx                                  (Task 5)
    FestivalEmpty.tsx                                 (Task 5)
    FestivalSkeleton.tsx                              (Task 5)
```

### 수정 파일 (6개)

```
app/layout.tsx                                        (Task 1: modal slot 마운트)
app/(pages)/festival/page.tsx                         (Task 5: FestivalPageShell 마운트만)
app/components/FacilityBadges.tsx                     (Task 3)
app/components/ImageGallery.tsx                       (Task 4)
app/components/home/HomeView.tsx                      (Task 6: Link 전환)
app/components/course/result/StopCard.tsx             (Task 6: router.push)
app/components/course/result/Timeline.tsx             (Task 6: onOpenDetail prop 제거)
app/components/course/result/CourseResultShell.tsx    (Task 6: modalContentId 제거)
```

### 삭제 파일 (2개)

```
app/components/FestivalList.tsx                       (Task 5)
app/components/SpotDetailModal.tsx                    (Task 6)
```

---

## Task 1: Intercepting Routes 기반 구축

**Files:**
- Create: `app/@modal/default.tsx`
- Create: `app/@modal/(.)spot/[contentId]/page.tsx`
- Create: `app/spot/[contentId]/page.tsx`
- Create: `app/components/spot/SpotDetail.tsx` (스텁, Task 2 에서 완성)
- Create: `app/components/spot/SpotDetailSkeleton.tsx` (스텁)
- Create: `app/components/spot/SpotDetailModalFrame.tsx`
- Create: `app/components/spot/SpotPageBackButton.tsx`
- Modify: `app/layout.tsx`

**Goal:** 라우팅 구조만 먼저 세우고 Task 2 에서 `SpotDetail` UI 를 완성한다. Task 1 끝나면 `/spot/abc123` 수동 접속 시 placeholder 렌더, 타 라우트에서 `<Link href={`/spot/abc123`}>` 누르면 모달 오버레이 오픈이 동작해야 한다.

### Step 1.1: `app/@modal/default.tsx` 생성

- [ ] **파일 생성**

```tsx
export default function ModalDefault() {
  return null;
}
```

Parallel Routes 규칙 — 매칭되지 않는 경로에서 slot 을 렌더할 빈 기본값. 이 파일 없으면 매칭되지 않을 때 404 가 뜬다.

### Step 1.2: `app/layout.tsx` 에 modal slot 마운트

- [ ] **현재 파일 전체 읽기**

```bash
cat app/layout.tsx
```

- [ ] **Props 에 `modal` 추가 + body 에 `{modal}` 렌더**

기존 구조를 유지하면서 Props 시그니처에 `modal: React.ReactNode` 추가하고, `{children}` 렌더 근처(일반적으로 `<BottomTabBar />` 앞뒤)에 `{modal}` 마운트.

예시 (실제 기존 구조에 맞춰 조정):

```tsx
export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {/* 기존 Provider·GlobalHeader·main·BottomTabBar·KakaoSDK 구조 유지 */}
        {children}
        {modal}
      </body>
    </html>
  );
}
```

### Step 1.3: `app/components/spot/SpotDetail.tsx` 스텁 생성

Task 2 에서 완성할 공통 컴포넌트의 시그니처만 미리 정의.

- [ ] **파일 생성**

```tsx
export interface SpotDetailData {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr: string;
  tel: string;
  homepage: string;
  overview: string;
  mainImage: string;
  images: { url: string; thumbnail: string; name: string }[];
  lat: number;
  lng: number;
  introFields: { label: string; value: string }[];
  subInfo: { name: string; overview: string; image?: string }[];
}

interface Props {
  detail: SpotDetailData;
}

export default function SpotDetail({ detail }: Props) {
  // Task 2에서 완성
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
        {detail.title}
      </h1>
      <p className="text-sm text-ink-3 mt-2">Task 2에서 완성됩니다.</p>
    </div>
  );
}
```

### Step 1.4: `app/components/spot/SpotDetailSkeleton.tsx` 스텁

- [ ] **파일 생성**

```tsx
export default function SpotDetailSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <div className="h-8 w-3/4 skeleton rounded-md" />
      <div className="aspect-[4/3] w-full skeleton rounded-lg" />
      <div className="h-4 w-full skeleton rounded-md" />
      <div className="h-4 w-5/6 skeleton rounded-md" />
    </div>
  );
}
```

`.skeleton` 클래스는 Phase 1 globals.css 에 이미 존재.

### Step 1.5: `app/components/spot/SpotDetailModalFrame.tsx` — backdrop + 닫기 + 애니메이션

- [ ] **파일 생성**

```tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface Props { children: ReactNode; }

export default function SpotDetailModalFrame({ children }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdropRef = useRef(false);

  const close = () => router.back();

  // ESC 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // backdrop click 닫기 (드래그 선택 시 모달이 닫히는 버그 방지 — mousedown 기준)
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) close();
    mouseDownOnBackdropRef.current = false;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-[fadeIn_0.2s_ease-out]"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-ink-1/50 backdrop-blur-sm" aria-hidden="true" />
      {/* dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-5xl max-h-[90dvh] bg-surface-elevated rounded-t-2xl sm:rounded-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 drag handle */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden" aria-hidden="true">
          <div className="w-10 h-1 bg-line rounded-full" />
        </div>
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-ink-1/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-ink-1/60 transition-colors"
          aria-label="닫기"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        {/* 내용 */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
```

`@keyframes fadeIn` 는 Phase 2 Task 4 에서 이미 globals.css 에 추가됨. `slideUp` 은 이 파일에 inline 유지 (기존 SpotDetailModal 과 동일 패턴).

### Step 1.6: `app/components/spot/SpotPageBackButton.tsx`

- [ ] **파일 생성**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function SpotPageBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink-1 transition-colors py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-md"
      aria-label="뒤로가기"
    >
      <ArrowLeft size={18} strokeWidth={2} />
      <span>돌아가기</span>
    </button>
  );
}
```

### Step 1.7: `app/spot/[contentId]/page.tsx` — 전용 페이지 (서버 컴포넌트)

- [ ] **파일 생성**

```tsx
import type { Metadata } from 'next';
import Container from '@/app/components/ui/Container';
import SpotDetail from '@/app/components/spot/SpotDetail';
import type { SpotDetailData } from '@/app/components/spot/SpotDetail';
import SpotPageBackButton from '@/app/components/spot/SpotPageBackButton';
import { AlertCircle } from 'lucide-react';

async function fetchSpot(contentId: string): Promise<SpotDetailData | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/spot?contentId=${contentId}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function normalizeImageUrl(url: string): string {
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
}

export async function generateMetadata({ params }: { params: Promise<{ contentId: string }> }): Promise<Metadata> {
  const { contentId } = await params;
  const detail = await fetchSpot(contentId);
  if (!detail) {
    return { title: '이모추 | 장소를 찾을 수 없어요' };
  }
  const description = detail.overview?.slice(0, 120) ?? '이번 주말 나들이 장소로 어떠세요?';
  const image = normalizeImageUrl(detail.mainImage ?? '/hero/autumn-clear.jpg');
  return {
    title: `${detail.title} | 이모추`,
    description,
    openGraph: {
      title: detail.title,
      description,
      images: [image],
      type: 'article',
    },
  };
}

export default async function SpotPage({ params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  const detail = await fetchSpot(contentId);

  if (!detail) {
    return (
      <Container>
        <div className="py-12 flex flex-col items-center text-center">
          <AlertCircle size={48} strokeWidth={1.5} className="text-ink-4 mb-4" aria-hidden="true" />
          <h1 className="text-lg font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
            장소를 찾을 수 없어요
          </h1>
          <p className="text-sm text-ink-3 mt-2">링크가 만료되었거나 잘못된 주소예요</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-4">
        <SpotPageBackButton />
      </div>
      <SpotDetail detail={detail} />
    </Container>
  );
}
```

### Step 1.8: `app/@modal/(.)spot/[contentId]/page.tsx` — 인터셉트 모달 (클라이언트)

- [ ] **파일 생성**

```tsx
'use client';

import { useEffect, useState, use } from 'react';
import SpotDetail from '@/app/components/spot/SpotDetail';
import type { SpotDetailData } from '@/app/components/spot/SpotDetail';
import SpotDetailSkeleton from '@/app/components/spot/SpotDetailSkeleton';
import SpotDetailModalFrame from '@/app/components/spot/SpotDetailModalFrame';
import { AlertCircle } from 'lucide-react';

export default function InterceptedSpotModal({ params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = use(params);
  const [detail, setDetail] = useState<SpotDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    fetch(`/api/spot?contentId=${contentId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('상세 정보를 불러올 수 없어요');
        return res.json();
      })
      .then(setDetail)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [contentId]);

  return (
    <SpotDetailModalFrame>
      {loading && <SpotDetailSkeleton />}
      {error && !loading && (
        <div className="py-16 flex flex-col items-center px-6">
          <AlertCircle size={40} strokeWidth={1.5} className="text-ink-4 mb-3" aria-hidden="true" />
          <p className="text-sm text-ink-3 text-center break-keep">{error}</p>
        </div>
      )}
      {detail && !loading && <SpotDetail detail={detail} />}
    </SpotDetailModalFrame>
  );
}
```

### Step 1.9: 빌드 + 동작 확인

- [ ] **클린 빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -15
```

기대: 0 에러. `/spot/[contentId]` 라우트 + `@modal` parallel slot 생성됨.

- [ ] **(사용자 액션) 수동 라우팅 확인 — dev 서버 띄우고**

1. `/spot/test123` 직접 접속 → 전용 페이지 + `장소를 찾을 수 없어요` + 뒤로가기 버튼 (실제 contentId 있으면 placeholder SpotDetail 렌더)
2. `/festival` 이나 임의 페이지에서 브라우저 콘솔로 `location.href = '/spot/test123'` → 전용 페이지 이동 (intercept 조건은 Link 클릭이므로 직접 변경은 전용 페이지로 감)

### Step 1.10: 커밋

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/layout.tsx app/@modal/ app/spot/ app/components/spot/ && git commit -m "$(cat <<'EOF'
feat(phase3): Intercepting Routes 기반 + SpotDetail 스텁

Phase 3 라우팅 기반:
- app/@modal/default.tsx — Parallel Route 빈 slot
- app/@modal/(.)spot/[contentId]/page.tsx — 인터셉트된 모달 (client,
  SpotDetailModalFrame + SpotDetail)
- app/spot/[contentId]/page.tsx — 전용 페이지 (server, generateMetadata
  + OG tag, /api/spot revalidate: 3600)
- app/components/spot/ — SpotDetail(스텁), SpotDetailSkeleton(스텁),
  SpotDetailModalFrame(backdrop+ESC+slide-up), SpotPageBackButton
- app/layout.tsx — modal slot props + {modal} 마운트

SpotDetail 본체 UI는 Task 2에서 완성.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SpotDetail 공통 컴포넌트 완성

**Files:**
- Modify: `app/components/spot/SpotDetail.tsx` (스텁 → 완성본)
- Modify: `app/components/spot/SpotDetailSkeleton.tsx` (스켈레톤 정교화)

**Goal:** 데스크톱 2-column (좌 이미지 / 우 정보), 모바일 단일 컬럼 bottom-sheet 흐름. Phase 1 토큰 + Lucide + next/image. `FacilityBadges`/`ImageGallery` 는 Task 3·4 에서 리스타일하지만 여기서는 기존 버전 import 해도 OK (어차피 교체됨).

### Step 2.1: SpotDetail 본체 완성

- [ ] **`app/components/spot/SpotDetail.tsx` 전체 교체**

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, Globe, ChevronDown, ChevronUp, ImageOff } from 'lucide-react';
import Button from '@/app/components/ui/Button';

export interface SpotDetailData {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr: string;
  tel: string;
  homepage: string;
  overview: string;
  mainImage: string;
  images: { url: string; thumbnail: string; name: string }[];
  lat: number;
  lng: number;
  introFields: { label: string; value: string }[];
  subInfo: { name: string; overview: string; image?: string }[];
}

interface Props { detail: SpotDetailData; }

export default function SpotDetail({ detail }: Props) {
  const [activeImage, setActiveImage] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);

  const allImages = [
    ...(detail.mainImage ? [{ url: detail.mainImage, name: detail.title }] : []),
    ...detail.images.filter((img) => img.url !== detail.mainImage),
  ];

  const kakaoMapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(detail.title)},${detail.lat},${detail.lng}`;
  const telNumber = detail.tel ? detail.tel.replace(/[^0-9-]/g, '').split(',')[0]?.trim() : '';

  const needsFold = detail.overview.length > 200;

  return (
    <article className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0 lg:gap-8 max-w-5xl mx-auto lg:p-6">
      {/* ─── 좌: 이미지 갤러리 ─── */}
      <section className="lg:order-1" aria-label="이미지 갤러리">
        {allImages.length > 0 ? (
          <>
            <div className="relative aspect-[4/3] bg-surface-sunken overflow-hidden lg:rounded-lg">
              <Image
                key={allImages[activeImage]?.url}
                src={allImages[activeImage]?.url ?? ''}
                alt={allImages[activeImage]?.name || detail.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                unoptimized={allImages[activeImage]?.url.startsWith('http://')}
                priority
              />
              {allImages.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-ink-1/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  {activeImage + 1} / {allImages.length}
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-1.5 px-4 py-3 lg:px-0 overflow-x-auto" role="list">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`${i + 1}번째 이미지 보기`}
                    aria-pressed={activeImage === i}
                    className={`flex-shrink-0 relative w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                      activeImage === i ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={img.thumbnail || img.url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized={(img.thumbnail || img.url).startsWith('http://')}
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="relative aspect-[4/3] bg-surface-sunken flex items-center justify-center lg:rounded-lg">
            <ImageOff size={48} strokeWidth={1.5} className="text-ink-4" aria-hidden="true" />
          </div>
        )}
      </section>

      {/* ─── 우: 정보 섹션 ─── */}
      <section className="lg:order-2 px-5 py-5 lg:p-0" aria-label="장소 정보">
        <h1
          className="text-xl lg:text-2xl font-bold text-ink-1 break-keep"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {detail.title}
        </h1>

        {detail.addr && (
          <a
            href={kakaoMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-ink-3 hover:text-brand transition-colors"
          >
            <MapPin size={14} strokeWidth={1.75} className="flex-shrink-0" aria-hidden="true" />
            <span className="break-keep">{detail.addr}</span>
          </a>
        )}

        {/* ─── CTA 행 ─── */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            href={kakaoMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
          >
            <MapPin size={16} strokeWidth={2} />
            카카오맵
          </Link>
          {telNumber && (
            <a
              href={`tel:${telNumber}`}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold rounded-lg bg-transparent text-brand border border-brand hover:bg-brand-soft transition-colors"
            >
              <Phone size={16} strokeWidth={2} />
              전화
            </a>
          )}
          {detail.homepage && (
            <a
              href={detail.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold rounded-lg bg-transparent text-ink-2 hover:bg-surface-sunken transition-colors"
            >
              <Globe size={16} strokeWidth={2} />
              홈페이지
            </a>
          )}
        </div>

        {/* ─── 상세 정보 ─── */}
        {detail.introFields.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink-2 mb-2">상세 정보</h2>
            <dl className="bg-surface-sunken rounded-lg overflow-hidden divide-y divide-line">
              {detail.introFields.map(({ label, value }) => (
                <div key={label} className="flex px-4 py-3 gap-3">
                  <dt className="text-xs font-semibold text-ink-4 w-16 flex-shrink-0 pt-0.5">{label}</dt>
                  <dd className="text-xs text-ink-2 break-keep leading-relaxed flex-1">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* ─── 소개 ─── */}
        {detail.overview && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink-2 mb-2">소개</h2>
            <p
              className={`text-sm text-ink-2 leading-relaxed break-keep whitespace-pre-line ${
                !showFullOverview && needsFold ? 'line-clamp-4' : ''
              }`}
            >
              {detail.overview}
            </p>
            {needsFold && (
              <button
                type="button"
                onClick={() => setShowFullOverview((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-brand font-semibold mt-2 hover:underline"
                aria-expanded={showFullOverview}
              >
                {showFullOverview ? '접기' : '더보기'}
                {showFullOverview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        )}

        {/* ─── 세부 정보 (코스·객실 등) ─── */}
        {detail.subInfo.length > 0 && (
          <div className="mt-6 mb-4">
            <h2 className="text-sm font-semibold text-ink-2 mb-3">세부 정보</h2>
            <ul className="space-y-3">
              {detail.subInfo.map((item, idx) => (
                <li key={idx} className="bg-surface-sunken rounded-lg overflow-hidden">
                  {item.image && (
                    <div className="relative w-full h-32 bg-surface-sunken">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                        unoptimized={item.image.startsWith('http://')}
                      />
                    </div>
                  )}
                  <div className="px-4 py-3">
                    {item.name && <p className="text-xs font-semibold text-ink-2 mb-1">{item.name}</p>}
                    {item.overview && (
                      <p className="text-xs text-ink-3 leading-relaxed break-keep whitespace-pre-line">
                        {item.overview.length > 150 ? `${item.overview.slice(0, 150)}...` : item.overview}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </article>
  );
}
```

### Step 2.2: SpotDetailSkeleton 정교화

- [ ] **파일 전체 교체**

```tsx
export default function SpotDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0 lg:gap-8 max-w-5xl mx-auto lg:p-6">
      <div className="lg:order-1">
        <div className="aspect-[4/3] w-full skeleton lg:rounded-lg" />
      </div>
      <div className="lg:order-2 px-5 py-5 lg:p-0 space-y-3">
        <div className="h-6 w-2/3 skeleton rounded-md" />
        <div className="h-4 w-1/2 skeleton rounded-md" />
        <div className="flex gap-2 mt-4">
          <div className="h-11 w-28 skeleton rounded-lg" />
          <div className="h-11 w-20 skeleton rounded-lg" />
        </div>
        <div className="h-4 w-full skeleton rounded-md mt-6" />
        <div className="h-4 w-5/6 skeleton rounded-md" />
        <div className="h-4 w-4/6 skeleton rounded-md" />
      </div>
    </div>
  );
}
```

### Step 2.3: 빌드 + 커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -15
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/spot/ && git commit -m "$(cat <<'EOF'
feat(phase3): SpotDetail 공통 컴포넌트 완성

- 데스크톱 2-column (좌 이미지 갤러리 / 우 정보, max-w-5xl)
- 모바일 단일 컬럼 (이미지 → 썸네일 → 제목 → 주소 → CTA → 정보)
- next/image fill+sizes+priority, unoptimized http fallback
- Lucide 아이콘 (MapPin/Phone/Globe/ChevronDown/Up/ImageOff)
- Phase 1 토큰 (brand/ink/line/surface-sunken)
- 접근성: aria-label, aria-pressed, aria-expanded, role="list"
- overview 접힘/펼침 (200자 기준)
- subInfo 섹션 next/image 전환
- SpotDetailSkeleton: 실제 SpotDetail 레이아웃 미러링

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: FacilityBadges 리스타일

**Files:**
- Modify: `app/components/FacilityBadges.tsx`

### Step 3.1: 파일 전체 교체

- [ ] **파일 전체 교체**

```tsx
import { ParkingSquare, Baby, ToyBrick, Dog, Clock } from 'lucide-react';
import type { ComponentType } from 'react';
import type { FacilityInfo } from '@/lib/weekend-types';

type Size = 'sm' | 'md';

interface Props {
  facilities: FacilityInfo;
  size?: Size;
}

interface BadgeDef {
  key: keyof FacilityInfo;
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
}

const BADGES: BadgeDef[] = [
  { key: 'parking', Icon: ParkingSquare, label: '주차' },
  { key: 'babyCarriage', Icon: Baby, label: '유모차' },
  { key: 'kidsFacility', Icon: ToyBrick, label: '키즈' },
  { key: 'pet', Icon: Dog, label: '반려동물' },
];

const SIZE_CLASSES: Record<Size, { chip: string; icon: number }> = {
  sm: { chip: 'text-[11px] px-2 py-0.5 gap-1', icon: 12 },
  md: { chip: 'text-xs px-2.5 py-1 gap-1.5', icon: 14 },
};

export default function FacilityBadges({ facilities, size = 'sm' }: Props) {
  const activeBadges = BADGES.filter((b) => facilities[b.key] === true);
  const hasHours = Boolean(facilities.operatingHours);

  if (activeBadges.length === 0 && !hasHours) return null;

  const sz = SIZE_CLASSES[size];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeBadges.map(({ key, Icon, label }) => (
        <span
          key={key}
          className={`inline-flex items-center font-semibold rounded-md bg-brand-soft text-brand ${sz.chip}`}
          title={label}
        >
          <Icon size={sz.icon} strokeWidth={1.75} aria-hidden="true" />
          {size === 'md' && <span>{label}</span>}
        </span>
      ))}
      {hasHours && size === 'md' && (
        <span className={`inline-flex items-center font-semibold rounded-md bg-surface-sunken text-ink-2 ${sz.chip}`}>
          <Clock size={sz.icon} strokeWidth={1.75} aria-hidden="true" />
          <span>{facilities.operatingHours}</span>
        </span>
      )}
    </div>
  );
}
```

**변경점**
- `'use client'` 제거 (정보 표시용, 인터랙션 없음)
- 이모지 5종 → Lucide 아이콘
- `compact: boolean` → `size: 'sm' | 'md'` API 변경 (Phase 1 Badge API 통일)
- `bg-orange-50 text-orange-700` → `bg-brand-soft text-brand`
- `bg-slate-100 text-slate-600` → `bg-surface-sunken text-ink-2`

### Step 3.2: 사용처 호환성 확인

- [ ] **호출처 grep**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rn "FacilityBadges\|compact=" app/components/ lib/ 2>/dev/null | grep -v "node_modules"
```

기존 호출처가 `compact={true|false}` 를 쓰고 있으면 `size={"sm"|"md"}` 로 수정 필요. `compact` → `size="sm"`, 비압축 → `size="md"`.

### Step 3.3: 빌드 + 커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -10
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/FacilityBadges.tsx && git commit -m "$(cat <<'EOF'
feat(phase3): FacilityBadges 리스타일 — Lucide + 토큰 + size API

- 이모지 5종(🅿️👶🧒🐾⏰) → Lucide (ParkingSquare/Baby/ToyBrick/Dog/Clock)
- bg-orange-50 text-orange-700 → bg-brand-soft text-brand
- bg-slate-100 text-slate-600 → bg-surface-sunken text-ink-2
- API: compact: boolean → size: 'sm' | 'md' (Phase 1 Badge 통일)
- 'use client' 제거 (정보 표시용)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: ImageGallery 리스타일

**Files:**
- Modify: `app/components/ImageGallery.tsx`

### Step 4.1: 파일 전체 교체

- [ ] **파일 전체 교체**

```tsx
'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface Props {
  images: string[];
  alt: string;
  height?: string; // Tailwind height class (e.g., "h-36", "h-48")
  priority?: boolean; // 첫 이미지에 priority 적용
  sizes?: string;
}

export default function ImageGallery({
  images,
  alt,
  height = 'h-36',
  priority = false,
  sizes = '100vw',
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIndex(index);
  }, []);

  // 빈 / 단일
  if (images.length <= 1) {
    const src = images[0];
    return (
      <div className={`relative ${height} overflow-hidden bg-surface-sunken`}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover"
            unoptimized={src.startsWith('http://')}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={28} strokeWidth={1.5} className="text-ink-4" aria-hidden="true" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${height} overflow-hidden bg-surface-sunken`}
      role="region"
      aria-roledescription="image carousel"
      aria-label={alt}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((src, i) => (
          <div key={i} className="flex-shrink-0 w-full h-full snap-center relative">
            <Image
              src={src}
              alt={`${alt} ${i + 1} / ${images.length}`}
              fill
              sizes={sizes}
              className="object-cover"
              unoptimized={src.startsWith('http://')}
              priority={priority && i === 0}
              loading={priority && i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {/* 인디케이터 도트 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1" aria-hidden="true">
        {images.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'bg-white w-3' : 'bg-white/50 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

**변경점**
- `<img>` → `next/image` fill + sizes + unoptimized(http)
- `from-orange-200 to-pink-200` fallback → `bg-surface-sunken` + `ImageOff` Lucide
- `role="region"` + `aria-roledescription="image carousel"` + `aria-label`
- `priority` prop 옵션 (첫 이미지)
- 인디케이터 컬러 white 유지 (이미지 오버레이용 타당)

### Step 4.2: 빌드 + 커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -10
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/ImageGallery.tsx && git commit -m "$(cat <<'EOF'
feat(phase3): ImageGallery 리스타일 — next/image + ImageOff + ARIA

- raw <img> → next/image fill+sizes+unoptimized(http fallback)
- from-orange-200 to-pink-200 fallback → bg-surface-sunken + ImageOff Lucide
- role="region" + aria-roledescription + aria-label
- priority prop 옵션 (첫 이미지용)
- 인디케이터 도트 white 유지 (이미지 오버레이)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: FestivalList 재구축

**Files:**
- Create: `app/components/festival/FestivalPageShell.tsx`
- Create: `app/components/festival/FestivalHeader.tsx`
- Create: `app/components/festival/FestivalFilterBar.tsx`
- Create: `app/components/festival/FestivalRadius.tsx`
- Create: `app/components/festival/FestivalRegionFilter.tsx`
- Create: `app/components/festival/FestivalGrid.tsx`
- Create: `app/components/festival/FestivalCard.tsx`
- Create: `app/components/festival/FestivalEmpty.tsx`
- Create: `app/components/festival/FestivalSkeleton.tsx`
- Modify: `app/(pages)/festival/page.tsx`
- Delete: `app/components/FestivalList.tsx`

**Reference:** spec §4

### Step 5.1: `app/components/festival/FestivalCard.tsx`

- [ ] **파일 생성**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { PartyPopper } from 'lucide-react';
import type { FestivalCard as FestivalCardData } from '@/lib/weekend-types';

interface Props { festival: FestivalCardData; today: string; satStr: string; sunStr: string; }

function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return '';
  return `${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

function daysBetween(a: string, b: string): number {
  const ad = new Date(+a.slice(0, 4), +a.slice(4, 6) - 1, +a.slice(6, 8));
  const bd = new Date(+b.slice(0, 4), +b.slice(4, 6) - 1, +b.slice(6, 8));
  return Math.round((bd.getTime() - ad.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusBadge(f: FestivalCardData, today: string, satStr: string, sunStr: string): { label: string; className: string } | null {
  const ongoing = f.eventStart <= today && f.eventEnd >= today;
  const endingSoon = ongoing && daysBetween(today, f.eventEnd) <= 3;
  const thisWeekend = !ongoing && f.eventStart <= sunStr && f.eventEnd >= satStr;
  const upcoming = f.eventStart > today;

  if (endingSoon) return { label: '마감 임박', className: 'bg-warning-soft text-warning' };
  if (ongoing) return { label: '진행 중', className: 'bg-success-soft text-success' };
  if (thisWeekend) return { label: '이번 주말', className: 'bg-brand-soft text-brand' };
  if (upcoming) {
    const d = daysBetween(today, f.eventStart);
    return { label: `D-${d}`, className: 'bg-brand-soft text-brand' };
  }
  return null;
}

export default function FestivalCard({ festival: f, today, satStr, sunStr }: Props) {
  const dateStr = `${formatDate(f.eventStart)}${f.eventEnd && f.eventEnd !== f.eventStart ? ` ~ ${formatDate(f.eventEnd)}` : ''}`;
  const status = getStatusBadge(f, today, satStr, sunStr);
  const distanceStr = f.distanceKm != null ? `${f.distanceKm.toFixed(1)}km` : '';
  const region = f.addr1 ? f.addr1.split(' ')[0] : '';

  return (
    <Link
      href={`/spot/${f.contentId}`}
      className="group block bg-surface-elevated border border-line rounded-lg overflow-hidden hover:shadow-raised transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label={`${f.title}, ${region}, ${dateStr}, ${distanceStr}`}
    >
      <div className="relative aspect-[4/3] bg-surface-sunken overflow-hidden">
        {f.firstImage ? (
          <Image
            src={f.firstImage}
            alt={f.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={f.firstImage.startsWith('http://')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PartyPopper size={40} strokeWidth={1.5} className="text-role-festival" aria-hidden="true" />
          </div>
        )}
        {status && (
          <span className={`absolute top-3 left-3 inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md ${status.className}`}>
            {status.label}
          </span>
        )}
      </div>
      <div className="p-4 space-y-1">
        <h3 className="text-[15px] font-semibold text-ink-1 break-keep line-clamp-2">{f.title}</h3>
        <p className="text-xs text-ink-3 break-keep">
          {region} · {dateStr}
        </p>
        {distanceStr && <p className="text-[11px] text-ink-4">{distanceStr}</p>}
      </div>
    </Link>
  );
}
```

### Step 5.2: `FestivalSkeleton.tsx`

- [ ] **파일 생성**

```tsx
export default function FestivalSkeleton() {
  return (
    <div className="bg-surface-elevated border border-line rounded-lg overflow-hidden">
      <div className="aspect-[4/3] w-full skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 skeleton rounded-md" />
        <div className="h-3 w-1/2 skeleton rounded-md" />
        <div className="h-3 w-1/4 skeleton rounded-md" />
      </div>
    </div>
  );
}
```

### Step 5.3: `FestivalEmpty.tsx`

- [ ] **파일 생성**

```tsx
import { SearchX } from 'lucide-react';
import Button from '@/app/components/ui/Button';

interface Props { onExpandRadius: () => void; }

export default function FestivalEmpty({ onExpandRadius }: Props) {
  return (
    <div className="col-span-full flex flex-col items-center py-16 px-4 text-center">
      <SearchX size={48} strokeWidth={1.5} className="text-ink-4 mb-4" aria-hidden="true" />
      <h2 className="text-base font-bold text-ink-1" style={{ fontFamily: 'var(--font-display)' }}>
        조건에 맞는 축제가 없어요
      </h2>
      <p className="text-sm text-ink-3 mt-2">반경을 넓혀 보세요</p>
      <div className="mt-6">
        <Button variant="secondary" size="md" onClick={onExpandRadius}>
          반경 200km로 보기
        </Button>
      </div>
    </div>
  );
}
```

### Step 5.4: `FestivalRadius.tsx`

- [ ] **파일 생성**

```tsx
const RADIUS_OPTIONS = [30, 50, 100, 200];

interface Props { value: number; onChange: (radius: number) => void; }

export default function FestivalRadius({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="검색 반경" className="flex gap-2 overflow-x-auto">
      {RADIUS_OPTIONS.map((r) => {
        const selected = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={selected}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              selected
                ? 'bg-brand-soft border-brand text-brand'
                : 'bg-surface-elevated border-line text-ink-3 hover:border-ink-4'
            }`}
          >
            {r}km
          </button>
        );
      })}
    </div>
  );
}
```

### Step 5.5: `FestivalRegionFilter.tsx`

- [ ] **파일 생성**

```tsx
interface Props { regions: string[]; value: string; onChange: (region: string) => void; }

export default function FestivalRegionFilter({ regions, value, onChange }: Props) {
  return (
    <div role="group" aria-label="지역 필터" className="flex gap-1.5 overflow-x-auto snap-x lg:flex-wrap lg:overflow-visible">
      {regions.map((r) => {
        const selected = value === r;
        const label = r === 'all' ? '전체' : r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={selected}
            className={`flex-shrink-0 snap-start px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              selected
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-elevated border-line text-ink-3 hover:border-ink-4'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

### Step 5.6: `FestivalFilterBar.tsx`

- [ ] **파일 생성**

```tsx
import { ChevronDown } from 'lucide-react';

type StatusFilter = 'all' | 'ongoing' | 'thisWeekend' | 'upcoming';
type SortKey = 'distance' | 'endingSoon' | 'newest';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: '전체', ongoing: '진행 중', thisWeekend: '이번 주말', upcoming: '곧 시작',
};
const SORT_LABELS: Record<SortKey, string> = {
  distance: '가까운순', endingSoon: '종료임박순', newest: '최신순',
};

interface Props {
  status: StatusFilter;
  sort: SortKey;
  onStatusChange: (s: StatusFilter) => void;
  onSortChange: (s: SortKey) => void;
}

export default function FestivalFilterBar({ status, sort, onStatusChange, onSortChange }: Props) {
  return (
    <div className="sticky top-16 z-20 bg-surface-base/95 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between gap-4 py-3">
        <div role="tablist" aria-label="축제 상태 필터" className="flex items-center gap-4 overflow-x-auto">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => {
            const active = status === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onStatusChange(key)}
                className={`relative py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                {STATUS_LABELS[key]}
                {active && <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand" />}
              </button>
            );
          })}
        </div>
        <label className="relative flex-shrink-0">
          <span className="sr-only">정렬</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-md bg-surface-elevated border border-line text-ink-2 hover:border-ink-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>
          <ChevronDown size={14} strokeWidth={2} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden="true" />
        </label>
      </div>
    </div>
  );
}
```

### Step 5.7: `FestivalHeader.tsx`

- [ ] **파일 생성**

```tsx
interface Props {
  weekendLabel: string;
  locationName: string;
  radius: number;
  count: number;
}

export default function FestivalHeader({ weekendLabel, locationName, radius, count }: Props) {
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-4">
      <h1
        className="text-2xl lg:text-3xl font-bold text-ink-1 break-keep"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        이번 주말 근처 축제
      </h1>
      <p className="text-sm text-ink-3 mt-2">
        {weekendLabel && `${weekendLabel} · `}{locationName} · 반경 {radius}km · <span className="font-semibold text-ink-2">{count}개</span>
      </p>
    </section>
  );
}
```

### Step 5.8: `FestivalGrid.tsx`

- [ ] **파일 생성**

```tsx
import type { FestivalCard as FestivalCardData } from '@/lib/weekend-types';
import FestivalCard from './FestivalCard';
import FestivalSkeleton from './FestivalSkeleton';
import FestivalEmpty from './FestivalEmpty';

interface Props {
  festivals: FestivalCardData[];
  loading: boolean;
  today: string;
  satStr: string;
  sunStr: string;
  onExpandRadius: () => void;
}

export default function FestivalGrid({ festivals, loading, today, satStr, sunStr, onExpandRadius }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 8 }, (_, i) => <FestivalSkeleton key={i} />)
          : festivals.length > 0
            ? festivals.map((f) => (
                <FestivalCard key={f.contentId} festival={f} today={today} satStr={satStr} sunStr={sunStr} />
              ))
            : <FestivalEmpty onExpandRadius={onExpandRadius} />
        }
      </div>
    </div>
  );
}
```

### Step 5.9: `FestivalPageShell.tsx` — 전체 컨테이너

- [ ] **파일 생성**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FestivalCard as FestivalCardData } from '@/lib/weekend-types';
import FestivalHeader from './FestivalHeader';
import FestivalFilterBar from './FestivalFilterBar';
import FestivalRadius from './FestivalRadius';
import FestivalRegionFilter from './FestivalRegionFilter';
import FestivalGrid from './FestivalGrid';

type StatusFilter = 'all' | 'ongoing' | 'thisWeekend' | 'upcoming';
type SortKey = 'distance' | 'endingSoon' | 'newest';

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function extractRegion(addr: string): string {
  if (!addr) return '기타';
  const match = addr.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
  return match ? match[1] : '기타';
}

export default function FestivalPageShell() {
  const [festivals, setFestivals] = useState<FestivalCardData[]>([]);
  const [weekendLabel, setWeekendLabel] = useState('');
  const [weekendDates, setWeekendDates] = useState<{ saturday: string; sunday: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(50);
  const [locationName, setLocationName] = useState('위치 설정');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('distance');

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLoc({ lat: 37.5665, lng: 126.9780 });
      setLocationName('서울');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationName('내 근처');
      },
      () => {
        setUserLoc({ lat: 37.5665, lng: 126.9780 });
        setLocationName('서울');
      },
      { timeout: 5000 },
    );
  }, []);

  // Fetch
  useEffect(() => {
    if (!userLoc) return;
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/festival?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=${radius}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setFestivals(data.festivals || []);
        if (data.weekendDates) {
          setWeekendDates(data.weekendDates);
          const { saturday: sat, sunday: sun } = data.weekendDates;
          setWeekendLabel(`${sat.slice(4, 6)}/${sat.slice(6, 8)}~${sun.slice(6, 8)}`);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') { /* 무시, empty 상태로 */ }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [userLoc, radius]);

  const availableRegions = useMemo(() => {
    const regions = new Set(festivals.map((f) => extractRegion(f.addr1)));
    return ['all', ...Array.from(regions).sort()];
  }, [festivals]);

  const today = getTodayStr();
  const satStr = weekendDates?.saturday ?? '';
  const sunStr = weekendDates?.sunday ?? '';

  const filtered = useMemo(() => {
    let list = [...festivals];
    if (statusFilter === 'ongoing') list = list.filter((f) => f.eventStart <= today && f.eventEnd >= today);
    else if (statusFilter === 'thisWeekend') list = list.filter((f) => f.eventStart <= sunStr && f.eventEnd >= satStr);
    else if (statusFilter === 'upcoming') list = list.filter((f) => f.eventStart > today);

    if (regionFilter !== 'all') list = list.filter((f) => extractRegion(f.addr1) === regionFilter);

    if (sortKey === 'distance') list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    else if (sortKey === 'endingSoon') list.sort((a, b) => a.eventEnd.localeCompare(b.eventEnd));
    else if (sortKey === 'newest') list.sort((a, b) => b.eventStart.localeCompare(a.eventStart));

    return list;
  }, [festivals, statusFilter, regionFilter, sortKey, today, satStr, sunStr]);

  return (
    <>
      <FestivalHeader
        weekendLabel={weekendLabel}
        locationName={locationName}
        radius={radius}
        count={filtered.length}
      />
      <FestivalFilterBar
        status={statusFilter}
        sort={sortKey}
        onStatusChange={setStatusFilter}
        onSortChange={setSortKey}
      />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-4 space-y-3 border-b border-line">
        <FestivalRadius value={radius} onChange={setRadius} />
        <FestivalRegionFilter regions={availableRegions} value={regionFilter} onChange={setRegionFilter} />
      </div>
      <FestivalGrid
        festivals={filtered}
        loading={loading}
        today={today}
        satStr={satStr}
        sunStr={sunStr}
        onExpandRadius={() => setRadius(200)}
      />
    </>
  );
}
```

### Step 5.10: `app/(pages)/festival/page.tsx` 단순화

- [ ] **파일 전체 교체**

```tsx
import FestivalPageShell from '@/app/components/festival/FestivalPageShell';

export default function FestivalPage() {
  return <FestivalPageShell />;
}
```

기존 파일이 이미 단순 마운트면 import 경로만 변경. 기존 파일 구조에 맞춰 조정.

### Step 5.11: 옛 FestivalList.tsx 삭제

- [ ] **삭제**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm app/components/FestivalList.tsx
```

### Step 5.12: 빌드 + 커밋

- [ ] **빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -18
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/festival/ "app/(pages)/festival/page.tsx" && git rm app/components/FestivalList.tsx && git commit -m "$(cat <<'EOF'
feat(phase3): FestivalList 재구축 — 매거진 그리드 + Link 라우팅

- app/components/festival/ 9개 파일 신설
  · FestivalPageShell: fetch+state+필터 오케스트레이션
  · FestivalHeader: h1 + 요약 서브
  · FestivalFilterBar: 상태 탭 (role=tablist) + 정렬 select, sticky
  · FestivalRadius / FestivalRegionFilter: aria-pressed chip 그룹
  · FestivalGrid: sm 2col / lg 3col / xl 4col + loading/empty 분기
  · FestivalCard: 역할 컬러 D-Day 뱃지 + next/image + <Link>
  · FestivalSkeleton / FestivalEmpty
- 데스크톱 매거진 그리드, 모바일 단일 컬럼 유지
- 이모지 5종(🎪🎭🎵🎨🎉) 제거, PartyPopper fallback
- Link href=/spot/:id 라우팅 (Intercepting Routes 연동)
- 옛 FestivalList.tsx (467L) 삭제

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 호출처 3곳 전환 + SpotDetailModal 삭제

**Files:**
- Modify: `app/components/home/HomeView.tsx`
- Modify: `app/components/course/result/CourseResultShell.tsx`
- Modify: `app/components/course/result/Timeline.tsx`
- Modify: `app/components/course/result/StopCard.tsx`
- Delete: `app/components/SpotDetailModal.tsx`

### Step 6.1: HomeView — `<button onClick>` → `<Link>`

- [ ] **현재 호출처 확인**

```bash
grep -n "SpotDetailModal\|selectedContentId\|setSelectedContentId" app/components/home/HomeView.tsx
```

- [ ] **수정** — `SpotDetailModal` import 삭제, `selectedContentId` 관련 state 삭제, 카드 버튼 `<button>` → `<Link href={`/spot/${id}`}>`

패턴:

```diff
- import SpotDetailModal from '@/app/components/SpotDetailModal';
...
- const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
...
- <button
-   type="button"
-   onClick={() => setSelectedContentId(s.contentId)}
-   className="text-left w-full block"
-   aria-label={`${s.title} 상세 보기`}
- >
-   <SpotCard ... />
- </button>
+ <Link
+   href={`/spot/${s.contentId}`}
+   className="text-left w-full block"
+   aria-label={`${s.title} 상세 보기`}
+ >
+   <SpotCard ... />
+ </Link>

(축제 카드 wrapper도 동일 패턴)

- {selectedContentId && <SpotDetailModal contentId={selectedContentId} onClose={() => setSelectedContentId(null)} />}
```

`useState`·`SpotDetailModal` 사용이 사라졌으니 관련 import 도 정리.

### Step 6.2: CourseResultShell — modalContentId 제거

- [ ] **`CourseResultShell.tsx` 수정**

```diff
- import SpotDetailModal from '@/app/components/SpotDetailModal';
...
- const [modalContentId, setModalContentId] = useState<string | null>(null);
...
  <Timeline
    stops={visibleStops}
    activeIndex={activeIndex}
    onActivate={setActive}
-   onOpenDetail={(contentId) => setModalContentId(contentId)}
  />
...
- {modalContentId && (
-   <SpotDetailModal contentId={modalContentId} onClose={() => setModalContentId(null)} />
- )}
```

### Step 6.3: Timeline — onOpenDetail prop 제거

- [ ] **`Timeline.tsx` 수정**

```diff
  interface Props {
    stops: CourseStop[];
    activeIndex: number | null;
    onActivate: (index: number) => void;
-   onOpenDetail: (contentId: string) => void;
  }

  export default function Timeline({ stops, activeIndex, onActivate }: Props) {
    ...
    <StopCard
      stop={stop}
      isLast={i === stops.length - 1}
      isActive={activeIndex === i}
      onActivate={() => onActivate(i)}
-     onOpenDetail={() => onOpenDetail(stop.contentId)}
    />
```

### Step 6.4: StopCard — 두 번째 클릭 시 router.push 직접

- [ ] **`StopCard.tsx` 수정**

```diff
+ import { useRouter } from 'next/navigation';
...
  interface Props {
    stop: CourseStop;
    isLast: boolean;
    isActive: boolean;
    onActivate: () => void;
-   onOpenDetail: () => void;
  }

- export default function StopCard({ stop, isLast, isActive, onActivate, onOpenDetail }: Props) {
+ export default function StopCard({ stop, isLast, isActive, onActivate }: Props) {
+   const router = useRouter();
...
    <button
      type="button"
      onClick={() => {
-       if (isActive) onOpenDetail();
+       if (isActive) router.push(`/spot/${stop.contentId}`);
        else onActivate();
      }}
      aria-label={...}
      ...
    >
```

### Step 6.5: SpotDetailModal.tsx 삭제

- [ ] **파일 삭제**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm app/components/SpotDetailModal.tsx
```

### Step 6.6: 빌드 + 커밋

- [ ] **빌드 — type 에러 있을 시 호출처 수정된 것 확인**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -18
```

- [ ] **커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add app/components/home/HomeView.tsx app/components/course/result/ && git rm app/components/SpotDetailModal.tsx && git commit -m "$(cat <<'EOF'
feat(phase3): 호출처 3곳 Link 전환 + SpotDetailModal 삭제

Intercepting Routes 로 통합:
- HomeView: selectedContentId state 제거 → <Link href=/spot/:id>
- CourseResultShell: modalContentId state + SpotDetailModal 마운트 제거
- Timeline: onOpenDetail prop 제거 (drilling 단순화)
- StopCard: isActive 시 router.push(/spot/:id), useRouter 직접 사용
- 옛 SpotDetailModal.tsx (342L) 삭제

이제 세 호출처 모두 동일한 /spot/[contentId] 라우트로 통합.
/festival·Home·Course 어디서 눌리든 intercept된 모달이 오픈, 새로고침/
직접 접속 시 전용 페이지 (SEO·OG 공유).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 정리 & 최종 검증

**Files:** 검증 위주

### Step 7.1: 옛 컬러 grep (festival · spot · @modal 범위)

- [ ] **grep**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rEn "from-orange-|via-orange-|to-orange-|from-pink-|via-pink-|to-pink-|from-violet-|via-violet-|to-violet-|from-sky-|from-emerald-|from-amber-|from-rose-|from-cyan-|orange-400|orange-500|pink-400|sky-400|emerald-400|amber-400|rose-400|cyan-400|violet-400|orange-200|pink-200|violet-200|sky-200|emerald-200|amber-200" app/components/festival/ app/components/spot/ app/@modal/ app/spot/ 2>/dev/null; echo "---EXIT:$?---"
```

기대: 0 매치 (EXIT:1).

### Step 7.2: 이모지 grep

- [ ] **유니코드 이모지 범위 검색**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rPn "[\x{1F300}-\x{1F9FF}]|[\x{2600}-\x{27BF}]" app/components/festival/ app/components/spot/ app/@modal/ app/spot/ 2>/dev/null; echo "---EXIT:$?---"
```

기대: 0 매치. 주석 내 이모지는 허용 (렌더되지 않음).

### Step 7.3: Dead import grep

- [ ] **옛 파일 import 잔존 확인**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && grep -rn "from.*components/FestivalList\|from.*components/SpotDetailModal" app/ lib/ 2>/dev/null; echo "---EXIT:$?---"
```

기대: 0 매치.

### Step 7.4: 최종 클린 빌드

- [ ] **클린 빌드**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && rm -rf .next && npm run build 2>&1 | tail -18
```

기대: 0 에러. 라우트 목록에 `/spot/[contentId]` 포함.

### Step 7.5: 사용자 시각·라우팅 검증 (사용자 액션)

- [ ] **`npm run dev` 후 다음 시나리오 전체 확인**

**라우팅 시나리오**
1. `/festival` 에서 축제 카드 클릭 → 모달 오버레이 오픈, URL `/spot/:id` 로 변경
2. 뒤로가기 → 모달 닫힘, URL `/festival` 복귀, 스크롤 위치 유지
3. `/spot/:id` 새 탭 직접 접속 → 전용 페이지 풀 렌더 + 상단 `← 돌아가기`
4. `/course/:slug` StopCard 첫 클릭 → activate (지도 panTo + ring)
5. `/course/:slug` StopCard 두 번째 클릭 → 모달 오픈
6. `/` Home SpotCard · FestivalBadge 클릭 → 모달 오픈
7. 모달에서 ESC / backdrop / X 버튼 → 닫힘
8. 모달 내 카카오맵·전화·홈페이지 링크 정상 동작

**시각 시나리오 (4 브레이크포인트 1440 / 1024 / 768 / 375)**
- FestivalList 그리드 (xl 4col / lg 3col / sm 2col / mobile 1col)
- 필터 바 sticky 동작, 반경/지역 chip 전환
- 빈 상태 UI (반경 30km 강제)
- SpotDetail 데스크톱 2-column ↔ 모바일 bottom-sheet
- 이미지 썸네일 스크롤 · 활성 테두리

**공유 OG 확인 (배포 후)**
- `/spot/:id` URL 을 카카오톡에 붙여넣기 → 썸네일 + 제목 + 설명 정상 표시
- `NEXT_PUBLIC_SITE_URL` Vercel 환경변수 설정 확인

### Step 7.6: 시각 검증 중 발견 항목 정리 커밋 (필요 시)

- [ ] **(발견되면) 정리 커밋**

```bash
cd C:/Users/jaeoh/Desktop/workspace/emochu && git add -A && git commit -m "chore(phase3): 시각·라우팅 검증 후 사소한 정리 — [항목]"
```

---

## Task 8: code-reviewer 에이전트 전체 리뷰

### Step 8.1: 리뷰 요청

- [ ] **`superpowers:code-reviewer` 에이전트 호출**

리뷰 범위: `main..HEAD` (Task 1~7 커밋 전부). 6~8개 커밋.

검토 항목 (plan Task 8 기준):
1. 토큰 일관성 — festival · spot · @modal 영역에서 임의 컬러 직접 사용 0건
2. Intercepting Routes · Parallel Routes 구조 정합성 (default slot · (.) prefix · modal cleanup)
3. 반응형 정합성 (FestivalList 그리드 4단계 · SpotDetail 2-col ↔ bottom-sheet)
4. 접근성 (role=tablist/tab/region, aria-pressed/selected/label/modal, 키보드 네비)
5. 성능 (RSC 분기 — 전용 페이지는 server / 모달은 client, 데이터 중복 fetch 영향)
6. 호출처 전환 (Home·Result·Festival 모두 `<Link>` 또는 `router.push` 사용, dead state 0)
7. 공유 UX (generateMetadata, OG 이미지 http→https, fallback)
8. 데드 코드 / 사용 안 되는 import

### Step 8.2: Critical/Important 즉시 수정

- [ ] **이슈 분류 및 수정**

- Critical / Important 즉시 수정 → `rm -rf .next && npm run build` 재검증 → 별도 커밋 `fix(review): Phase 3 [이슈 요약]`
- Nice-to-have 는 spec §11 Backlog 로 이관
- 수정 후 re-review 요청 (필요 시)

---

## Self-Review Checklist (이 plan 작성자가 수행)

### Spec coverage

- [x] §2 FestivalList 데스크톱 매거진 그리드 → Task 5.8 (FestivalGrid)
- [x] §2 FestivalList 모바일 단일 컬럼 → Task 5.8 (grid-cols-1)
- [x] §2 SpotDetail 라우팅 (Intercepting) → Task 1
- [x] §2 SpotDetail 레이아웃 (2-column / bottom-sheet) → Task 2
- [x] §2 데이터 fetch 전략 (server / client 분기) → Task 1.7, 1.8
- [x] §2 호출처 3곳 전환 → Task 6
- [x] §2 FacilityBadges Lucide + 토큰 + size API → Task 3
- [x] §2 ImageGallery next/image + ImageOff + ARIA → Task 4
- [x] §2 이모지 전량 제거 → Task 3 (5종) · Task 5 (5종) · Task 2 (CTA 새로 작성으로 자연 제거)
- [x] §3.1 토큰 추가 없음 → 확인됨 (모두 기존 Phase 1/2 토큰 사용)
- [x] §3.2 신규 라우트 → Task 1 (4개 파일 + layout 수정)
- [x] §3.3 삭제 파일 → Task 5 (FestivalList) · Task 6 (SpotDetailModal)
- [x] §4 FestivalList 세부 → Task 5
- [x] §5 SpotDetail + Intercepting Routes 세부 → Task 1, 2
- [x] §6 FacilityBadges → Task 3
- [x] §7 ImageGallery → Task 4
- [x] §8 진행 순서 Task 1~8 → 본 plan 전체
- [x] §9 검증 전략 → Task 7
- [x] §10 위험 완화 → 각 Task 내장 (fallback, unoptimized http, 등)
- [x] §11 Backlog → spec 에 이미 있음, 재언급 불필요

### Placeholder scan
- [x] "TBD/TODO" 0건 확인 → 0건
- [x] "implement later" 0건 → 0건. (Task 1.3, 1.4 의 "Task 2에서 완성됩니다" 는 stub 의도 명시로 허용)
- [x] "비슷하게" / "동일 패턴" 으로 코드 생략 없음 → 모든 step 에 완전한 코드 제공

### Type consistency
- `SpotDetailData` interface — Task 1.3 에서 정의, Task 1.8 · 2.1 · 1.7 에서 동일 시그니처 사용
- `FestivalCardData` (`FestivalCard as FestivalCardData` alias) — Task 5.1, 5.8, 5.9 에서 동일 type 참조
- `Timeline` props — Task 6.3 에서 `onOpenDetail` 제거, Task 6.2 의 `<Timeline>` 호출과 일치
- `StopCard` props — Task 6.4 에서 `onOpenDetail` 제거, `Timeline` 호출 시그니처와 일치
- FestivalList 모든 컴포넌트 prop 타입 — Task 5.9 `FestivalPageShell` 이 5.4~5.8 호출 시 동일 시그니처로 전달
- `SpotDetailModalFrame` children prop (Task 1.5) — Task 1.8 에서 감싸는 구조와 일치
