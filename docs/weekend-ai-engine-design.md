# 이모추! AI 코스 생성 엔진 — 상세 설계서

> 핵심 목표: **"사람이 직접 짠 것 같은" 현실적이고 매력적인 코스**를 AI가 자동 생성

---

## 1. 전체 파이프라인 아키텍처

```
사용자 입력 (위치, 시간, 동반자, 취향)
    │
    ▼
┌─────────────────────────────────────────┐
│  STAGE 1: 후보 수집 (Candidate Pool)     │
│  TourAPI + DB 캐시 → 관광지 20~30개      │
│  searchFestival → 이번 주말 축제 수집     │
│  기상청 API → 주말 날씨 조회             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  STAGE 2: 사전 스코어링 (Pre-scoring)    │
│  취향 매칭 점수 + 동반자 적합도 +         │
│  날씨 적합도 + 거리 점수 + 계절 보너스    │
│  → 상위 12~15개 필터링                   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  STAGE 3: AI 코스 생성 (Gemini)          │
│  스코어링된 후보 + 축제 + 날씨 → 프롬프트 │
│  → Gemini가 최적 동선 + 시간표 생성       │
│  → 구조화된 JSON 출력                    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  STAGE 4: 후처리 & 검증 (Post-process)   │
│  JSON 파싱 → 스키마 검증 → 동선 보정 →   │
│  카카오맵 URL 생성 → DB 저장             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
              클라이언트 응답
```

---

## 2. STAGE 1: 후보 수집 (Candidate Pool)

### 2-1. 데이터 소스 우선순위

| 우선순위 | 소스 | 조건 | 이유 |
|---------|------|------|------|
| 1 | DB 캐시 (`wk_spots`) | synced_at < 7일 | API 호출 절약, 빠른 응답 |
| 2 | TourAPI `locationBasedList` | DB 캐시 미스 | 실시간 데이터 보장 |
| 3 | TourAPI `areaBasedList` | 반경 내 결과 부족 시 | 지역 확대 검색 |

### 2-2. 수집 전략

```typescript
async function collectCandidates(input: {
  lat: number;
  lng: number;
  preferences: Preference[];
  companion: Companion;
}): Promise<SpotCandidate[]> {
  
  // 1단계: 취향별 콘텐츠 타입으로 TourAPI 호출 (병렬)
  //   nature → contentTypeId=12 (관광지)
  //   food   → contentTypeId=39 (음식점)
  //   cafe   → contentTypeId=39 + cat2=A0502
  //   culture → contentTypeId=14 (문화시설)
  //   activity → contentTypeId=28 (레포츠)
  
  // 2단계: 반경 점진 확대
  //   1차: 10km (도보·대중교통 접근 가능)
  //   2차: 20km (자동차 30분 이내)
  //   3차: 30km (결과 부족 시)
  
  // 3단계: 중복 제거 (contentId 기준)
  // 4단계: 최소 20개 확보 목표
}
```

### 2-3. 축제 수집

```typescript
async function collectFestivals(input: {
  lat: number;
  lng: number;
  saturdayDate: string;  // YYYYMMDD
  sundayDate: string;
}): Promise<FestivalCandidate[]> {
  
  // DB 캐시 우선 → 캐시 미스 시 TourAPI searchFestival
  // 필터: eventStart <= sunday && eventEnd >= saturday
  // 반경: 30km
  // 최대 5개 (코스에 전부 넣지 않고 AI가 선별)
}
```

---

## 3. STAGE 2: 사전 스코어링 (Pre-scoring)

### 3-1. 스코어링 목적

AI에게 30개 후보를 전부 보내면:
- 토큰 낭비 (비용 증가)
- 프롬프트가 너무 길어 핵심 지시를 놓칠 위험
- 무관한 관광지가 코스에 편입될 위험

**12~15개로 압축**하되, AI가 선택의 여지를 가질 수 있도록 약간의 다양성을 보장합니다.

### 3-2. 스코어링 공식

```
총점 = (취향 매칭 × 40) + (동반자 적합도 × 20) + (날씨 적합도 × 15) + (거리 점수 × 15) + (계절 보너스 × 10)
```

#### A. 취향 매칭 점수 (0~1, 가중치 40%)

