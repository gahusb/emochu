# B2 축제 페이지 폴리시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. 단일 Task(4파일 폴리시). 검증·배포는 메인 세션.

**Goal:** /festival 카드가 로딩 후 순차(스태거) 페이드업으로 등장하고, 스켈레톤이 실제 카드와 일치하며, reduced-motion 사용자에겐 애니메이션이 꺼지도록 한다.

**Architecture:** 기존 `.stagger-item`(`globals.css`) 클래스를 FestivalCard에 조건부 적용(`index` 있을 때만) + per-item `animationDelay`(캡). FestivalSkeleton을 실제 카드 구조에 맞추고, `prefers-reduced-motion` 미디어쿼리로 stagger·shimmer 비활성.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, CSS 키프레임.

> **테스트 러너 없음**: `npx tsc --noEmit` + `npm run build` + 시각. 신규 테스트 금지. 명령은 PowerShell 한 줄.
> **브랜치**: `feat/b2-festival-polish` (spec 커밋 존재).

---

## File Structure
| 파일 | 변경 |
|---|---|
| `app/components/festival/FestivalCard.tsx` | `index?` prop + 조건부 stagger 클래스·딜레이 |
| `app/components/festival/FestivalGrid.tsx` | map에 `index={i}` 전달 |
| `app/components/festival/FestivalSkeleton.tsx` | 실제 카드 구조와 일치 |
| `app/globals.css` | reduced-motion 가드 |

---

## Task 1: 축제 카드 스태거 진입 + 스켈레톤 일치 + reduced-motion (subagent)

- [ ] **Step 1: `FestivalCard.tsx` — `index?` prop + 조건부 stagger**

`Props` 인터페이스에 `index?: number;`를 추가하고, 컴포넌트에서 stagger 클래스·딜레이를 조건부로 적용한다. 현재 시그니처/Link는:
```tsx
interface Props { festival: FestivalCardData; today: string; satStr: string; sunStr: string; }
```
```tsx
export default function FestivalCard({ festival: f, today, satStr, sunStr }: Props) {
  const dateStr = ...;
  const status = ...;
  const distanceStr = ...;
  const region = ...;

  return (
    <Link
      href={`/spot/${f.contentId}`}
      className="group block bg-surface-elevated border border-line rounded-lg overflow-hidden hover:shadow-raised transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label={`${f.title}, ${region}, ${dateStr}, ${distanceStr}`}
    >
```
이를 다음으로 바꾼다(Props에 index 추가, className 조건부 `stagger-item`, style에 캡 딜레이):
```tsx
interface Props { festival: FestivalCardData; today: string; satStr: string; sunStr: string; index?: number; }
```
```tsx
export default function FestivalCard({ festival: f, today, satStr, sunStr, index }: Props) {
  const dateStr = `${formatDate(f.eventStart)}${f.eventEnd && f.eventEnd !== f.eventStart ? ` ~ ${formatDate(f.eventEnd)}` : ''}`;
  const status = getStatusBadge(f, today, satStr, sunStr);
  const distanceStr = f.distanceKm != null ? `${f.distanceKm.toFixed(1)}km` : '';
  const region = f.addr1 ? f.addr1.split(' ')[0] : '';

  const staggerClass = index != null ? ' stagger-item' : '';
  const staggerStyle = index != null ? { animationDelay: `${Math.min(index, 12) * 40}ms` } : undefined;

  return (
    <Link
      href={`/spot/${f.contentId}`}
      className={`group block bg-surface-elevated border border-line rounded-lg overflow-hidden hover:shadow-raised transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand${staggerClass}`}
      style={staggerStyle}
      aria-label={`${f.title}, ${region}, ${dateStr}, ${distanceStr}`}
    >
```
(나머지 JSX 본문 — 이미지/뱃지/제목/메타 — 는 그대로 둔다.)

- [ ] **Step 2: `FestivalGrid.tsx` — map에 `index={i}` 전달**

현재:
```tsx
            : festivals.map((f) => (
                <FestivalCard key={f.contentId} festival={f} today={today} satStr={satStr} sunStr={sunStr} />
              ))
```
다음으로:
```tsx
            : festivals.map((f, i) => (
                <FestivalCard key={f.contentId} festival={f} today={today} satStr={satStr} sunStr={sunStr} index={i} />
              ))
```

- [ ] **Step 3: `FestivalSkeleton.tsx` — 실제 카드 구조와 일치**

파일 전체를 다음으로 교체(2줄 제목 + region + distance, `space-y-1`):
```tsx
export default function FestivalSkeleton() {
  return (
    <div className="bg-surface-elevated border border-line rounded-lg overflow-hidden">
      <div className="aspect-[4/3] w-full skeleton" />
      <div className="p-4 space-y-1.5">
        <div className="h-4 w-full skeleton rounded-md" />
        <div className="h-4 w-2/3 skeleton rounded-md" />
        <div className="h-3 w-1/2 skeleton rounded-md" />
        <div className="h-3 w-1/4 skeleton rounded-md" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `app/globals.css` — reduced-motion 가드**

`.stagger-item { ... }` 정의(현재 ~147~149행) 블록 **다음**에 아래를 추가:
```css
@media (prefers-reduced-motion: reduce) {
  .stagger-item { animation: none; }
  .skeleton { animation: none; }
}
```

- [ ] **Step 5: 검증** — `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npx tsc --noEmit`(0 에러) + `cd "C:\Users\jaeoh\Desktop\workspace\emochu"; npm run build`(`✓ Compiled successfully`). (이 프로젝트는 테스트 러너 없음 — 추가 금지.)

- [ ] **Step 6: 커밋**
```
git add app/components/festival/FestivalCard.tsx app/components/festival/FestivalGrid.tsx app/components/festival/FestivalSkeleton.tsx app/globals.css
git commit -m "feat(festival): 카드 스태거 진입 + 스켈레톤 일치 + reduced-motion 가드"
```
본문 끝 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Task 2: 검증 · 배포 (메인 세션 직접)
- [ ] **Step 1:** 최종 `npm run build` 통과 재확인 + dev에서 `/festival` 로딩→카드 cascade 진입 시각 확인.
- [ ] **Step 2:** main ff 머지 + push(추가 폴리시라 퇴보 없음). 자동배포 안 잡히면 빈 커밋 재트리거.
- [ ] **Step 3:** 라이브 `/festival` 200 스모크.

## 완료 기준
- 카드가 순차 cascade로 진입(딜레이 캡), 스켈레톤↔카드 시프트 최소, reduced-motion 시 애니메이션 off
- `tsc`/`build` 통과, 배포·`/festival` 200
