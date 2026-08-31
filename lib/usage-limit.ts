// ============================================================
// AI 호출 상한 — 개인별 + 전체 예산 차단기
// ============================================================
//
// 왜 필요한가: 2026-08-31 실측 기준 코스 생성 1건이 Gemini 호출 2회(A/B)로
// 약 32원이다. 레이트 리밋이 없으면 스크립트 한 대가 하룻밤에 청구서를 만든다.
//
// 두 겹으로 막는다:
//   1) 개인별 — 한 사람이 하루에 몇 번까지. 실수·장난을 막는다.
//   2) 전체 — 서비스 전체가 하루에 몇 번까지. **이게 진짜 예산 차단기다.**
//      개인별만 두면 IP 를 바꿔가며 우회할 수 있어 상한이 상한이 아니다.
//
// 🔴 저장소로 Supabase 를 쓴다. 서버리스라 in-memory 카운터는 인스턴스마다
//    흩어져 아무것도 못 막는다. Redis 는 이 프로젝트 인프라에 없다.

import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/** 한 사람(=IP)당 하루 코스 생성 횟수. */
export const PER_CLIENT_DAILY = Number(process.env.COURSE_DAILY_LIMIT_PER_CLIENT ?? 20);

/**
 * 서비스 전체의 하루 코스 생성 횟수 = 하루 최대 지출.
 * 기본 500회 ≈ 16,000원/일. 심사 기간에 심사자가 막히면 안 되므로 넉넉하게 잡았다.
 */
export const GLOBAL_DAILY = Number(process.env.COURSE_DAILY_LIMIT_GLOBAL ?? 500);

const GLOBAL_KEY = '__global__';

export interface UsageDecision {
  allowed: boolean;
  /** 막혔다면 어느 상한에 걸렸는지. */
  blockedBy?: 'client' | 'global';
  clientCount: number;
  globalCount: number;
  /** 카운터를 못 읽어 통과시킨 경우. 로그·모니터링용. */
  degraded?: boolean;
}

/**
 * 요청자를 식별하는 키. **IP 를 그대로 저장하지 않는다** —
 * 상한을 세는 데 필요한 건 "같은 사람인가"뿐이고, 원본 IP 는 필요 없다.
 */
export function clientKeyFrom(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
  const salt = process.env.USAGE_HASH_SALT ?? 'emochu-usage-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/** KST 기준 날짜. 상한이 한국 시간 자정에 풀려야 사용자 기대와 맞는다. */
export function kstToday(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * 카운터를 올리고 통과 여부를 판정한다.
 *
 * 🔴 실패하면 통과시킨다(fail-open). 근거: 심사 기간에 Supabase 가 잠깐 흔들렸다고
 *    서비스가 멈추는 쪽이, 그 사이 몇 건 더 나가는 쪽보다 나쁘다.
 *    대신 degraded 를 세워 로그에 남긴다 — 조용히 열려 있는 상태를 만들지 않는다.
 */
export async function checkAndBumpUsage(clientKey: string): Promise<UsageDecision> {
  const day = kstToday();

  try {
    const supabase = createAdminClient();

    const [clientRes, globalRes] = await Promise.all([
      supabase.rpc('wk_bump_usage', { p_day: day, p_key: clientKey }),
      supabase.rpc('wk_bump_usage', { p_day: day, p_key: GLOBAL_KEY }),
    ]);

    if (clientRes.error || globalRes.error) {
      console.warn('[이모추:usage] 카운터 갱신 실패 — 통과시킴(fail-open):',
        clientRes.error?.message ?? globalRes.error?.message);
      return { allowed: true, clientCount: 0, globalCount: 0, degraded: true };
    }

    const clientCount = Number(clientRes.data ?? 0);
    const globalCount = Number(globalRes.data ?? 0);

    if (globalCount > GLOBAL_DAILY) {
      return { allowed: false, blockedBy: 'global', clientCount, globalCount };
    }
    if (clientCount > PER_CLIENT_DAILY) {
      return { allowed: false, blockedBy: 'client', clientCount, globalCount };
    }
    return { allowed: true, clientCount, globalCount };

  } catch (err) {
    console.warn('[이모추:usage] 카운터 예외 — 통과시킴(fail-open):', err);
    return { allowed: true, clientCount: 0, globalCount: 0, degraded: true };
  }
}

/** 다음 KST 자정까지 남은 초. 429 응답의 Retry-After 에 쓴다. */
export function secondsUntilKstMidnight(now: Date = new Date()): number {
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const msIntoDay = kstMs % 86_400_000;
  return Math.max(1, Math.ceil((86_400_000 - msIntoDay) / 1000));
}