```typescript
function preferenceScore(spot: SpotCandidate, preferences: Preference[]): number {
  // 사용자 선택 취향과 관광지 카테고리 매칭
  const catMap = PREFERENCE_CAT_MAP;
  
  let maxMatch = 0;
  for (const pref of preferences) {
    const mapping = catMap[pref];
    
    // contentTypeId 매칭: 0.6
    if (mapping.contentTypeIds.includes(spot.contentTypeId)) maxMatch = Math.max(maxMatch, 0.6);
    
    // cat1 매칭: 0.8
    if (mapping.cat1?.includes(spot.cat1)) maxMatch = Math.max(maxMatch, 0.8);
    
    // cat2 매칭 (가장 세밀): 1.0
    if (mapping.cat2?.includes(spot.cat2)) maxMatch = Math.max(maxMatch, 1.0);
  }
  
  return maxMatch;
}
```

#### B. 동반자 적합도 (0~1, 가중치 20%)

```typescript
const COMPANION_BOOST: Record<Companion, {
  preferred: string[];    // cat2/cat3에 이 키워드가 있으면 가산
  avoided: string[];      // 감산 키워드
}> = {
  solo: {
    preferred: ['카페', '미술관', '서점', '공원', '산책'],
    avoided: ['놀이공원', '키즈', '워터파크'],
  },
  couple: {
    preferred: ['카페', '야경', '전시', '산책로', '포토존', '레스토랑'],
    avoided: ['키즈', '아동', '체험학습'],
  },
  family: {
    preferred: ['체험', '키즈', '공원', '동물원', '놀이', '무장애'],
    avoided: ['바', '클럽', '주점'],
  },
  friends: {
    preferred: ['맛집', '액티비티', '이색체험', '카페', '전시'],
    avoided: [],
  },
};

function companionScore(spot: SpotCandidate, companion: Companion): number {
  const { preferred, avoided } = COMPANION_BOOST[companion];
  const text = `${spot.title} ${spot.cat2} ${spot.cat3} ${spot.overview ?? ''}`.toLowerCase();
  
  let score = 0.5; // 기본 중립
  
  for (const kw of preferred) {
    if (text.includes(kw)) { score += 0.1; break; } // 최대 0.6까지
  }
  for (const kw of avoided) {
    if (text.includes(kw)) { score -= 0.3; break; } // 부적합 페널티
  }
  
  return Math.max(0, Math.min(1, score));
}
```

#### C. 날씨 적합도 (0~1, 가중치 15%)

```typescript
function weatherScore(spot: SpotCandidate, weather: WeekendWeather): number {
  const isOutdoor = ['A01', 'A03'].includes(spot.cat1); // 자연, 레포츠
  const isIndoor = ['A02', 'A05'].includes(spot.cat1);  // 인문(문화시설), 음식
  
  // 비 예보 시
  const rainy = weather.saturday.pop > 50;
  
  if (rainy && isOutdoor) return 0.2;   // 야외는 감산
  if (rainy && isIndoor) return 0.9;    // 실내는 가산
  if (!rainy && isOutdoor) return 0.9;  // 맑으면 야외 가산
  
  return 0.6; // 기본
}
```

#### D. 거리 점수 (0~1, 가중치 15%)

```typescript
function distanceScore(distanceKm: number, duration: Duration): number {
  // 시간 예산에 따라 허용 거리 다름
  const maxKm: Record<Duration, number> = {
    half_day: 15,    // 반나절: 15km 이내
    full_day: 30,    // 하루: 30km 이내
    leisurely: 25,   // 느긋: 25km
  };
  
  const max = maxKm[duration];
  if (distanceKm > max) return 0;
  
  // 가까울수록 높은 점수 (역선형)
  return 1 - (distanceKm / max);
}
```

#### E. 계절 보너스 (0~0.3, 가중치 10%)

