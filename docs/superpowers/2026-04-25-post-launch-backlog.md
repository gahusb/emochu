# 이모추 Post-Launch Backlog (통합 로드맵)

- **작성일**: 2026-04-25 (공모전 D-11)
- **현재 상태**: Phase 1·2·3 완료, Vercel 배포 완료, Phase 4 권장 Backlog 5건(focus trap / overview fold / SearchBar next/image / FacilityBadges sr-only / /api/spot ISR) 완료
- **용도**: Phase 1·2·3 spec 의 Backlog 섹션 + code-review 이월 항목 + 사용자 제안 기능을 **단일 소스로 통합**. 공모전 제출서의 "발전 계획" 섹션에 바로 인용 가능

---

## 우선순위 분류

| 등급 | 정의 | 처리 시점 |
|------|------|-----------|
| 🔴 | 공모전 제출 전 필수 | D-11 ~ D-1 |
| 🟡 | 공모전 점수에 영향 (시간 허용 시) | D-11 ~ D-3 |
| 🟢 | 공모전 이후, 발전성 어필용 | 제출서 로드맵 섹션에 명시 |
| ⚪ | 완성도 개선 (우선순위 낮음) | 여유 시 |
| 🔵 | 기술 인프라 (발전성 어필용) | 여유 시 또는 로드맵 |

---

## 🔴 필수 (공모전 제출 전)

| 항목 | 상태 | 담당 |
|------|------|------|
| Vercel 배포 & 도메인 확인 | ⏳ 사용자 확인 중 | 사용자 |
| `NEXT_PUBLIC_SITE_URL` 환경변수 검증 | ⏳ | 사용자 |
| 4 브레이크포인트 시각 확인 (1440/1024/768/375) | ⏳ | 사용자 |
| 카카오톡 OG 공유 테스트 | ⏳ | 사용자 |
| **콘텐츠랩 회원가입** (공모전 필수 요건) | ⏳ | 사용자 |
| `/spot/:id`·`/course`·`/festival` 라우트 스모크 테스트 | ⏳ | 사용자 |
| **`public/hero/` 큐레이션 사진 6장 배치** (Phase 1 USER ACTION) | ⏳ | 사용자 |

---

## 🟡 권장 (공모전 점수에 영향)

### 완료 (Phase 4 2026-04-25)
- ✅ SpotDetail 모달 focus trap
- ✅ overview fold 임계값 200 → 400자
- ✅ SearchBar `<img>` → next/image
- ✅ FacilityBadges sm 사이즈 sr-only 레이블
- ✅ `/api/spot` revalidate 3600 (ISR 통일)

### 남은 🟡 (시간 허용 시)
| 항목 | 예상 | 심사 임팩트 | 비고 |
|------|------|-------------|------|
| Home Hero 이미지 품질 상향 (`public/hero/*.jpg` 6장) | 사용자 | 디자인 20 | 현재 fallback gradient로 표시 |
| `/festival` 로딩 스켈레톤 최적화 | 30분 | 디자인 20 | 현재 8개 고정, 반응형 개수 조정 가능 |
| GlobalHeader 모바일 로고 크기 조정 | 15분 | 디자인 20 | 현재 h-14 와 로고 균형 검토 |
| 첫 방문자 위치 권한 안내 Toast | 1시간 | 활용성 15 | GPS 거부 시 설정 유도 |

---

## 🟢 공모전 이후 (발전성·활용성 어필용)

**공모전 제출서의 "발전 계획" 또는 "Phase 5" 섹션에 명시 권장.**

### 🌐 글로벌 확장 — 다국어 지원 (최우선 🟢 항목)

**심사 임팩트**: 활용성 15 + 발전성 15 + 기획력 25 — 모든 핵심 심사 기준 직접 어필

**구현 범위** (약 2~3일)
- UI 문자열 100+건 번역 (`next-intl` 또는 React Context dictionary)
- 경로 분기: `/ko/...`·`/en/...`·`/ja/...` 또는 언어 쿠키 + `hreflang` 메타 태그
- 언어 셀렉터 UI (GlobalHeader 우측, 위치 칩 옆)

**TourAPI 다국어 데이터 — 3가지 옵션 비교**

