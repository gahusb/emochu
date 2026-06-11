# B2 축제 페이지 폴리시 설계 (Spec) — 스태거 진입 + 스켈레톤 일치

> **작성일**: 2026-06-11
> **트랙**: 트랙 B(디자인) — /festival 로딩·마이크로 인터랙션
> **점수 레버**: 디자인 20
> **승인**: 설계 승인 (2026-06-11, 접근법 A)

---

## 1. 배경 / 현 상태
`/festival`(`FestivalPageShell`)은 초기·반경 변경 시 fetch→`loading`→`FestivalGrid`가 8개 스켈레톤→카드로 **하드 스왑**(카드가 툭 나타남). 상태/지역/정렬 필터는 클라이언트 즉시(스켈레톤 없음).
- `globals.css`에 `.stagger-item`(`@keyframes staggerFadeIn`, `both`) 클래스가 이미 있으나 **festival 카드에 미적용** + per-item 딜레이 없음.
- `FestivalCard`의 hover(`group-hover:scale-105`)·focus-visible·상태 뱃지는 이미 양호 → 유지.
- `FestivalSkeleton`은 단순(이미지+3줄)이라 실제 카드와 약간 어긋나 스왑 시 미세 시프트.

## 2. 목표 / 비목표
### 목표
- 로딩 종료/카드 등장 시 **스태거 cascade 페이드업**(순차 진입) — 기존 `.stagger-item` 재사용 + per-item 딜레이.
- 스켈레톤을 실제 카드 구조와 일치(레이아웃 시프트↓).
- `prefers-reduced-motion` 가드로 stagger·shimmer 비활성(a11y).

### 비목표 (YAGNI)
- 다른 그리드(Home 추천)로 stagger 확산 — /festival에 한정
- 카드 hover/뱃지 재설계 — 현행 유지
- 무한스크롤·페이지네이션

## 3. 설계
### 3.1 스태거 cascade
- `FestivalCard`에 `index?: number` prop 추가. `index`가 있으면 루트 `<Link>`에 `stagger-item` 클래스 + `style={{ animationDelay: \`${Math.min(index, 12) * 40}ms\` }}`. (딜레이 캡 → 카드 많아도 안 늘어짐). `index` 없으면 기존 동작(애니메이션 없음).
- `FestivalGrid`의 `festivals.map((f, i) => <FestivalCard ... index={i} />)`.
- 정렬 변경(동일 키 reorder)은 재마운트 아니라 재애니메이션 X. 필터로 새 카드 등장 시 cascade(자연스러움).

### 3.2 스켈레톤 일치 (`FestivalSkeleton`)
실제 카드(`p-4 space-y-1`, 2줄 제목 `line-clamp-2` + region·date + distance)와 맞춤:
- 이미지 `aspect-[4/3]` 유지
- 본문 `p-4 space-y-1`: 제목 2줄(`h-4 w-full`, `h-4 w-2/3`) + `h-3 w-1/2` + `h-3 w-1/4`

### 3.3 reduced-motion (`globals.css`)
```css
@media (prefers-reduced-motion: reduce) {
  .stagger-item { animation: none; }
  .skeleton { animation: none; }
}
```

### 3.4 변경 단위
| 파일 | 변경 |
|---|---|
| `app/components/festival/FestivalCard.tsx` | `index?` prop + stagger 클래스·딜레이(조건부) |
| `app/components/festival/FestivalGrid.tsx` | map에 `index={i}` 전달 |
| `app/components/festival/FestivalSkeleton.tsx` | 실제 카드 구조와 일치 |
| `app/globals.css` | reduced-motion 가드 |

## 4. 검증
테스트 러너 없음 → `npx tsc --noEmit` + `npm run build` + 시각: 로딩→카드 cascade 진입, 스켈레톤↔카드 시프트 최소, reduced-motion ON 시 애니메이션 off. 라이브 `/festival` 200.

## 5. 위험 / 가드레일
- stagger `both` fill로 초기 opacity:0 → index 미전달 카드가 안 보이는 일 없게 **조건부 적용**(index 있을 때만).
- 딜레이 캡(12*40=480ms)으로 대량 카드 지연 방지.
- reduced-motion 사용자 접근성 보장.
- 기존 hover/focus/뱃지·필터 로직 비변경.