```typescript
function seasonBonus(spot: SpotCandidate, month: number): number {
  const text = `${spot.title} ${spot.overview ?? ''}`.toLowerCase();
  
  const SEASON_KEYWORDS: Record<number, string[]> = {
    3: ['벚꽃', '매화', '봄꽃', '개나리', '유채'],
    4: ['벚꽃', '튤립', '봄', '꽃축제', '철쭉'],
    5: ['장미', '초여름', '수국'],
    6: ['수국', '계곡', '바다', '해수욕'],
    7: ['계곡', '바다', '워터', '해수욕', '물놀이'],
    8: ['계곡', '바다', '여름', '피서'],
    9: ['코스모스', '억새', '가을'],
    10: ['단풍', '억새', '가을', '은행'],
    11: ['단풍', '낙엽', '가을', '국화'],
    12: ['눈', '겨울', '온천', '스키'],
    1: ['눈', '겨울', '온천', '스키', '빙어'],
    2: ['눈', '겨울', '온천', '매화', '설경'],
  };
  
  const keywords = SEASON_KEYWORDS[month] ?? [];
  return keywords.some(kw => text.includes(kw)) ? 0.3 : 0;
}
```

### 3-3. 다양성 보장 로직

상위 점수만 뽑으면 비슷한 관광지가 몰릴 수 있습니다. **카테고리 분산**을 강제합니다.

```typescript
function diversifyResults(scored: ScoredSpot[], targetCount: number): ScoredSpot[] {
  const result: ScoredSpot[] = [];
  const catBuckets = new Map<string, ScoredSpot[]>();
  
  // 카테고리별 버킷 분류
  for (const s of scored) {
    const bucket = catBuckets.get(s.cat1) ?? [];
    bucket.push(s);
    catBuckets.set(s.cat1, bucket);
  }
  
  // 라운드 로빈: 각 카테고리에서 1개씩 교대로 뽑기
  let round = 0;
  while (result.length < targetCount) {
    let picked = false;
    for (const [, bucket] of catBuckets) {
      if (round < bucket.length && result.length < targetCount) {
        result.push(bucket[round]);
        picked = true;
      }
    }
    if (!picked) break;
    round++;
  }
  
  return result;
}
```

---

## 4. STAGE 3: AI 코스 생성 (Gemini 프롬프트 설계)

### 4-1. 프롬프트 설계 원칙

| 원칙 | 이유 |
|------|------|
| systemInstruction + userMessage 분리 | 기존 사주 시스템에서 검증된 패턴. 역할/규칙은 system에, 데이터는 user에 |
| JSON 출력 강제 | 마크다운 파싱 불안정 → 구조화된 JSON으로 파싱 안정성 확보 |
| 후보 목록 제공 방식 | AI가 완전 자유 생성하면 없는 관광지를 만들어냄 → 후보 풀에서 선택하도록 제한 |
| 구체적 제약 조건 명시 | "30분 이내 이동", "식사 시간 배치" 등 사람이 당연히 고려하는 것을 명시 |
| 톤 앤 매너 지정 | 건조한 나열이 아닌, 친근한 꿀팁과 추천 이유가 포함된 코스 |

### 4-2. System Instruction