| 옵션 | 방식 | 품질 | 비용 | 구현 난이도 | 권장 |
|------|------|------|------|------------|------|
| A. **TourAPI EngService / JpnService** | 공식 다국어 서비스 엔드포인트 | 🟢 공식 번역 | 무료 | 중 (API 추가) | ⭐ 최적 |
| B. Gemini 동적 번역 | AI 생성 텍스트(코스 설명·tip) 만 번역 | 🟡 양호 | 약간의 AI 비용 | 낮음 | 보조 |
| C. Papago / DeepL API | 전체 콘텐츠 런타임 번역 | 🟡 양호 | 유료 | 중 | 비권장 |

**관광 데이터 특성 고려사항**
- 축제명·장소명: 한국어 병기 자연스러움 (`경복궁 (Gyeongbokgung)`)
- 주소: TourAPI EngService 가 영문 주소 별도 제공
- 기상청 단기예보: 한국어만 지원 → 간단한 상태 매핑 테이블 (`맑음 → Sunny / 晴れ`)
- TourAPI `areaCode` 는 동일 → 지역 번역만 정적 매핑

**단계적 구현 제안**
1. MVP (0.5일): GlobalHeader 언어 셀렉터 UI + `hreflang` 메타 준비 (실 동작 없음) — "준비된 아키텍처" 어필
2. Basic (1일): UI 문자열 영/일 번역, TourAPI 는 한국어 유지
3. Full (2~3일): TourAPI EngService/JpnService 연동, Gemini 번역 파이프라인

### 🗺️ Festival 지도 통합 (split view)
- 현재 매거진 그리드만 → `/festival/map` 또는 같은 페이지에서 split view 토글
- 좌: 필터된 카드 리스트 / 우: sticky 카카오맵 + 축제별 마커
- Phase 3 brainstorm 에서 사용자가 "나중에" 로 분류한 항목
- 예상: 1일

### 📍 SpotDetail 지도 미니뷰 임베드
- 전용 페이지·모달 정보 섹션에 카카오맵 축소 뷰(aspect-16/9) 임베드
- 현재는 "카카오맵" 버튼 → 외부 링크 방식, 내비게이션 전환 대체
- 예상: 0.5일

### 🖼️ 이미지 Full-screen Viewer
- SpotDetail 이미지 탭하면 전체화면 갤러리 (swipe 지원)
- ImageGallery 확장 또는 라이트박스 라이브러리 (`yet-another-react-lightbox` 등)
- 예상: 0.5일

### 📂 저장한 코스 마이페이지
- 모바일 4번째 탭 슬롯(BottomTabBar) / 데스크톱 헤더 우측
- Supabase `saved_courses` 테이블 + 사용자 식별(익명 브라우저 ID 또는 가입)
- 방문 체크·사진 업로드·리뷰 기능 확장 가능
- 예상: 1~2일

### ✏️ 코스 수정 UX
- StopCard 드래그 재정렬 (`@dnd-kit/sortable`)
- 특정 장소 교체 요청 → AI 재생성 또는 후보 pool 에서 대체
- 예상: 1일

### ⚡ AI 응답 Streaming (SSE)
- 현재 POST `/api/course` await 완료 기반
- Gemini streaming 을 SSE 로 클라이언트에 전달 → 로딩 화면에서 코스가 점진적으로 생성
- 예상: 1일

### 📄 PDF / OG 이미지 동적 생성
- 코스 결과 페이지 PDF 다운로드 (`@react-pdf/renderer` 또는 Puppeteer 서버리스)
- 공유 OG 이미지 동적 생성 (`next/og` 활용, 코스 타임라인 요약)
- 예상: 0.5~1일

### 🔍 `/search` 전용 페이지
- 현재 Home 상단 SearchBar → 드롭다운 결과
- 전용 페이지: 검색어 URL 쿼리, 필터(종류·지역), 무한 스크롤
- 예상: 0.5일

### 🧩 코스 난이도·예상 비용 표시
- AI 코스 생성 시 Gemini 에 난이도(하/중/상) + 비용 대략(만원 단위) 요구
- StopCard·CourseSummary 에 뱃지 표시
- 예상: 0.5일

### 💾 Wizard Draft 저장
- `localStorage` 에 진행 중인 Wizard 상태 자동 저장 → 이탈 후 복귀 시 이어서
- 예상: 0.5일

---

## ⚪ 완성도 개선 (우선순위 낮음)

