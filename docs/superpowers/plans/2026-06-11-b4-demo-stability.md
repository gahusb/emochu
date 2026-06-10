# B4 데모 안정성 Implementation Plan

> **For agentic workers:** Task 2는 superpowers:subagent-driven-development으로. Task 1(OG 카드)·Task 3(검증·배포)은 메인 세션 직접(ImageResponse 한글 렌더는 시각 확인 필요).

**Goal:** 홈/공유 카드용 브랜드 OG 이미지 + 첫 방문 위치 권한 안내 토스트(콜드 프롬프트 제거)로 심사 데모의 공유·첫인상을 방탄화한다.

**Architecture:** `app/opengraph-image.tsx`(ImageResponse + 번들 CookieRun 폰트)로 Next 파일 컨벤션 기반 OG 자동 주입. `LocationContext`는 마운트 콜드 프롬프트를 Permissions-API 인지(granted만 자동, 그 외 서울 소프트 기본)로 교체. 신규 `LocationPermissionToast`가 'prompt' 상태에서만 맥락 토스트로 권한 유도.

**Tech Stack:** Next.js 16 (App Router, next/og ImageResponse, nodejs runtime), React 19, Tailwind v4, lucide-react.

> **테스트 러너 없음**: `npx tsc --noEmit` + `npm run build` + 시각/스모크. 신규 테스트 프레임워크 금지. 명령은 PowerShell 한 줄(`cd "C:\Users\jaeoh\Desktop\workspace\emochu"; <cmd>`).
> **브랜치**: `feat/b4-demo-stability` (spec 커밋 존재).

---

## File Structure
| 파일 | 변경 |
|---|---|
| `app/opengraph-image.tsx` | **신규** — 브랜드 OG 카드(1200×630, CookieRun) |
| `app/components/nav/LocationPermissionToast.tsx` | **신규** — 첫 방문 위치 토스트 |
| `app/components/nav/LocationContext.tsx` | 마운트 콜드 프롬프트 → Permissions 인지 |
| `app/layout.tsx` | `<LocationPermissionToast />` 마운트 |

---

## Task 1: 브랜드 OG 카드 (메인 세션 직접)

**Files:** Create `app/opengraph-image.tsx`

- [ ] **Step 1: `app/opengraph-image.tsx` 생성** (이모지 미사용 — Satori 이모지 폰트 이슈 회피):

```tsx
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const alt = '이모추! — 이번 주에 모하지 추천';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const cookieRun = await readFile(join(process.cwd(), 'public/fonts/CookieRun-Bold.otf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF8F0 0%, #FFE0B8 55%, #FFB066 100%)',
          fontFamily: 'CookieRun',
        }}
      >
        <div style={{ fontSize: 150, color: '#7A3E00', lineHeight: 1 }}>이모추!</div>
        <div style={{ fontSize: 46, color: '#E8730C', marginTop: 18 }}>이번 주에 모하지 추천</div>
        <div style={{ fontSize: 34, color: '#8A5A2B', marginTop: 40 }}>AI 주말 나들이 코스 플래너</div>
        <div style={{ fontSize: 28, color: '#A06A3A', marginTop: 12 }}>위치 · 축제 · 날씨 → 10초 코스 완성</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'CookieRun', data: cookieRun, style: 'normal', weight: 700 }],
    },
  );
}
```

- [ ] **Step 2: 빌드** — `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run build` → `✓ Compiled successfully`.
- [ ] **Step 3: 시각 검증(dev)** — dev 서버 기동 후 `http://localhost:3000/opengraph-image` 를 다운로드해 Read로 확인. **확인 포인트**: "이모추!" 한글이 또렷하게 렌더되는가(글자 깨짐/tofu 없음), 그라데이션·레이아웃 정상.
- [ ] **Step 4: (조건부) 폰트 폴백** — 만약 CookieRun(OTF/CFF)이 Satori에서 깨지면: Pretendard TTF를 `public/fonts/Pretendard-Bold.ttf`로 받아(OFL 라이선스) `fontFamily:'Pretendard'`로 교체하고 Step 2~3 재확인. (CookieRun이 정상 렌더되면 이 단계 건너뜀.)
- [ ] **Step 5: 커밋** — `git add app/opengraph-image.tsx public/fonts/` → `feat(og): 브랜드 OG 카드 (ImageResponse + CookieRun)`. 본문 끝 Co-Authored-By.

---

## Task 2: 위치 권한 토스트 + 콜드 프롬프트 제거 (subagent)

**Files:** Create `app/components/nav/LocationPermissionToast.tsx`; Modify `app/components/nav/LocationContext.tsx`, `app/layout.tsx`

- [ ] **Step 1: `LocationContext.tsx` 마운트 useEffect 교체**