```
당신은 한국 주말 나들이 전문 코스 플래너입니다. 사용자의 위치, 취향, 동반자, 시간 예산, 날씨를 종합 분석하여 최적의 나들이 코스를 설계합니다.

## 핵심 역할
- 제공된 관광지 후보 목록 중에서만 선택하여 코스를 구성합니다.
- 후보 목록에 없는 장소를 임의로 추가하지 않습니다.
- 각 장소에 대해 "지금 왜 좋은지"를 구체적으로 설명합니다.

## 코스 설계 규칙

### 동선 최적화
- 출발 위치에서 가장 가까운 곳부터 시작합니다.
- 장소 간 이동시간이 자동차 30분(약 15km)을 초과하지 않도록 합니다.
- 마지막 장소는 출발 위치 방향으로 돌아오는 동선이면 이상적입니다.
- 같은 방향에 있는 장소끼리 묶어서 왕복 이동을 최소화합니다.

### 시간 배분
- 시작 시간: 오전 10시 (반나절) / 오전 9시 (하루) / 오전 10시 (느긋)
- 관광지 체류: 최소 30분, 최대 2시간
- 음식점: 점심 11:30~13:00, 저녁 17:30~19:00 사이에 배치
- 카페: 식사와 식사 사이, 또는 마지막 코스에 배치
- 이동시간은 장소 간 직선거리의 1.5배(도로 보정)로 추정

### 동반자별 배려
- solo: 혼자 편한 곳, 웨이팅 적은 곳, 충전 가능한 카페
- couple: 분위기 좋은 곳, 사진 찍기 좋은 곳, 밤 코스 포함 가능
- family: 아이 편의시설, 유모차 접근성, 체험 우선, 이동거리 최소화
- friends: 맛집 위주, 활동적인 코스, 2차 가능한 동선

### 날씨 대응
- 비 예보: 실내 위주 + 우천 시 대안 멘트 포함
- 맑음: 야외 활동 적극 포함, 포토존 추천
- 추움/더움: 시간대 조절 (더울 때는 오전 일찍, 실내 점심, 저녁 야외)

### 축제 편입
- 이번 주말 진행 중인 축제가 있다면 자연스럽게 코스에 편입합니다.
- 축제는 "지금 아니면 못 가는" 시의성이 있으므로 우선순위 높게 배치합니다.
- 단, 코스의 흐름을 해치면 편입하지 않습니다.

## 꿀팁 작성 규칙
- 각 장소의 tip 필드에는 실용적인 정보를 포함합니다.
- "주차는 어디가 편한지", "웨이팅 줄이는 방법", "사진 잘 나오는 포인트" 등
- 추상적인 "좋아요", "추천" 대신 구체적이고 실행 가능한 팁
- ~요체 사용 (친근하게)

## 출력 형식
반드시 아래 JSON 구조로만 응답하세요. JSON 외 텍스트(마크다운, 설명 등) 절대 금지.
```

### 4-3. JSON 출력 스키마 (프롬프트에 포함)

```json
{
  "title": "토요일 반나절 코스 (서울 강남 출발)",
  "summary": "벚꽃 만개한 서울숲에서 시작해 성수동 카페와 플리마켓으로 이어지는 봄 코스",
  "totalDistanceKm": 3.2,
  "tip": "서울숲 2번 출구 주차장이 주말에도 비교적 여유 있어요",
  "stops": [
    {
      "order": 1,
      "contentId": "126508",
      "title": "서울숲",
      "timeStart": "10:00",
      "durationMin": 60,
      "description": "겹벚꽃이 지금 만개 중이에요. 사슴방사장 옆 산책로가 가장 예뻐요.",
      "tip": "정문보다 2번 출구 쪽이 한산하고 주차도 편해요",
      "latitude": 37.5443,
      "longitude": 127.0374,
      "imageUrl": "",
      "isFestival": false
    }
  ]
}
```

### 4-4. User Message 구성

```typescript
function buildUserMessage(input: {
  departure: { name: string; lat: number; lng: number };
  duration: Duration;
  companion: Companion;
  preferences: Preference[];
  candidates: ScoredSpot[];
  festivals: FestivalCandidate[];
  weather: WeekendWeather;
  currentMonth: number;
}): string {
  
  return `## 사용자 조건
- 출발: ${input.departure.name} (위도 ${input.departure.lat}, 경도 ${input.departure.lng})
- 시간 예산: ${DURATION_DETAIL[input.duration]}
- 동반자: ${COMPANION_DETAIL[input.companion]}
- 취향: ${input.preferences.map(p => PREFERENCE_LABELS[p]).join(', ')}
- 현재 월: ${input.currentMonth}월 (${SEASON_NAME[input.currentMonth]}
)

## 이번 주말 날씨
- 토요일: ${input.weather.saturday.summary} (강수확률 ${input.weather.saturday.pop}%)
- 일요일: ${input.weather.sunday.summary} (강수확률 ${input.weather.sunday.pop}%)
- 추천: ${input.weather.recommendation}

## 이번 주말 근처 축제 (있다면 코스에 편입 고려)
${input.festivals.length > 0
  ? input.festivals.map(f => 
      `- [축제] ${f.title} | ${f.addr1} | ~${f.eventEndDate} | ${f.aiSummary ?? ''}`
    ).join('\n')
  : '근처 진행 중 축제 없음'}

