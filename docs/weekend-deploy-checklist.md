# 이모추! 배포 전 체크리스트

> 이 문서를 순서대로 체크하면서 진행하세요. 각 항목을 완료하면 [x]로 표시.

---

## 1. 환경변수 (.env.local + Vercel)

### 로컬 `.env.local`
- [ ] `TOUR_API_KEY` — 한국관광공사 TourAPI 4.0 서비스키 (공공데이터포털에서 발급)
- [ ] `WEATHER_API_KEY` — 기상청 단기예보 API 서비스키 (공공데이터포털에서 발급)
- [ ] `GEMINI_API_KEY` — Google AI Studio에서 발급 (없으면 규칙 기반 폴백 작동)

### Vercel 환경변수
- [ ] Vercel 프로젝트 Settings > Environment Variables에 위 3개 추가
- [ ] Production + Preview 환경 모두 설정 확인

---

## 2. Supabase DB 마이그레이션

- [ ] Supabase SQL Editor에서 `supabase/migrations/010_weekend_tables.sql` 실행
  - wk_spots, wk_festivals, wk_courses, wk_weather_cache 4개 테이블 생성
  - **주의**: wk_courses 컬럼이 `departure_lat`, `departure_lng`, `ai_model`로 업데이트됨
  - 이전에 실행한 적 있다면 `DROP TABLE` 후 재실행 또는 `ALTER TABLE` 적용:
    ```sql
    -- 이전 버전에서 컬럼명이 다른 경우
    ALTER TABLE public.wk_courses RENAME COLUMN latitude TO departure_lat;
    ALTER TABLE public.wk_courses RENAME COLUMN longitude TO departure_lng;
    ALTER TABLE public.wk_courses ADD COLUMN IF NOT EXISTS ai_model text;
    ```
- [ ] RLS 정책 활성화 확인 (테이블 4개 모두)
- [ ] `wk_courses_insert` 정책이 `with check (true)`인지 확인 (비로그인도 코스 생성 가능)

---

## 3. API 키 발급 가이드

### TourAPI (한국관광공사)
1. https://www.data.go.kr 접속
2. "한국관광공사_국문 관광정보 서비스_GW" 검색
3. 활용 신청 → 즉시 승인 (일반 인증키)
4. 마이페이지 > 인증키 확인 > **일반 인증키 (Encoding)** 복사
5. `.env.local`에 `TOUR_API_KEY=복사한키` 추가

### 기상청 단기예보
1. https://www.data.go.kr 접속
2. "기상청_단기예보 ((구)_동네예보) 조회서비스" 검색
3. 활용 신청 → 자동 승인
4. **일반 인증키 (Encoding)** 복사
5. `.env.local`에 `WEATHER_API_KEY=복사한키` 추가

### Google Gemini
1. https://aistudio.google.com/apikey 접속
2. "Create API Key" 클릭
3. `.env.local`에 `GEMINI_API_KEY=복사한키` 추가
4. 무료 티어로 충분 (일 500건 이내)

---

## 4. 로컬 테스트

- [ ] `npm run dev` 실행
- [ ] 브라우저에서 `http://localhost:3000/weekend` 접속 확인
- [ ] 코스 생성 테스트:
  ```bash
  curl -X POST http://localhost:3000/api/weekend/course \
    -H "Content-Type: application/json" \
    -d '{
      "lat": 37.5665,
      "lng": 126.9780,
      "duration": "half_day",
      "companion": "solo",
      "preferences": ["cafe", "culture"]
    }'
  ```
- [ ] 응답에 `courseId`, `course.stops`, `kakaoNaviUrl` 포함 확인
- [ ] Rate Limit 테스트: 위 curl 4번 연속 실행 → 4번째에 429 반환 확인

---

## 5. Vercel 배포

- [ ] `git add` + `git commit` + `git push`
- [ ] Vercel 빌드 성공 확인
- [ ] Production URL에서 `/weekend` 접속 확인
- [ ] API 엔드포인트 테스트 (`/api/weekend/course`)

---

## 6. 배포 후 확인

- [ ] Vercel Functions 로그에서 `[이모추AI]` 로그 확인
- [ ] Supabase에 `wk_courses` 레코드 저장 확인
- [ ] 모바일 브라우저에서 `/weekend` UI 정상 표시 확인
- [ ] PWA manifest 로드 확인 (Chrome DevTools > Application > Manifest)

---

## 다음 작업 목록 (배포 이후)

### 우선순위 1 — 공모전 필수 (5/6 마감 전)
- [ ] 코스 결과 페이지 (`/weekend/course/[slug]/page.tsx`) — 코스 상세 + 카카오맵 연동
- [ ] 데모 데이터 → 실제 TourAPI 데이터 연동 (홈 화면)
- [ ] W4 수정: 축제 검색 날짜 필터 확대 (진행 중 축제 누락 방지)
- [ ] 제안서 양식 최종 이관 + PDF 제출

### 우선순위 2 — 품질 개선
- [ ] W1: DB 캐시 레이어 (wk_spots 활용)
- [ ] W2: 날씨 스코어링 양일 고려
- [ ] S2: 동선 검증 (validateRoute) 구현
- [ ] 축제 상세 페이지 (`/weekend/festival/[id]`)

### 우선순위 3 — 고도화
- [ ] A/B 코스 생성 (2개 코스 비교)
- [ ] 코스 재생성 ("이 장소 빼줘")
- [ ] 사용자 히스토리 학습
- [ ] 코스 공유 OG 이미지 자동 생성
