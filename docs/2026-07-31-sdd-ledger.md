# SDD ledger — plan: docs/superpowers/plans/2026-07-31-actionable-course.md

branch: feat/actionable-course
base: 1204ad2 (docs(spec+plan): 진짜 갈 수 있는 코스)
started: 2026-07-31

## 진행

Task 1: complete (commits 1204ad2..3714a60, review clean — 스펙 ✅ / 품질 승인)
Task 1: minor (deferred): tests/visit-day.test.ts 픽스처의 DayWeather가 실제 타입과 불일치
  (sky/precipitation에 한글 문자열, date 필드 누락). tsconfig가 tests를 exclude하고
  vitest에 typecheck가 없어 미검출. 런타임 무해(weatherScore는 pop만 읽음).
  → T4·T5 테스트에서 같은 픽스처 패턴 재사용 시 누적되지 않도록 브리프에 실제 타입 명시할 것.
Task 2: complete (commits 3714a60..46a0b43, review clean — 스펙 ✅ / 품질 승인, 발견사항 0)
  note: 브리프 외 lib/use-course-generation.ts 수정 필요했음(GenerateParams에 visitDay 부재로 빌드 실패).
        리뷰에서 '필요했고 올바름'으로 판정. 계획 결함이었으며 최소범위로 수정됨.
Task 2: deferred (검증수단 부재): 브라우저 육안 확인 미실행(헤드리스 브라우저 툴 없음).
  조건분기는 코드리뷰로 정합 확인됨. → 최종 검증 시 사용자가 /course 3단계 확인 필요.
Task 3: fix round 1/5 (2 addressed, 0 open — [Critical] NO_REST_PATTERN 우선순위 역전으로
  '매주 월요일 휴무(공휴일 무휴)'→[] 오판 / [Important] 콤마 축약형 '월,화요일'→[2] 월 누락;
  commits 6c1fde9..fe18cce)
Task 3: complete (commits 46a0b43..fe18cce, review clean — 재리뷰 8/8 수용기준 일치,
  보수적 설계('토,일 휴무'→null) 유지 확인, 새 breakage 없음)
Task 3: minor (deferred): 콤마 뒤 공백('월, 화요일')·가운뎃점('월·화요일') 표기는 앞 요일 누락.
  수정 전에도 동일했던 기존 한계(회귀 아님). 실데이터 확인 후 필요시 확장.
Task 3: minor (deferred): 공백 전용 문자열 테스트 케이스 없음(코드는 정상 null 반환).
Task 4: complete (commits fe18cce..5902e9a, review clean — 스펙 ✅ / 품질 승인,
  Critical/Important 0. 수기검산으로 페널티 산식 검증됨: 69.5-200=-130.5)
Task 4: resolved (컨트롤러 확인): 리뷰의 ⚠️ 'restdateculture 필드 실재 여부' →
  app/api/spot/route.ts:12-77 확인 결과 이 코드베이스는 12/14/28=restdate, 39=restdatefood만 사용.
  restdateculture는 존재하지 않으나 폴백체인 마지막이라 무해한 죽은 코드. 실제 gap 아님.
  수집 대상 contentTypeId [12,14,28,39]는 restdate/restdatefood로 전부 커버됨.
Task 4: minor (deferred): CLOSED_PENALTY 주석의 '최대 약 134'는 실제 약 119.5 (계획 원문 오기).
  결론(-200이 단독 상회)에는 영향 없음.
Task 4: minor (deferred): '전 후보가 휴무여도 코스가 비지 않는다'를 다중후보로 증명하는 테스트 없음
  (단일 후보 케이스만). 구조적 안전성은 코드리딩으로 확인됨.
Task 5: complete (commits 5902e9a..e580965, review clean — 스펙 ✅ / 품질 승인, Critical/Important 0.
  손추적으로 배열길이 불변·used Set 중복방지·순환참조 회피 확인)
Task 5: minor (deferred) [최종리뷰 triage 필요]: 교체 시 hook/whyNow/facilities/tip/images가
  원본(휴무) 장소 값으로 남음. ReplacementCandidate에 해당 필드가 없어 구조적으로 미갱신.
  → 새 장소 이름·사진에 옛 장소의 후크 카피가 붙는 부조화 가능. 교체는 드물지만 발생 시 눈에 띔.
  수정안: 교체 시 hook/whyNow를 undefined로 비우기(1~2줄). 최종 리뷰가 병합 전 필요성 판단할 것.
Task 5: minor (deferred): 테스트4가 replaced===0만 단언하고 contentId 불변은 미검증.
Task 5: minor (deferred): '대체 후보 1개를 휴무 stop 2개가 경쟁'하는 used-Set 회귀 테스트 없음
  (코드추적으로 정확성은 확인됨).
Task 6: fix round 1/5 (1 addressed, 0 open — [Important] emerald 하드코딩이 프로젝트 success 토큰
  무시; commits fd07c01..c2bf637)
Task 6: complete (commits e580965..c2bf637, review clean — 재리뷰 ADDRESSED. 두 배지 색 제외
  클래스 100% 일치 확인, success 유틸리티 유효, Badge 미사용 판단 타당[h-5 고정+border 부재])