## 관광지 후보 (이 목록에서만 선택)
${input.candidates.map((c, i) => 
  `${i+1}. [${c.contentId}] ${c.title} (${c.cat2}) | ${c.addr1} | 출발지에서 ${c.distanceKm.toFixed(1)}km | 위도 ${c.latitude} 경도 ${c.longitude}${c.overview ? ` | ${c.overview.slice(0, 80)}...` : ''}`
).join('\n')}

위 조건과 후보 목록을 기반으로 최적의 코스를 JSON으로 만들어주세요.`;
}
```

### 4-5. 시간 예산별 상세 가이드

```typescript
const DURATION_DETAIL: Record<Duration, string> = {
  half_day: '반나절 (3~4시간). 장소 3~4개. 오전 10시 시작. 점심 포함 가능.',
  full_day: '하루 (6~8시간). 장소 5~7개. 오전 9시 시작. 점심+저녁 식사 시간 포함.',
  leisurely: '느긋하게 (시간 제한 없음). 장소 4~5개. 오전 10시 시작. 각 장소 여유롭게 체류.',
};

const COMPANION_DETAIL: Record<Companion, string> = {
  solo: '혼자. 웨이팅 부담 없고, 조용히 즐길 수 있는 곳 선호.',
  couple: '연인. 분위기 있고 사진 찍기 좋은 곳. 저녁 야경도 좋음.',
  family: '가족+어린이. 아이 편의시설 중요. 이동거리 짧게. 체험형 우선.',
  friends: '친구들. 맛집 필수. 활동적이고 재미있는 코스. 2차 동선 고려.',
};
```

---

## 5. STAGE 4: 후처리 & 검증

### 5-1. JSON 파싱 전략

Gemini가 JSON을 감싸는 마크다운 코드블록을 반환할 수 있으므로 다단계 파싱:

```typescript
function parseCourseJSON(raw: string): CourseData {
  // 1단계: 코드블록 제거
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();
  
  // 2단계: JSON 파싱
  const parsed = JSON.parse(cleaned);
  
  // 3단계: 스키마 검증
  validateCourseSchema(parsed);
  
  return parsed as CourseData;
}
```

### 5-2. 스키마 검증

```typescript
function validateCourseSchema(data: any): void {
  if (!data.title || typeof data.title !== 'string') throw new Error('title 누락');
  if (!data.summary || typeof data.summary !== 'string') throw new Error('summary 누락');
  if (!Array.isArray(data.stops) || data.stops.length === 0) throw new Error('stops 빈 배열');
  
  for (const stop of data.stops) {
    if (!stop.contentId) throw new Error(`stop ${stop.order}: contentId 누락`);
    if (!stop.title) throw new Error(`stop ${stop.order}: title 누락`);
    if (!stop.timeStart || !/^\d{2}:\d{2}$/.test(stop.timeStart)) {
      throw new Error(`stop ${stop.order}: timeStart 형식 오류 (HH:MM 필요)`);
    }
    if (typeof stop.durationMin !== 'number' || stop.durationMin < 10) {
      throw new Error(`stop ${stop.order}: durationMin 부적절`);
    }
    if (typeof stop.latitude !== 'number' || typeof stop.longitude !== 'number') {
      throw new Error(`stop ${stop.order}: 좌표 누락`);
    }
  }
  
  // 시간 순서 검증
  for (let i = 1; i < data.stops.length; i++) {
    if (data.stops[i].timeStart <= data.stops[i - 1].timeStart) {
      throw new Error(`stop ${data.stops[i].order}: 시간 순서 역전`);
    }
  }
}
```

### 5-3. 동선 보정

AI가 잘못된 동선을 제안할 경우를 대비합니다.