현재 35~61행의 `useEffect`(recent 로드 + 콜드 `getCurrentPosition`)를 다음으로 교체:

```tsx
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecentLocations(JSON.parse(raw));
    } catch {
      /* ignore */
    }

    if (!navigator.geolocation) {
      setLocationState(DEFAULT_SEOUL);
      return;
    }

    // 콜드 프롬프트 제거 — Permissions API로 분기.
    // granted: 끊김 없이 위치 / 그 외(prompt·denied·미지원): 서울 소프트 기본
    // (실제 권한 요청은 LocationPermissionToast가 맥락과 함께 유도)
    if (!navigator.permissions?.query) {
      setLocationState(DEFAULT_SEOUL);
      return;
    }
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              setLocationState({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: '내 근처' }),
            () => setLocationState(DEFAULT_SEOUL),
            { timeout: 5000 },
          );
        } else {
          setLocationState(DEFAULT_SEOUL);
        }
      })
      .catch(() => setLocationState(DEFAULT_SEOUL));
  }, []);
```
(나머지 `setLocation`/`requestGPS`/Provider는 변경 없음.)

- [ ] **Step 2: `LocationPermissionToast.tsx` 신규 생성**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useLocation } from './LocationContext';

const SEEN_KEY = 'emochu.loc_prompt_seen';

export default function LocationPermissionToast() {
  const { requestGPS } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (seen || !navigator.geolocation) return;

    let timer: ReturnType<typeof setTimeout>;
    const reveal = () => setShow(true);

    if (!navigator.permissions?.query) {
      timer = setTimeout(reveal, 1200);
      return () => clearTimeout(timer);
    }
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'prompt') timer = setTimeout(reveal, 1200);
      })
      .catch(() => {
        timer = setTimeout(reveal, 1200);
      });
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  const allow = async () => {
    await requestGPS();
    dismiss();
  };

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-40 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-6 px-4"
    >
      <div className="max-w-md mx-auto bg-surface-elevated border border-line rounded-xl shadow-lg p-4 flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center">
          <MapPin size={18} className="text-brand" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-1">내 주변 주말 코스를 추천받아 보세요</p>
          <p className="text-xs text-ink-3 mt-0.5">위치를 허용하면 더 정확한 코스를 만들어드려요</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={allow}
              className="h-9 px-4 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
            >
              위치 허용
            </button>
            <button
              onClick={dismiss}
              className="h-9 px-3 rounded-lg border border-line text-ink-3 text-sm hover:bg-surface-sunken transition-colors"
            >
              서울로 볼게요
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="닫기" className="text-ink-4 hover:text-ink-2 flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `app/layout.tsx`에 마운트** — `import LocationModal from './components/nav/LocationModal';` 아래에 `import LocationPermissionToast from './components/nav/LocationPermissionToast';` 추가하고, JSX의 `<LocationModal />` 다음 줄에 `<LocationPermissionToast />` 추가.

- [ ] **Step 4: 검증** — `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npx tsc --noEmit`(0 에러) + `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run build`(`✓ Compiled successfully`). (이 프로젝트는 테스트 러너 없음 — 추가 금지.)

- [ ] **Step 5: 커밋** — `git add app/components/nav/LocationContext.tsx app/components/nav/LocationPermissionToast.tsx app/layout.tsx` → `feat(nav): 첫 방문 위치 권한 안내 토스트 + 콜드 프롬프트 제거`. 본문 끝 Co-Authored-By.

---

## Task 3: 검증 · 배포 (메인 세션 직접)

- [ ] **Step 1: 최종 build** 통과 재확인.
- [ ] **Step 2: main 머지 + push** — `git checkout main; git merge --ff-only feat/b4-demo-stability; git push origin main`. (추가 기능이라 라이브 퇴보 없음 → 배포 가능. 자동배포 안 잡히면 빈 커밋 재트리거.)
- [ ] **Step 3: 라이브 스모크(헤드리스)** — 배포 후:
  - `/opengraph-image` → 200 + 이미지(Content-Type image/png), 다운로드해 한글 렌더 재확인
  - 홈 HTML(`curl/Invoke-WebRequest https://emochu.vercel.app/`)에 `og:image` 메타 존재
  - `/`·`/course`·`/festival`·기존 코스 slug GET 200
- [ ] **Step 4: 기상/육안 메모** — 신규 시크릿 방문 시 콜드 프롬프트 없이 토스트 노출, 4 브레이크포인트 토스트·OG 미리보기는 사용자 육안.

---

## 완료 기준
- `/opengraph-image`가 한글 또렷한 브랜드 카드 렌더 + 공유 메타 주입
- 콜드 위치 프롬프트 제거, 첫 방문 토스트 1회 노출(허용/서울 분기), granted 재방문자 끊김 없음
- `tsc`/`build` 통과, 라우트 스모크 200, 배포 완료
