// ============================================================
// POST /api/course — AI 코스 생성 엔드포인트
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { COURSE_TTL_DAYS, sweepExpiredCourses } from '@/lib/course-lifecycle';
import { generateEditToken } from '@/lib/course-edit';
import { fetchSuggestionsForLimitError } from '@/lib/course-community';
import { getCurrentUserId } from '@/lib/auth';
import { formatDateYMD, getNextWeekend } from '@/lib/tour-api';
import { collectCandidates, collectFestivals, collectStays } from '@/lib/course-candidates';
import { getWeekendForecast } from '@/lib/weather-api';
import { fetchBarrierFree } from '@/lib/barrier-free-api';
import { type Element5 } from '@/lib/saju';
import { getTripSaju } from '@/lib/trip-context';
import { finalizeCourse } from '@/lib/course-quality';
import { createStageTimer, formatTimingHeader, formatTimingLine } from '@/lib/course-stage-timer';
import {
  checkAndBumpUsage, clientKeyFrom, secondsUntilKstMidnight,
  PER_CLIENT_DAILY, GLOBAL_DAILY,
} from '@/lib/usage-limit';
import {
  generateCourse,
  filterByAccessibility,
  generateFallbackCourse,
  scoreAndRankCandidates,
  enrichWithFacilities,
  generateShareSlug,
  buildKakaoNaviUrl,
  haversineKm,
  type CourseGenerationInput,
} from '@/lib/weekend-ai';
import type {
  CourseRequest,
  AccessibilityNeed,
  BarrierFreeInfo,
  CourseResponse,
  Duration,
  Companion,
  Preference,
  Feeling,
  DestinationType,
  MoodType,
  CourseSaju,
  CourseData,
  VisitDay,
} from '@/lib/weekend-types';
import { MOOD_OPTIONS, CITY_OPTIONS } from '@/lib/weekend-types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── 인메모리 Rate Limiter (IP 기반, 분당 3회) ───
//
// 🔴 이건 **버스트 차단기지 예산 차단기가 아니다.** 두 가지 한계가 있다:
//   1) 서버리스라 인스턴스마다 Map 이 따로 산다. 콜드스타트마다 리셋된다.
//   2) 하루 총량 개념이 없다 — 분당 3회를 하루 내내 유지하면 4,320회 ≈ 13만원이다.
// 하루 상한·전체 예산 상한은 lib/usage-limit.ts 가 Supabase 카운터로 따로 건다.

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

// 오래된 엔트리 정리 (메모리 누수 방지, 5분마다)
if (typeof globalThis !== 'undefined') {
  const CLEANUP_INTERVAL = 5 * 60_000;
  const key = '__weekend_rate_limit_cleanup';
  if (!(globalThis as Record<string, unknown>)[key]) {
    (globalThis as Record<string, unknown>)[key] = true;
    setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of ipHits) {
        if (now > entry.resetAt) ipHits.delete(ip);
      }
    }, CLEANUP_INTERVAL);
  }
}

// ─── 유효성 검증 ───

const VALID_DURATIONS: Duration[] = ['half_day', 'full_day', 'leisurely', 'overnight'];
const VALID_COMPANIONS: Companion[] = ['solo', 'couple', 'family', 'friends'];
const VALID_PREFERENCES: Preference[] = ['nature', 'food', 'culture', 'cafe', 'activity', 'photo'];
const VALID_DESTINATION_TYPES: DestinationType[] = ['nearby', 'city', 'mood'];
const VALID_MOODS: MoodType[] = ['mountain', 'sea', 'valley', 'urban', 'countryside'];
const VALID_FEELINGS: Feeling[] = ['tired', 'excited', 'romantic', 'healing', 'adventurous', 'foodie'];
const VALID_VISIT_DAYS: VisitDay[] = ['sat', 'sun'];
const VALID_ELEMENTS: Element5[] = ['wood', 'fire', 'earth', 'metal', 'water'];

const VALID_ACCESSIBILITY: AccessibilityNeed[] = ['mobility', 'visual', 'hearing', 'infant'];