```typescript
function validateRoute(stops: CourseStop[], maxLegKm: number = 20): string[] {
  const warnings: string[] = [];
  
  for (let i = 1; i < stops.length; i++) {
    const dist = haversineKm(
      stops[i-1].latitude, stops[i-1].longitude,
      stops[i].latitude, stops[i].longitude,
    );
    if (dist > maxLegKm) {
      warnings.push(
        `${stops[i-1].title} → ${stops[i].title} 이동거리 ${dist.toFixed(1)}km (${maxLegKm}km 초과)`
      );
    }
  }
  
  return warnings;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### 5-4. contentId 교차 검증

AI가 후보 목록에 없는 contentId를 만들어내는 것을 방지:

```typescript
function crossValidateContentIds(
  stops: CourseStop[],
  candidates: ScoredSpot[],
  festivals: FestivalCandidate[],
): void {
  const validIds = new Set([
    ...candidates.map(c => c.contentId),
    ...festivals.map(f => f.contentId),
  ]);
  
  for (const stop of stops) {
    if (!validIds.has(stop.contentId)) {
      // AI가 임의로 만든 ID → 후보 중 가장 비슷한 것으로 교체
      const closest = findClosestCandidate(stop, candidates);
      if (closest) {
        stop.contentId = closest.contentId;
        stop.latitude = closest.latitude;
        stop.longitude = closest.longitude;
      }
    }
  }
}
```

---

## 6. 모델 폴백 & 에러 처리

### 6-1. 모델 폴백 전략 (사주 시스템과 동일)

```typescript
const MODELS = [
  { id: 'gemini-2.5-pro',   maxTokens: 4096, temp: 0.7 },
  { id: 'gemini-2.5-flash', maxTokens: 4096, temp: 0.7 },
  { id: 'gemini-2.0-flash', maxTokens: 4096, temp: 0.7 },
] as const;
```

### 6-2. 재시도 전략

```
1차 시도: gemini-2.5-pro
  → JSON 파싱 실패 시: 동일 모델로 1회 재시도 (프롬프트에 "JSON만 출력" 강조)
  → 모델 에러 시: 다음 모델로 폴백

2차 시도: gemini-2.5-flash
  → 위와 동일

3차 시도: gemini-2.0-flash
  → 실패 시: 사전 스코어링 기반 규칙 코스 생성 (AI 없이)
