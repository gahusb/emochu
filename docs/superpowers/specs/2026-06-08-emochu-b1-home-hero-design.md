# B1 — Home Hero 품질 상향 설계 (Spec)

> **작성일**: 2026-06-08
> **트랙**: 트랙 B(디자인·발표 우선) — 1순위 사업 단위
> **점수 레버**: 디자인 20
> **규모**: 약 1일
> **상태**: 설계 승인 (2026-06-08)

---

## 1. 배경 / 문제

최종 심사(2026 관광데이터 활용 공모전 웹·앱 부문)는 8~9월. 베이스라인 서비스
(`emochu.vercel.app`)는 코스 생성→지도→공유까지 정상 작동 검증됨. 남은 시간은
"점수를 끌어올리는" 구간이며, 트랙 B(보이는 완성도)를 1순위로 선택.

심사위원이 가장 먼저 보는 화면은 Home Hero인데, 현재 Hero 첫인상이 통제되지 않음:

### 현재 동작 (`lib/hero-image.ts` + `app/components/home/HomeHero.tsx`)

1. **초기값**: `getCuratedHeroImage()` → `/hero/spring-clear.jpg` 등 참조
   — **그러나 `public/hero/` 디렉토리 자체가 없음 → 6개 경로 전부 404**
2. **useEffect**: `pickHeroFromSpots(spots)` → TourAPI spot의 `firstImage`(랜덤
   관광지 사진, http URL)로 교체. 이게 사실상 메인 경로.
3. **onError**: 큐레이션(404) → 최종적으로 CSS 그라데이션(`hero-fallback-*`)으로 추락.