Task 6: minor (deferred): route.ts enrichStops에서 candidates.find()를 동일 predicate로 3회 중복 호출.
  성능 영향 미미하나 cand 하나로 통합 가능.
Task 6: deferred (검증수단 부재): 배지 브라우저 육안 확인 미실행 → 최종 검증 시 사용자 확인 필요.
Task 7: fix round 1/5 (2 addressed, 0 open — [Important] clearTimeout 누락으로 정상경로에서도
  허위 타임아웃 경고 / [Important] '부분 보존' 주석이 실제 all-or-nothing 동작과 불일치;
  commits 25b85a0..387a876)
Task 7: complete (commits c2bf637..387a876, review clean — 재리뷰 3시나리오(조기성공/throw/실제
  타임아웃) 전부 clearTimeout 호출 확인, 허위 로그 차단됨)
Task 7: minor (deferred): ENRICH_TIMEOUT_MS가 POST 내부 지역상수(모듈 스코프 권장).
Task 7: minor (deferred): 타임아웃 분기 전용 테스트 없음(slow-mock 회귀 테스트 후속 과제).
Task 8: complete (commits 387a876..aaada8d, review clean — 판정 타당성 '타당', 문서 '승인').
  판정 = 중단. 무장애 정보는 data.go.kr 별도 상품(15101897, KorWithService*)이며 기존
  TOUR_API_KEY(상품 15101578 = KorService2)로 접근 불가. 재현 가능한 HTTP 403.
  리뷰어가 스크립트를 직접 실행해 4개 대조 시그니처(200 정상 / 401 잘못된키 / 404 없는라우트 /
  500 없는상품 / 403 권한없음)로 독립 재현함. contentId 3개도 detailCommon2로 실재 검증.
  브리프 예시 필드명(wheelchair 등)이 문서에 사실처럼 기록되지 않았음 확인(최대 위험 회피).
  API 키 노출 없음(실제 키 문자열로 diff 전수 grep).
Task 9: SKIPPED — Task 8 판정(중단)에 따라 계획의 설계대로 스킵. M1+M2+M4로 완결.
  TourAPI 11→12개 어필은 포기. 무장애 기능을 원하면 data.go.kr 상품 15101897 활용신청(승인 필요)이
  선행되어야 함 → 사용자 결정 사항.

## 최종 전체 브랜치 리뷰 (opus)
판정: 조건부 병합 가능 → 수정 웨이브 1회 → 재리뷰 '모든 발견 사항 해결됨 — 병합 가능'

최종 리뷰가 잡은 것 (태스크별 리뷰가 구조적으로 볼 수 없던 것들):
- [Critical] C1: 교체 stop이 옛 장소 카피 100% 잔존 (alt.overview가 파이프라인에서 never populated
  → ?? 가 항상 우변으로 떨어짐). 카드가 "B의 이름·사진 + A의 문구 전부"가 됨.
- [Important] I2: 파서가 '토, 일요일'(쉼표+공백)·'토·일요일'·'금~일요일'을 [0]으로만 파싱
  → 토요일 방문 시 거짓 "영업 확인" 배지. ※ 내가 T3에서 'deferred(월화라 주말 무관)'로
  triage한 판단이 틀렸음 — 같은 결함의 주말 변형이 치명적이었다.
- [Important] I3: candidates가 [20x12,20x14,20x28,20x39] 순차라 slice(0,20)이 관광지만 보강
  → 문화시설(미술관·박물관)·음식점의 restdate를 영원히 미조회. 스펙의 동기가 정확히 그 카테고리.
- [문서] F4: 스펙의 "TourAPI 11→12개"가 T9 스킵으로 허위 진술이 됨 → 제출 서류 유입 위험.

수정 웨이브 (commits aaada8d..e5cf28c, 3커밋):
  b86500b F1+F2 / 7423877 F3 / e5cf28c F4
재리뷰(opus): F1~F4 전부 ADDRESSED. 구버전 vs 신버전 파서 30여 패턴 나란히 실행 대조,
  interleaveResults 길이 보존 손추적(짧은 배열 소진 후 나머지 전부 생존 확인), byMood 상위20 구성 추적.
  기존 파서 테스트 9개 단언 무변경 통과. 신규 breakage = Minor 2건(둘 다 안전한 방향).

Task 최종: 61 tests passed (시작 27 → 61) · lint 0 errors · build exit 0 · tsc --noEmit exit 0

## 병합 전 남은 항목 (사용자 확인 필요)
1. 육안 확인 2건 — 위저드 3단계 토/일 칩, StopCard 배지 4브레이크포인트 (헤드리스 브라우저 부재로 미실행)
2. 병합 여부 결정 (현재 feat/actionable-course 브랜치, main 미머지)
3. [I4, 제출 전 권장] 교체 실패한 확실한 휴무 stop이 'unknown'으로 표시됨.
   스펙 M2-4는 "경고 플래그"를 요구했으나 경고 등급 없음. openStatus에 'closed' 추가 +
   --color-warning 배지 권장. 별도 작업.
4. [Minor 이월] 파서 규칙3이 '1월 1일, 월요일 휴무' 등 4패턴을 null로 열화(안전 방향).
   interleaveResults의 falsy 검사. 스펙:38의 "토,일→[6,0]" 문서-구현 불일치.