```

### 6-3. 규칙 기반 폴백 코스

AI가 모두 실패할 경우, 스코어링 데이터만으로 기본 코스를 생성합니다.

```typescript
function generateFallbackCourse(
  candidates: ScoredSpot[],
  duration: Duration,
  departure: { lat: number; lng: number },
): CourseData {
  // 점수 상위 N개를 거리 순으로 정렬
  const stopCount = duration === 'half_day' ? 3 : duration === 'full_day' ? 5 : 4;
  const topN = candidates.slice(0, stopCount);
  
  // 출발지에서 가까운 순으로 정렬 (greedy nearest neighbor)
  const ordered = greedyNearestNeighbor(topN, departure);
  
  // 시간 자동 배분
  let currentTime = duration === 'full_day' ? 9 * 60 : 10 * 60; // 분 단위
  const stops = ordered.map((spot, i) => {
    const timeStart = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`;
    const dur = 60; // 기본 1시간
    currentTime += dur + 30; // 체류 + 이동 30분
    
    return {
      order: i + 1,
      contentId: spot.contentId,
      title: spot.title,
      timeStart,
      durationMin: dur,
      description: spot.overview?.slice(0, 100) ?? spot.title,
      tip: '',
      latitude: spot.latitude,
      longitude: spot.longitude,
      imageUrl: spot.firstImage ?? '',
      isFestival: false,
    };
  });
  
  return {
    title: `${duration === 'half_day' ? '반나절' : '하루'} 코스`,
    summary: 'AI 생성에 일시적 문제가 있어 자동 구성된 코스입니다.',
    totalDistanceKm: calculateTotalDistance(stops),
    tip: '',
    stops,
  };
}
```

---

## 7. 성능 & 비용 최적화

### 7-1. 응답 시간 목표

| 단계 | 목표 시간 | 최적화 방법 |
|------|----------|------------|
| 후보 수집 | < 2초 | DB 캐시 우선, TourAPI 병렬 호출 |
| 스코어링 | < 100ms | 인메모리 계산 |
| AI 생성 | < 8초 | flash 모델 폴백, maxTokens 4096 제한 |
| 후처리 | < 200ms | 단순 JSON 파싱 + 검증 |
| **전체** | **< 10초** | |

### 7-2. 비용 추정

| 항목 | 단가 | 일 500건 기준 월 비용 |
|------|------|----------------------|
| Gemini 2.5 Pro Input | $1.25/1M tokens | ~$2.5 |
| Gemini 2.5 Pro Output | $10/1M tokens | ~$7.5 |
| Gemini 2.5 Flash (폴백) | 훨씬 저렴 | ~$1 |
| TourAPI | 무료 | $0 |
| 기상청 API | 무료 | $0 |
| **합계** | | **~$10~15/월** |

### 7-3. 토큰 절약 전략

- 후보를 12~15개로 사전 필터링 (30개 → 50% 토큰 절약)
- overview를 80자로 잘라서 전달
- JSON 출력만 요청 (마크다운 설명 제거 → output 토큰 50% 절약)
- 코스 tip은 한 줄로 제한

---

## 8. 고도화 로드맵

### Phase 1: MVP (현재)
- 단일 코스 생성
- 사전 스코어링 + Gemini 생성
- 기본 검증 + 폴백

### Phase 2: 품질 개선 (6~7월)
- **A/B 코스 생성**: 같은 조건으로 2개 코스를 생성하여 사용자 선택 → 선호도 데이터 수집
- **코스 재생성**: "이 장소 빼줘" → 해당 장소 제외하고 재생성
- **코스 미세 조정**: 특정 장소를 드래그로 순서 변경 시 시간표 자동 재계산

### Phase 3: 개인화 (8~9월)
- **사용자 히스토리 학습**: 과거 코스에서 선택/스킵한 카테고리 패턴 → 스코어링에 반영
- **"또 가고 싶은 곳"**: 재방문 추천 (계절이 바뀌면 같은 곳도 다른 매력)
- **시간대별 최적화**: 일출/일몰 시간 반영 → 야경 명소를 자동으로 마지막에 배치

### Phase 4: 소셜 (추후)
- **코스 후기**: 다녀온 코스에 별점 + 사진 → 추천 품질 피드백 루프
- **인기 코스 추천**: "이번 주 서울 인기 코스 TOP 3"

---

## 9. 품질 평가 기준 (자체 QA)

### 9-1. 코스 품질 체크리스트

| 항목 | 기준 | 심각도 |
|------|------|--------|
| 장소 수 | half_day 3~4, full_day 5~7, leisurely 4~5 | Critical |
| 시간 순서 | 모든 stop의 timeStart가 오름차순 | Critical |
| 이동 거리 | 인접 장소 간 15km 이내 | Warning |
| 식사 시간 | full_day에 음식점 최소 1곳 포함 | Warning |
| contentId 유효성 | 모든 stop의 contentId가 후보 목록에 존재 | Critical |
| 좌표 유효성 | 한국 범위 내 (33~43°N, 124~132°E) | Critical |
| 중복 장소 | 같은 contentId 중복 없음 | Critical |
| 취향 반영 | 선택한 취향 카테고리 최소 1개 포함 | Warning |
| 축제 편입 | 진행 중 축제가 있으면 코스에 포함 시도 | Suggestion |
| 꿀팁 품질 | 각 stop.tip이 10자 이상 실용적 내용 | Suggestion |

### 9-2. 자동 테스트 시나리오

```typescript
const TEST_SCENARIOS = [
  {
    name: '서울 강남 혼자 반나절 카페',
    input: { lat: 37.4979, lng: 127.0276, duration: 'half_day', companion: 'solo', preferences: ['cafe'] },
    expect: { stopCount: [3, 4], hasCafe: true },
  },
  {
    name: '부산 가족 하루 자연+맛집',
    input: { lat: 35.1796, lng: 129.0756, duration: 'full_day', companion: 'family', preferences: ['nature', 'food'] },
    expect: { stopCount: [5, 7], hasFood: true },
  },
  {
    name: '제주 커플 느긋 사진+카페',
    input: { lat: 33.4996, lng: 126.5312, duration: 'leisurely', companion: 'couple', preferences: ['photo', 'cafe'] },
    expect: { stopCount: [4, 5] },
  },
  {
    name: '비 오는 날 실내 코스',
    input: { lat: 37.5665, lng: 126.9780, duration: 'half_day', companion: 'friends', preferences: ['culture', 'food'] },
    weather: { saturday: { pop: 80 } },
    expect: { indoorRatio: 0.7 },
  },
];
```