Phase 1 Nice-to-have — 실 사용에서 거의 드러나지 않는 품질 개선.

- LocationModal 포커스 트랩 (SpotDetail 과 동일 패턴 적용 가능)
- `focus-visible:ring` 보조 효과 (GlobalSearchBar / SearchBar / LocationModal input)
- `useHomeData` loading 무한 방지 (GPS 해결 전 skeleton 장시간 노출)
- `CLAUDE.md` 개발 규칙 §"테마 색상" 섹션 업데이트 (옛 `#FFF8F0` / `orange-400~500` 기술 → Phase 1 토큰 반영)
- FestivalBadge / SpotCard 의 `cursor-pointer` 중복 제거 (이제 외부 wrapper Link 가 담당)

---

## 🔵 기술 인프라 (발전성 어필용)

### 자동화 / QA
- **Playwright 시각 회귀 자동화** — 4 브레이크포인트 스냅샷, 주요 5개 라우트(/·/course·/course/:slug·/festival·/spot/:id) 커버
- **Lighthouse CI** — LCP / CLS / TBT 자동 측정, 회귀 방지
- **WCAG AA 접근성 감사** — axe-core / pa11y 통합
- **이미지 AVIF 튜닝** — next/image format 최적화

### 배포 / 모니터링
- **Sentry** 에러 리포트 (프로덕션 런타임 예외 가시성)
- **Vercel Analytics** / **PostHog** 사용 패턴 분석
- **Supabase Row Level Security** 감사 (코스 저장/공유 보안)

### 아키텍처
- **`/spot/[contentId]` ISR revalidate: 3600** (적용 완료 ✅)
- **`/festival` ISR** — 축제 정보는 자주 변하지 않으므로 route-level revalidate 가능
- **TourAPI 클라이언트 캐싱 레이어** — 동일 contentId 반복 조회 시 in-memory LRU
- **Edge Runtime 전환** — `/api/spot`, `/api/festival` 등 경량 라우트

---

## 공모전 제출서 "발전 계획" 섹션 초안

> (공모전 제출서에 바로 붙여넣을 수 있는 구조. 실 제출 시 분량 조정)

### Phase 5: 글로벌 관광객 확장 (다국어 영/일 지원)
외국인 관광객을 위한 영어·일본어 다국어 지원. TourAPI 의 공식 EngService/JpnService 엔드포인트를 활용해 장소명·주소·설명을 공식 번역으로 제공. UI 는 `next-intl` 기반 dictionary 로 100+ 문자열을 번역. GlobalHeader 의 언어 셀렉터 + `hreflang` 메타 + 경로 분기(`/en/...`·`/ja/...`) 로 SEO 및 공유 경험 완성. Gemini 번역 파이프라인으로 동적으로 생성되는 AI 코스 설명·꿀팁도 선택 언어로 자동 번역.

### Phase 6: 지도 중심 UX
Festival 페이지에 좌측 필터+카드 리스트 / 우측 sticky 카카오맵 split view 도입, SpotDetail 내 지도 미니뷰 임베드로 장소 위치를 한눈에 파악. 이미지 full-screen viewer 추가로 관광지 사진을 크게 감상.

### Phase 7: 개인화 / 소셜
저장한 코스 마이페이지, 코스 방문 체크·사진 업로드·리뷰, 드래그 재정렬 기반 코스 수정 UX. 익명 브라우저 ID 기반 개인화로 회원가입 부담 없이 시작.

### Phase 8: 기술 고도화
AI 응답 Streaming(SSE) 으로 로딩 UX 개선, PDF/OG 이미지 동적 생성, TourAPI 클라이언트 캐싱 레이어, Edge Runtime 전환, Playwright 시각 회귀 + Lighthouse CI + WCAG AA 접근성 감사 자동화.

---

## 이 문서 유지 관리

- 새 항목 추가 시: 우선순위 등급 부여 후 해당 섹션에 추가
- 항목 완료 시: "완료" 라인에 이동, ✅ 표시
- 공모전 제출 후: 🔴 섹션 비워지고 🟢·🔵 가 실제 개발 백로그로 전환
- 각 Phase spec 문서의 Backlog 섹션은 그대로 유지 (단일 Phase 컨텍스트). 이 파일은 **통합 관점**.
