# B3 GlobalHeader 마무리 설계 (Spec) — 로고 아이콘 + 태블릿 정렬

> **작성일**: 2026-06-11
> **트랙**: 트랙 B(디자인) — 헤더 자잘한 완성도
> **점수 레버**: 디자인 20
> **승인**: 설계 승인 (2026-06-11)
> **규모**: 단일 파일(GlobalHeader.tsx) 4줄 — trivial. subagent/2단리뷰 대신 인라인 구현+빌드 검증(비례).

---

## 1. 배경 / 진단
`app/components/nav/GlobalHeader.tsx`:
- 로고 아이콘이 **`Briefcase`(서류가방)** — 주말 *나들이* 앱과 어긋나는 업무/포트폴리오 톤(데스크탑·모바일 동일).
- 모바일 헤더 컨테이너가 **`max-w-lg`(512px)** 캡 → 본문 `Container`는 `max-w-7xl`이라 **768px 태블릿에서 헤더 로고가 본문보다 좁게 들여써져 정렬 어긋남**. (폰 375px엔 영향 없음 — px-5가 지배)

## 2. 목표 / 비목표
### 목표
- 로고 아이콘 `Briefcase` → **`Compass`**(탐험/발견, 브랜드 적합) — 데스크탑·모바일 둘 다.
- 모바일 헤더 컨테이너 `max-w-lg` → **`max-w-7xl`**(본문 Container와 정렬, 태블릿 어긋남 해소).
### 비목표 (YAGNI)
- nav/검색/LocationSelector/scroll 로직 변경 X
- 로고 텍스트 폰트·크기 변경 X(현행 적정)

## 3. 변경 (GlobalHeader.tsx)
| 위치 | 변경 |
|---|---|
| import(6행) | `import { Briefcase } from 'lucide-react';` → `import { Compass } from 'lucide-react';` |
| 데스크탑 로고(35행) | `<Briefcase size={22} ... />` → `<Compass size={22} ... />` (className/strokeWidth 유지) |
| 모바일 컨테이너(72행) | `lg:hidden max-w-lg mx-auto px-5 h-14 ...` → `lg:hidden max-w-7xl mx-auto px-5 h-14 ...` |
| 모바일 로고(74행) | `<Briefcase size={20} ... />` → `<Compass size={20} ... />` |

## 4. 검증
`npx tsc --noEmit` + `npm run build` + 시각(태블릿 768 정렬·아이콘) + 라이브 `/` 200.

## 5. 위험
- 단일 파일·표시 변경, 로직 무관 → 저위험. 라이브 퇴보 없음.
