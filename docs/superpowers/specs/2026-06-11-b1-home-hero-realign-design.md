# B1 Home Hero 재정렬 설계 (Spec) — 현 main 기준

> **작성일**: 2026-06-11
> **상위 설계**: `docs/superpowers/specs/2026-06-08-emochu-b1-home-hero-design.md` (원안, 승인됨)
> **재정렬 사유**: 병렬 작업 머지로 main의 HomeHero/hero-image가 바뀜(.jpg→.png, spot-first 유지). 원안을 현 main 위에 재정렬.
> **트랙**: 트랙 B(디자인) 1순위
> **점수 레버**: 디자인 20
> **승인**: 재정렬 설계 승인 (2026-06-11, 운세 슬롯 삭제 포함)

---

## 1. 배경 / 현 상태

원안(2026-06-08)은 "랜덤 TourAPI 사진 우선 → 큐레이션 폴백(404)"을 "큐레이션 6장 메인"으로 반전 + AI 시네마틱 실사 6장 제작이 핵심이었다. 그 사이 병렬 작업이 머지되며 main의 Hero가 바뀌었다:

- `lib/hero-image.ts`: CURATED 경로가 `.jpg` → **`.png`**, `pickHeroFromSpots` 유지
- `app/components/home/HomeHero.tsx`: 여전히 **spot-first**(`pickHeroFromSpots` + `spots` prop + `useEffect`), handleError가 `''`로 폴백 → `{imgSrc && <Image>}`로 그라데이션 노출(원안 대비 약간 개선된 폴백)
- `public/hero/*.png` 6장 존재하나 **800×450 단색 플레이스홀더(~1.7KB)** — 실사 아님
- `app/components/home/HomeView.tsx`: AI 코스 CTA 카드가 `/hero/autumn-clear.png` 직접 참조

즉 원안의 두 목표(큐레이션 우선 전환 + 실사 6장)는 **여전히 미달**이며 유효하다.

## 2. 목표 / 비목표

### 목표
- 렌더 반전: 랜덤 spot 우선 제거 → **큐레이션 6장(.png) 메인** + 그라데이션 폴백 (계절+날씨 결정적 선택 유지)
- **AI 시네마틱 실사 6장**(`soul_location`, 16:9) 생성 → 플레이스홀더 `.png` 교체
- HomeView AI CTA 카드(`autumn-clear.png`)도 자동 복구
- 4 브레이크포인트 텍스트 가독성, 404 없음

### 비목표 (원안 대비 변경)
- **운세 토스트 슬롯 삭제** — 사주가 Wizard(StepFeeling)로 들어갔으므로 Hero 슬롯 불필요(YAGNI). 원안의 "운세 슬롯 주석" 항목 폐기.
- 다국어/캐러셀/Home 사주 노출 — 범위 밖

## 3. 설계

### 3.1 렌더 전략 (현 main HomeHero 재작성)
```
큐레이션 6장(.png, 계절+날씨) 메인 → [로드 실패 시] CSS 그라데이션
```
- `pickHeroFromSpots` 메인 경로 제거, `spots` prop 제거
- 초기값=`getCuratedHeroImage(weather)`, `failed` 상태 + onError→그라데이션 (LCP 보호 위해 진입 애니메이션 없음)
- `getCuratedHeroImage`의 계절·날씨 분기 로직은 불변(경로만 .png 유지)

### 3.2 이미지 (`soul_location`, 16:9)
공통 스타일: `cinematic photoreal, golden-hour warm tone, Korean scenery, wide establishing shot, no people, bottom third darkened, warm orange-leaning grade, no text`

| 파일(.png) | 장면 |
|---|---|
| `spring-clear` | 벚꽃·연둣빛 산책로 |
| `summer-clear` | 시원한 바다/계곡 녹음 |
| `autumn-clear` | 단풍 든 산·고궁 |
| `winter-clear` | 맑은 겨울 햇살(설경 아님) |
| `rain` | 비 오는 거리·따뜻한 창가 |
| `snow` | 눈 내리는 한옥/설경 |

비용: 이미지당 ~0.12크레딧(확인). 6장+재시도 10크레딧 내 충분.

### 3.3 코드 변경
| 파일 | 변경 |
|---|---|
| `public/hero/*.png` (6장) | 플레이스홀더 → 실사 교체 |
| `lib/hero-image.ts` | `pickHeroFromSpots` 제거(.png 경로·`getCuratedHeroImage` 유지) |
| `app/components/home/HomeHero.tsx` | spot-first·`spots` prop·useEffect 제거, 큐레이션 단일 렌더 + onError 그라데이션 |
| `app/components/home/HomeView.tsx` | `<HomeHero>` 호출에서 `spots` prop 제거 |

## 4. 검증 / 자율 실행 규칙

테스트 러너 없음 → `npx tsc --noEmit` + `npm run build` + 수동 시각.

**사용자 부재(자율) 실행 규칙:**
- 이미지 품질은 **내가 생성물을 직접 시각 검토**(Read로 이미지 확인)해 판정 — 비현실 왜곡·톤 불일치 컷은 재생성.
- **라이브 퇴보 방지(핵심)**: 큐레이션 우선 전환은 *좋은 실사 이미지가 있어야* 의미가 산다. 플레이스홀더 상태로 main 배포 시 라이브 Hero가 단색으로 퇴보하므로:
  - **이미지 6장이 충분히 양호 + build 통과** → main 머지 + push(Vercel 배포)
  - **품질 확신 부족** → `feat/b1-home-hero-v2` 브랜치만 push, main 미머지(배포 안 함) + 깨우면 검토 요청
- 4 브레이크포인트 시각·라이브 재검증은 사용자 기상 후 가능(자율 단계에선 build+이미지 검토까지).

## 5. 위험 / 가드레일
- AI 실사 어색함: 전경 인물 배제 + 컷별 자체 검토로 축소. 의심 컷 재생성.
- `.png` 용량: 실사면 단색 대비 커짐. next/image가 서빙 최적화하므로 절대 기준 아님(과대 시 압축).
- 라이브 퇴보: §4 규칙으로 차단(좋은 이미지 없으면 배포 안 함).
- `saju.ts`/사주 기능: 본 작업과 무관, 미변경.