function validateRequest(body: unknown): CourseRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('요청 형식이 올바르지 않습니다.');
  const b = body as Record<string, unknown>;

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (isNaN(lat) || isNaN(lng) || lat < 33 || lat > 43 || lng < 124 || lng > 132) {
    throw new Error('위치 정보가 올바르지 않습니다. 한국 내 좌표를 입력해주세요.');
  }

  const duration = b.duration as Duration;
  if (!VALID_DURATIONS.includes(duration)) {
    throw new Error('시간 선택이 올바르지 않습니다.');
  }

  const companion = b.companion as Companion;
  if (!VALID_COMPANIONS.includes(companion)) {
    throw new Error('동반자 선택이 올바르지 않습니다.');
  }

  const preferences = b.preferences as Preference[];
  if (!Array.isArray(preferences) || preferences.length === 0 || preferences.length > 3) {
    throw new Error('취향을 1~3개 선택해주세요.');
  }
  if (!preferences.every(p => VALID_PREFERENCES.includes(p))) {
    throw new Error('올바르지 않은 취향이 포함되어 있습니다.');
  }

  const destinationType = (b.destinationType as DestinationType) || 'nearby';
  if (!VALID_DESTINATION_TYPES.includes(destinationType)) {
    throw new Error('목적지 유형이 올바르지 않습니다.');
  }

  const cityAreaCode = b.cityAreaCode ? Number(b.cityAreaCode) : undefined;
  if (destinationType === 'city' && !CITY_OPTIONS.some(c => c.areaCode === cityAreaCode)) throw new Error('도시 선택이 올바르지 않습니다.');
  const mood = b.mood as MoodType | undefined;
  if (mood && !VALID_MOODS.includes(mood)) {
    throw new Error('분위기 선택이 올바르지 않습니다.');
  }
  if (destinationType === 'mood' && !mood) throw new Error('분위기 선택이 올바르지 않습니다.');

  const feeling = b.feeling as Feeling | undefined;
  if (feeling && !VALID_FEELINGS.includes(feeling)) {
    throw new Error('기분 선택이 올바르지 않습니다.');
  }

  // 접근성은 선택 사항이다. 없거나 빈 배열이면 undefined 로 정규화해서,
  // 아래 파이프라인이 "조건 없음"을 한 가지 모양으로만 보게 한다.
  let accessibility: AccessibilityNeed[] | undefined;
  const rawA11y = b.accessibility;
  if (rawA11y !== undefined && !Array.isArray(rawA11y)) throw new Error('접근성 선택이 올바르지 않습니다.');
  if (Array.isArray(rawA11y) && rawA11y.length > 0) {
    const filtered = rawA11y.filter((a): a is AccessibilityNeed =>
      VALID_ACCESSIBILITY.includes(a as AccessibilityNeed));
    if (filtered.length !== rawA11y.length) {
      throw new Error('올바르지 않은 접근성 항목이 포함되어 있습니다.');
    }
    accessibility = filtered;
  }

  const visitDay = (b.visitDay ?? 'sat') as VisitDay;
  if (visitDay && !VALID_VISIT_DAYS.includes(visitDay)) {
    throw new Error('방문 요일 선택이 올바르지 않습니다.');
  }

  let saju: CourseSaju | undefined;
  const rawSaju = b.saju as Record<string, unknown> | undefined;
  if (rawSaju !== undefined) {
    if (!rawSaju || typeof rawSaju !== 'object') throw new Error('사주 기운 정보가 올바르지 않습니다.');
    const birthElement = rawSaju.birthElement as Element5;
    const todayElement = rawSaju.todayElement as Element5;
    if (!VALID_ELEMENTS.includes(birthElement) || !VALID_ELEMENTS.includes(todayElement)) {
      throw new Error('사주 기운 정보가 올바르지 않습니다.');
    }
    saju = getTripSaju(birthElement, duration, visitDay);
  }

  return { lat, lng, duration, companion, preferences, feeling, destinationType, cityAreaCode, mood, saju, visitDay, accessibility };
}

