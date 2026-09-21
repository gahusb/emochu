// 코스 생성이 **어디서** 오래 걸리는지 재는 자.
//
// 🔴 2026-09-21 제출 후 관찰: 「코스 만들기」 클릭 후 20초 시점에도 생성 중이었고
//    45초 안에 끝났다(배포본 2회). 그런데 지금까지 남은 기록은 "느리다" 뿐이라
//    **어느 단계가 지배적인지 모른다.** 고치기 전에 재는 게 먼저다
//    (`docs/2026-09-21-작업-인수인계.md` P1 착수 순서 1).
//
// 🔑 캐시로 때우지 않는다. 심사가 인증키로 개발 기간 내 호출건수를 검증하므로
//    TourAPI 실호출 이력은 남아야 한다 — 이 모듈은 **재기만 하고 아무것도 건너뛰지 않는다.**
//
// 출력은 로그 한 줄이다. 서버리스 로그에서 한 요청이 한 줄로 보여야 표본을 모으기 쉽다.

export type CourseStage =
  | 'collect'        // 후보·날씨·축제·숙박 병렬 수집
  | 'enrich'         // detailIntro2 편의시설 보강
  | 'score'          // 사전 스코어링·다양성
  | 'accessibility'  // 무장애(KorWithService2) 조회·필터
  | 'ai'             // Gemini 코스 생성(또는 타임아웃 폴백)
  | 'finalize'       // 원본 대조·시간표 보정·보완
  | 'persist';       // Supabase 저장

export interface StageSpent { stage: CourseStage; ms: number }

export interface CourseTimingSummary {
  totalMs: number;
  stages: StageSpent[];
  meta: Record<string, string | number>;
}

export interface CourseStageTimer {
  track<T>(stage: CourseStage, run: () => Promise<T>): Promise<T>;
  trackSync<T>(stage: CourseStage, run: () => T): T;
  /** 직접 잰 값을 더한다(음수는 0으로). 같은 단계를 여러 번 부르면 합산된다. */
  mark(stage: CourseStage, ms: number): void;
  /** 로그 끝에 붙일 부가 정보 — 후보 수, AI 경로 같은 것. */
  note(key: string, value: string | number): void;
  summary(): CourseTimingSummary;
}

/**
 * `now` 를 주입받는다 — 테스트가 진짜 시간을 기다리지 않게 하려는 것이다.
 * 단계 순서는 **처음 기록된 순서**를 지킨다(파이프라인 순서가 곧 읽는 순서다).
 */
export function createStageTimer(now: () => number = Date.now): CourseStageTimer {
  const startedAt = now();
  const order: CourseStage[] = [];
  const spent = new Map<CourseStage, number>();
  const meta: Record<string, string | number> = {};

  const add = (stage: CourseStage, ms: number) => {
    if (!spent.has(stage)) order.push(stage);
    spent.set(stage, (spent.get(stage) ?? 0) + Math.max(0, ms));
  };

  return {
    async track(stage, run) {
      const at = now();
      // 🔑 실패해도 잰다. 느려서 터진 요청이야말로 알고 싶은 표본이다.
      try { return await run(); } finally { add(stage, now() - at); }
    },
    trackSync(stage, run) {
      const at = now();
      try { return run(); } finally { add(stage, now() - at); }
    },
    mark(stage, ms) { add(stage, ms); },
    note(key, value) { meta[key] = value; },
    summary() {
      return {
        totalMs: Math.max(0, now() - startedAt),
        stages: order.map((stage) => ({ stage, ms: spent.get(stage) ?? 0 })),
        meta: { ...meta },
      };
    },
  };
}

/** 로그 한 줄. 단계는 **오래 걸린 순**으로 적는다 — 한 줄만 봐도 범인이 앞에 온다. */
export function formatTimingLine(summary: CourseTimingSummary, prefix = '[이모추API] 소요(ms)'): string {
  const ranked = [...summary.stages].sort((a, b) => b.ms - a.ms);
  const parts = ranked.map((s) => `${s.stage}=${Math.round(s.ms)}`);
  const metaParts = Object.entries(summary.meta).map(([k, v]) => `${k}=${v}`);
  return [prefix, `total=${Math.round(summary.totalMs)}`, ...parts, ...metaParts].join(' ');
}

/** 표본을 모을 때 쓰는 요약 — "지배적인 단계가 무엇인가"에만 답한다. */
export function dominantStage(summary: CourseTimingSummary): StageSpent | null {
  if (!summary.stages.length) return null;
  return summary.stages.reduce((a, b) => (b.ms > a.ms ? b : a));
}