결과: Hero 첫인상 = **"그날 TourAPI가 던져준 랜덤 관광지 사진"** 또는 **밋밋한 그라데이션**.
브랜드 톤(따뜻한 오렌지 #FFF8F0 / orange-400~500, CookieRun)도, 품질 통제도, 라이브
데모 예측 가능성도 없음.

---

## 2. 목표 / 비목표

### 목표
- Hero를 **브랜드 큐레이션 6장 메인 + 그라데이션 최종 폴백** 구조로 전환
- 6장을 **AI 생성 시네마틱 실사풍**으로 일관되게 제작, 텍스트 가독성·브랜드 톤 통제
- 4 브레이크포인트(375/768/1024/1440)에서 텍스트 가독성·구도 생존
- 404 박멸, LCP priority 이미지 정상

### 비목표 (YAGNI)
- 운세 기능 구현 (트랙 A) — 단, **빈 슬롯 자리만** Hero 상단에 주석으로 확보
- 다국어 Hero 카피 (Phase 5)
- Hero 캐러셀/자동 슬라이드 — 계절·날씨 단일 선택 유지
- TourAPI spot 사진 동적 Hero — 본 설계에서 메인 경로 제거 대상

---

## 3. 설계

### 3.1 렌더링 전략 (로직 반전)

```
큐레이션 6장 (메인, 계절+날씨 결정) → [로드 실패 시] CSS 그라데이션 (최종 안전망)
```

- `pickHeroFromSpots` 메인 경로 **제거** (랜덤 spot 사진 우선순위 폐기)
- 선택 로직은 현행 유지: **계절 + 날씨 기반 결정적 선택**
  - 여름 → `summer-clear`, 비 예보 → `rain`, 눈 예보 → `snow` 등
  - 기존 `getCuratedHeroImage(weather, date)` 시그니처·분기 그대로 사용
- `priority` LCP 이미지 → 즉시 로드
- `onError` 폴백은 그라데이션 유지 (큐레이션이 채워지면 실질적으로 발동 안 함)

### 3.2 Hero 구도 규격 (6장 공통 제약)

```
┌─────────────────────────────┐
│   밝은 풍경 — 골든아워 톤      │  상단: 선명·밝게
│        (피사체 중앙 배치)      │  모바일 center-crop 생존
│                             │
│░░ 다크 그라데이션 (가독성) ░░░░│  하단 1/3 어둡게 (텍스트 영역)
│ {주말라벨} · {위치}           │
│ 이번 주말, 햇살 따라 어디로?   │  CookieRun, white
│ [✨AI 코스 만들기] [추천 →]    │
└─────────────────────────────┘
```

이미지 자체 제약:
- **16:9 와이드** (모바일 50vh / 데스크탑 60vh `object-cover` 양쪽에서 중앙 생존)
- **하단 1/3 어둡게** (코드 그라데이션 `from-ink-1/70`과 이중으로 텍스트 보호)
- **피사체 중앙 배치** (모바일 좌우 크롭에도 핵심 유지)
- **텍스트 baked-in 절대 금지** (카피는 코드 렌더)
- **전경 인물 없음** (초상권·일관성)

### 3.3 6장 AI 생성 프롬프트 전략

공통 스타일 토큰 (모든 컷에 적용해 통일감 확보):
```
cinematic photoreal, golden-hour warm tone, Korean scenery,
wide establishing shot, soft natural depth, no foreground people,
bottom-third naturally darkened, warm orange-leaning color grade,
high detail, no text, 16:9
```

| 파일 | 장면 의도 |
|---|---|
| `spring-clear.jpg` | 벚꽃·연둣빛 한국 산책로, 화사한 봄빛 |
| `summer-clear.jpg` | 시원한 바다 또는 계곡, 푸른 녹음 |
| `autumn-clear.jpg` | 단풍 든 한국 산 또는 고궁, 황금빛 |
| `winter-clear.jpg` | 맑은 겨울 햇살(설경 아님), 앙상한 나무+파란 하늘의 따뜻한 대비 |
| `rain.jpg` | 비 오는 한국 거리·창가 감성, 따뜻한 실내 불빛 |
| `snow.jpg` | 눈 내리는 한옥/설경, 차분하고 포근한 톤 |

생성 인프라: 보유 중인 이미지 생성 도구(higgsfield MCP 또는 NAS image-lab
`gpt_image`/`nano_banana`/`flux`) 중 선택. 6장을 동일 스타일 토큰으로 생성 후
사용자 시각 검토 → 채택. 라이선스는 생성물이라 public 레포·공모전에 깔끔.

### 3.4 코드 변경 범위

| 파일 | 변경 |
|---|---|
| `public/hero/*.jpg` (6장) | 신규 추가. 각 < 300KB 목표(최적화 후) |
| `lib/hero-image.ts` | `pickHeroFromSpots` 메인 경로 제거. `getCuratedHeroImage` 유지 |
| `app/components/home/HomeHero.tsx` | useEffect의 spot 우선 로직 제거, 초기값=큐레이션. `onError`→그라데이션 유지. (선택) `fadeIn` 진입 애니메이션. **운세 토스트 빈 슬롯 주석 확보** |

`pickHeroFromSpots`는 export 유지하되 미사용이면 정리 검토(다른 호출처 grep 확인).

---

## 4. 검증 기준

- [ ] `public/hero/` 6장 모두 200 OK — 404 박멸
- [ ] 4 브레이크포인트(375/768/1024/1440)에서 6장 각각 텍스트(라벨·H1·CTA) 가독성 확인
- [ ] 각 파일 용량 예산(<300KB) 준수
- [ ] LCP priority 이미지 정상 로드 (지연·레이아웃 시프트 없음)
- [ ] 계절/날씨 시드 강제 변경 시 해당 컷 노출 (summer→`summer-clear`, rain→`rain` 등)
- [ ] 6장 간 스타일·톤 일관성 (브랜드 통일감)
- [ ] Vercel 배포 후 라이브 URL에서 재확인

---

## 5. 위험 / 가드레일

- **AI 실사 어색함**: 비현실적 디테일(왜곡된 건축·이상한 손 등) 검수 필수. 전경 인물
  배제로 리스크 축소. 채택 전 사용자 시각 검토 게이트.
- **6장 일관성**: 컷마다 grade가 튀면 브랜드 통일감 손상. 공통 스타일 토큰 고정 + 일괄 생성.
- **파일 용량**: 고해상 실사는 무거움 → LCP 악화. 최적화(webp 검토·압축)로 예산 준수.
- **트랙 B 가드레일**: 운세 기능은 본 설계에서 슬롯 자리만 확보. 기능 구현은 트랙 A로 분리.

---

## 6. 후속 (B1 이후)

트랙 B 잔여: B2(`/festival` 스켈레톤·마이크로 인터랙션) → B3(GlobalHeader 모바일
정리) → B4(데모 안정성·OG·위치권한 Toast) → B5(발표 자료·시연 영상). 각 사업 단위는
spec·plan 1쌍 동반(Phase 1·2·3 패턴 유지).
