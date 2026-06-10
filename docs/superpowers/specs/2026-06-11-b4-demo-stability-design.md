# B4 데모 안정성 설계 (Spec) — OG 카드 + 위치 권한 토스트

> **작성일**: 2026-06-11
> **트랙**: 트랙 B(디자인·안정성) — 심사 라이브 데모 방탄
> **점수 레버**: 활용성 15 · 디자인 20(공유 첫인상)
> **승인**: 스코프 승인 (2026-06-11, B4b 접근법 A)

---

## 1. 배경 / 현 상태

심사위원이 ① 링크를 공유받거나 ② 사이트에 처음 들어올 때의 첫인상이 데모 성패를 좌우한다. 현 상태의 두 구멍:

- **루트 OG `images` 없음** (`app/layout.tsx`): 홈/대부분 페이지를 카카오톡·SNS로 공유하면 **미리보기 이미지가 빈 카드**. (코스 상세 `course/[slug]`만 TourAPI 사진을 og:image로 씀)
- **콜드 위치 프롬프트** (`LocationContext.tsx`): 마운트 즉시 `navigator.geolocation.getCurrentPosition` 호출 → **맥락 없는 브라우저 권한 팝업**이 첫 화면에서 뜸 → 거부율↑, 첫인상↓.

부수 확인:
- `NEXT_PUBLIC_SITE_URL`은 `.env.local`에 미설정이나 코드가 `'https://emochu.vercel.app'`로 폴백(동작 OK) → 메모만.
- 루트 `public/`에 OG 이미지 없음.

## 2. 목표 / 비목표

### 목표
- **B4a**: 홈/기본 공유 카드용 **브랜드 OG 이미지**(1200×630) 자동 생성.
- **B4b**: 첫 방문 **위치 권한 안내 토스트** — 콜드 프롬프트 제거, 맥락 제공, 거부율↓. 이미 허용한 재방문자는 끊김 없이 위치 사용.
- **B4c**: 라우트 스모크·OG 렌더·브레이크포인트 검증.

### 비목표 (YAGNI)
- course/[slug] OG 동적 이미지 고도화(현 TourAPI 사진 유지)
- `NEXT_PUBLIC_SITE_URL` 환경변수 신규 설정(폴백 동작 → 선택)
- 위치 토스트 재노출 TTL(1회만, localStorage)

---

## 3. 설계

### 3.1 B4a — 브랜드 OG 카드 (`app/opengraph-image.tsx`)

Next.js 파일 컨벤션 `app/opengraph-image.tsx`(default export → `ImageResponse`)를 추가하면 **하위 모든 라우트에 og:image 메타가 자동 주입**된다(layout 수동 추가 불필요). 1200×630.

> **한글 폰트 필수**: `ImageResponse`(Satori) 기본 폰트는 한글 글리프 미포함 → "이모추"가 깨짐. 번들된 `public/fonts/CookieRun-Bold.otf`를 로드해 사용.

레이아웃(ASCII):
```
┌──────────────────────────────────────┐
│  (따뜻한 오렌지 그라데이션 배경)         │
│                                      │
│            이모추!                    │  ← CookieRun, 대형, ink-1
│      이번 주에 모하지 추천              │  ← 서브, brand
│                                      │
│   AI 주말 나들이 코스 플래너            │  ← 태그라인, ink-3
│   📍 위치 · 🎉 축제 · ☀️ 날씨 → 10초    │
└──────────────────────────────────────┘
```
- 배경: 브랜드 톤(#FFF8F0 → orange-300 그라데이션). `runtime = 'nodejs'`로 폰트 파일 안정 로드.
- `alt`/`size`/`contentType` export 포함.

### 3.2 B4b — 위치 권한 안내 토스트

**LocationContext 마운트 로직 변경** (콜드 프롬프트 제거, Permissions API 활용):
```
recent locations 로드
if (!navigator.geolocation) { setSeoul; return }
navigator.permissions.query({ name: 'geolocation' })
  .then(status => {
    if (status.state === 'granted') { getCurrentPosition() → setLocation }  // 재방문 허용자: 끊김 없음
    else { setSeoul }                                                       // 'prompt'/'denied': 소프트 기본(프롬프트 X)
  })
  .catch(() => setSeoul)                                                    // Permissions 미지원: 소프트 기본
```
→ 홈 데이터는 항상 location(서울 또는 실제)으로 로드되어 안 깨짐. 콜드 프롬프트는 사라짐.

**신규 `app/components/nav/LocationPermissionToast.tsx`** (client, layout에 마운트):
- 마운트 시: `localStorage['emochu.loc_prompt_seen']` 없음 + Permissions state `'prompt'`(미지원 시 prompt로 간주) → 짧은 지연 후 토스트 표시.
- UI(하단, BottomTabBar 위, `role="status"`):
```
┌───────────────────────────────────────┐
│ 📍 내 주변 주말 코스를 추천받아 보세요   │
│    위치를 허용하면 더 정확해져요          │
│         [ 위치 허용 ]  [ 서울로 볼게요 ] ✕│
└───────────────────────────────────────┘
```
- **[위치 허용]** → `requestGPS()`(맥락 있는 진짜 프롬프트) → seen 저장 → 닫기.
- **[서울로 볼게요]/✕** → seen 저장 → 닫기(서울 기본 유지).
- 한 번만 노출.

### 3.3 변경 단위
| 파일 | 변경 |
|---|---|
| `app/opengraph-image.tsx` | **신규** — 브랜드 OG 카드(ImageResponse + CookieRun) |
| `app/components/nav/LocationPermissionToast.tsx` | **신규** — 첫 방문 위치 안내 토스트 |
| `app/components/nav/LocationContext.tsx` | 마운트: 콜드 프롬프트 → Permissions 인지(granted만 자동, 그 외 서울) |
| `app/layout.tsx` | `<LocationPermissionToast />` 마운트(LocationModal 옆) |

## 4. 검증 (B4c)
테스트 러너 없음 → `npx tsc --noEmit` + `npm run build` + 다음:
- [ ] 라우트 스모크: 배포 후 `/`·`/course`·`/festival`·기존 코스 slug·`/spot/<contentId>` 모두 200 (헤드리스 GET)
- [ ] OG 렌더: 배포 후 `/opengraph-image` 200(이미지) + 홈 HTML에 `og:image` 메타 존재
- [ ] 위치 토스트: 신규 방문(시크릿) 시 콜드 프롬프트 없이 토스트 노출, [허용]→프롬프트, [서울]→유지, 재방문 시 미노출
- [ ] 4 브레이크포인트(1440/1024/768/375) 토스트·OG 미리보기 육안(사용자)
- [ ] `tsc`/`build` 통과

## 5. 위험 / 가드레일
- **ImageResponse 한글 폰트**: CookieRun 미로드 시 글자 깨짐 → 폰트 로드 검증 필수(빌드 후 `/opengraph-image` 실제 확인).
- **LocationContext 변경 파급**: WizardShell의 'nearby' 위치 요청은 독립이라 영향 없음. granted 재방문자 끊김 없음 보장.
- **Permissions API 미지원 브라우저**: catch→서울 기본 + 토스트는 prompt로 간주해 노출(여전히 안전).
- 라이브 퇴보 없음: 추가 기능(OG 파일·토스트)이라 기존 흐름 비파괴.