// ─── 메인 핸들러 ───

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();
  // 🔴 어느 단계가 대기시간을 먹는지 재는 자(2026-09-21 P1). 재기만 하고 아무것도 건너뛰지 않는다.
  const timer = createStageTimer();
  // Rate Limit 체크
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 },
    );
  }

  try {
    // JSON 파싱 (별도 try-catch로 400 반환)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: '요청 형식이 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    // 「다른 코스도 볼래요」 — 저장된 코스의 원본 조건으로 B 코스만 만든다.
    // 🔑 조건을 클라이언트에서 받지 않고 DB 에서 읽는다. 공유 링크로 들어온 사람은
    //    위저드를 거치지 않아 조건을 갖고 있지 않다.
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
    const rawBody = body as Record<string, unknown>;
    const alternativeFor = typeof rawBody.alternativeFor === 'string' ? rawBody.alternativeFor : null;

    let req: CourseRequest;
    if (alternativeFor) {
      const { data: row } = await createAdminClient()
        .from('wk_courses')
        .select('request_params, course_b_data')
        .eq('share_slug', alternativeFor)
        .single();

      if (!row?.request_params) {
        // 013 마이그레이션 이전에 만들어진 코스는 조건이 없다. 재생성이 불가능하다.
        return NextResponse.json(
          { error: '이 코스는 다른 버전을 만들 수 없어요. 새로 만들어보세요!' },
          { status: 404 },
        );
      }
      if (row.course_b_data) {
        // 이미 만들어 둔 게 있으면 그대로 준다 — 같은 코스에 두 번 과금하지 않는다.
        return NextResponse.json({ courseB: row.course_b_data as CourseData });
      }
      req = validateRequest(row.request_params);
    } else {
      req = validateRequest(body);
    }

    // 잘못된 입력·이미 저장된 B 조회는 일일 생성 횟수에서 제외한다.
    const usage = await checkAndBumpUsage(clientKeyFrom(request.headers));
    if (!usage.allowed) {
      const message = usage.blockedBy === 'global'
        ? '오늘 만들 수 있는 코스가 모두 소진됐어요. 내일 다시 만나요!'
        : `하루에 만들 수 있는 코스는 ${PER_CLIENT_DAILY}개예요. 내일 다시 만들어드릴게요!`;
      console.warn(`[이모추API] 상한 도달(${usage.blockedBy}) global=${usage.globalCount}/${GLOBAL_DAILY}`);
      return NextResponse.json({ error: message, suggestions: await fetchSuggestionsForLimitError() }, {
        status: 429, headers: { 'Retry-After': String(secondsUntilKstMidnight()) },
      });
    }
    if (usage.degraded) console.warn('[이모추API] 사용량 카운터 연결 확인 필요');

    // 1. 후보 수집 + 날씨 + 축제 병렬 조회
    const { saturday, sunday } = getNextWeekend();

    const [candidates, weather, festivals, stays] = await timer.track('collect', () => Promise.all([
      collectCandidates(req),
      getWeekendForecast({
        lat: req.lat,
        lng: req.lng,
        saturdayDate: formatDateYMD(saturday),
        sundayDate: formatDateYMD(sunday),
      }),
      collectFestivals(req),
      collectStays(req),
    ]));

    timer.note('candidates', candidates.length);
    timer.note('festivals', festivals.length);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: '근처에 추천할 관광지를 찾지 못했어요. 위치를 확인해주세요.' },
        { status: 404 },
      );
    }

    // 1.5. 편의시설 정보 보강 (detailIntro 병렬 조회, 상위 20개)
    // family 동행자는 유모차/키즈시설 정보가 핵심, 그 외에도 주차 정보 유용
    // 외부 API 지연이 maxDuration(60s)을 잠식하지 않도록 상한을 둔다. 초과 시 보강 없이 진행.
    // enrichWithFacilities는 내부적으로 Promise.allSettled로 전체를 기다린 뒤 일괄 반영하므로,
    // 타임아웃 시에는 보강이 하나도 반영되지 않는다(all-or-nothing). 미반영 항목은
    // closedWeekdays가 undefined로 남고 closedPenalty가 감점 0으로 처리하므로 안전하다.
    const ENRICH_TIMEOUT_MS = 8_000;
    let enrichTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await timer.track('enrich', () => Promise.race([
        enrichWithFacilities(candidates, 20),
        new Promise<void>((resolve) => {
          enrichTimer = setTimeout(() => {
            console.warn('[이모추API] 편의시설 보강 타임아웃 → 보강 없이 진행');
            resolve();
          }, ENRICH_TIMEOUT_MS);
        }),
      ]));
    } catch (enrichErr) {
      console.warn('[이모추API] 편의시설 조회 실패 (무시):', enrichErr);
    } finally {
      clearTimeout(enrichTimer);
    }

    // 2. 사전 스코어링 + 다양성 보장
    const ranked = timer.trackSync('score', () => scoreAndRankCandidates(
      candidates,
      req.preferences,
      req.companion,
      req.duration,
      weather,
      req.feeling,
      req.visitDay,
      // 🔑 「오늘의 오행」만 넘긴다 — 매일 바뀌는 축이라야 같은 사람이 다른 날 다른 코스를 받는다.
      req.saju?.todayElement,
    ));

    // 3. AI 코스 생성
    // 출발지/목적지 이름 결정
    let departureName = '현재 위치';
    if (req.destinationType === 'city' && req.cityAreaCode) {
      const city = CITY_OPTIONS.filter(c => c.areaCode === req.cityAreaCode).sort((a, b) =>
        haversineKm(req.lat, req.lng, a.lat, a.lng) - haversineKm(req.lat, req.lng, b.lat, b.lng))[0];
      departureName = city ? `${city.name} 중심` : '선택 도시';
    } else if (req.destinationType === 'mood' && req.mood) {
      const moodOpt = MOOD_OPTIONS.find(m => m.type === req.mood);
      departureName = moodOpt ? `${moodOpt.label} 추천 지역` : '추천 지역';
    }

    // 접근성 조건이 있을 때만 무장애 정보를 조회한다. 없으면 fetchBarrierFree 가
    // 빈 배열을 받아 호출조차 하지 않으므로 기존 경로에 지연이 0 이다.
    // 실패(403·타임아웃·429)해도 빈 Map 이라 코스 생성은 그대로 진행된다.
    let ranked2 = ranked;
    // enrichStops 에서 stop 에 붙여야 하므로 스코프를 바깥에 둔다.
    let bfInfo = new Map<string, BarrierFreeInfo>();
    const needs = req.accessibility;
    if (needs && needs.length > 0) {
      await timer.track('accessibility', async () => {
        bfInfo = await fetchBarrierFree(ranked.map(c => c.contentId));
        ranked2 = filterByAccessibility(ranked, needs, bfInfo).map((spot) => ({
          ...spot,
          barrierFree: bfInfo.get(spot.contentId),
        }));
      });
      timer.note('a11yKept', ranked2.length);
    }

    const input: CourseGenerationInput = {
      departure: { name: departureName, lat: req.lat, lng: req.lng },
      duration: req.duration,
      companion: req.companion,
      preferences: req.preferences,
      feeling: req.feeling,
      candidates: ranked2,
      repairCandidates: candidates,
      festivals,
      stays,
      weather,
      saju: req.saju,
      visitDay: req.visitDay,
      accessibility: req.accessibility,
    };

    // 🔑 코스는 **한 번에 하나만** 만든다.
    //    예전에는 A/B 를 항상 병렬로 만들어 요청당 Gemini 호출이 정확히 2회였다.
    //    실측(2026-08-31)으로 B 를 본 사람보다 안 본 사람이 훨씬 많을 구조인데
    //    비용은 전원에게 2배로 나갔다. 이제 B 는 「다른 코스도 볼래요」를 누른 사람만 만든다.
    const primaryVariant: 'a' | 'b' = alternativeFor ? 'b' : 'a';

    // 전체 요청 60초 중 수집에 쓴 시간을 제외하고 DB 저장 여유 7초를 남긴다.
    // SDK 요청도 취소하므로 Promise.race 패자에서 재시도·추가 과금이 이어지지 않는다.
    const aiController = new AbortController();
    const remainingMs = Math.max(0, 53_000 - (Date.now() - requestStartedAt));
    input.signal = AbortSignal.any([request.signal, aiController.signal]);
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let generated: CourseData;
    // 어느 경로로 만들어졌는지 로그에 남긴다 — 폴백이 잦다면 그게 대기시간의 진짜 원인이다.
    let aiSource: 'gemini' | 'timeout_fallback' | 'skipped' = 'gemini';
    if (remainingMs < 3_000) {
      aiSource = 'skipped';
      generated = generateFallbackCourse(ranked2, input.duration, input.departure, input.stays);
    } else {
      try {
        generated = await timer.track('ai', () => Promise.race([
          generateCourse(input, primaryVariant),
          new Promise<CourseData>(resolve => {
            fallbackTimer = setTimeout(() => {
              aiSource = 'timeout_fallback';
              aiController.abort();
              resolve(generateFallbackCourse(ranked2, input.duration, input.departure, input.stays));
            }, remainingMs);
          }),
        ]));
      } finally {
        clearTimeout(fallbackTimer);
        aiController.abort();
      }
    }

    timer.note('ai', aiSource);
    const course = timer.trackSync('finalize', () => finalizeCourse(generated, input));
    if (!course.stops.length) {
      return NextResponse.json({ error: '방문일에 맞는 장소가 부족해요. 날짜나 지역을 바꿔주세요.' }, { status: 422 });
    }
    // 감성 문장 하나를 위한 추가 AI 호출은 하지 않는다. B에도 같은 여행일 테마를 보존한다.
    const fortuneMessage = req.saju?.message ?? '';

    // 5-a. 「다른 코스」였다면 기존 행에 붙이고 끝낸다 (새 코스를 만들지 않는다)
    if (alternativeFor) {
      try {
        const { error } = await createAdminClient()
          .from('wk_courses')
          .update({ course_b_data: course })
          .eq('share_slug', alternativeFor);
        if (error) throw error;
      } catch (dbErr) {
        console.warn('[이모추API] B 코스 저장 실패 (코스는 반환):', dbErr);
      }
      timer.note('variant', 'b');
      console.info(formatTimingLine(timer.summary()));
      return NextResponse.json({ courseB: course }, { headers: { 'x-emochu-timings': formatTimingHeader(timer.summary()) } });
    }

    // 5-b. Supabase 저장 (실패해도 코스는 반환)
    const shareSlug = generateShareSlug();
    const editToken = generateEditToken();
    // 로그인 상태면 처음부터 계정에 붙인다. 비로그인이면 null 이고, 나중에
    // 로그인한 뒤 편집 토큰으로 claim 해서 가져갈 수 있다.
    const ownerId = await getCurrentUserId();
    let courseId = shareSlug;
    let persistence: 'saved' | 'temporary' = 'temporary';

    const persistStartedAt = Date.now();
    try {
      const supabase = createAdminClient();

      const { data: inserted, error: insertError } = await supabase
        .from('wk_courses')
        .insert({
          share_slug: shareSlug,
          user_id: ownerId,
          departure_lat: req.lat,
          departure_lng: req.lng,
          duration: req.duration,
          companion: req.companion,
          preferences: req.preferences,
          course_data: course,
          course_b_data: null,
          ai_model: 'gemini',
          // 만든 사람만 이 코스를 고칠 수 있게 하는 토큰. 응답으로 딱 한 번 나간다.
          edit_token: editToken,
          // 🔑 만든 코스가 전부 영구 보존되던 것을 바꿨다. 공유·저장을 누르지 않은
          //    코스는 30일 뒤 사라진다. 누르면 expires_at 이 NULL 이 되어 영구 보존된다.
          // 로그인해서 만든 코스는 「내 코스」에 남아야 하므로 만료시키지 않는다.
          expires_at: ownerId ? null : new Date(Date.now() + COURSE_TTL_DAYS * 86_400_000).toISOString(),
          is_kept: Boolean(ownerId),
          // 「다른 코스도 볼래요」를 나중에 누를 수 있게 원본 조건을 남긴다.
          // 🔴 위치는 넣지 않는다 — departure_lat/lng 컬럼에 이미 있다.
          request_params: {
            lat: req.lat, lng: req.lng,
            duration: req.duration, companion: req.companion,
            preferences: req.preferences, feeling: req.feeling,
            destinationType: req.destinationType, cityAreaCode: req.cityAreaCode,
            mood: req.mood, visitDay: req.visitDay,
            accessibility: req.accessibility, saju: req.saju,
          },
        })
        .select('id')
        .single();

      if (insertError || !inserted) throw new Error('코스 저장 실패');

      if (inserted) {
        courseId = inserted.id;
        persistence = 'saved';
      }

      // 만료된 코스를 조금씩 치운다. 별도 스케줄러 없이 도는 게 핵심이다 —
      // 인프라를 하나 더 두면 그게 또 관리 대상이 된다.
      void sweepExpiredCourses();
    } catch (dbErr) {
      console.warn('[이모추API] DB 저장 실패 (코스는 반환):', dbErr);
    }

    timer.mark('persist', Date.now() - persistStartedAt);
    timer.note('stops', course.stops.length);
    timer.note('persistence', persistence);
    // 🔑 한 요청이 로그 한 줄이다. 표본을 모아야 "어디가 느린가"에 답할 수 있다.
    console.info(formatTimingLine(timer.summary()));

    // 6. 응답
    const response: CourseResponse = {
      courseId,
      shareUrl: `/course/${shareSlug}`,
      course,
      persistence,
      editToken: persistence === 'saved' ? editToken : undefined,
      kakaoNaviUrl: buildKakaoNaviUrl(course.stops),
      fortuneMessage,
    };

    // 🔑 서버 로그를 못 보는 쪽도 단계별 소요를 읽을 수 있게 같은 내용을 헤더로 보낸다.
    //    (본문 계약은 건드리지 않는다 — 기존 클라이언트는 이 헤더를 무시한다.)
    return NextResponse.json(response, { headers: { 'x-emochu-timings': formatTimingHeader(timer.summary()) } });

  } catch (err) {
    const message = err instanceof Error ? err.message : '코스 생성 중 오류가 발생했습니다.';
    console.error('[이모추API] 코스 생성 실패:', err);

    // 유효성 에러는 400, 나머지는 500
    const isValidation = message.includes('올바르지') || message.includes('선택해');
    return NextResponse.json(
      { error: isValidation ? message : '코스 생성 중 연결 문제가 생겼어요. 잠시 후 다시 시도해주세요.' },
      { status: isValidation ? 400 : 500 },
    );
  }
}
