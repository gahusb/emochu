'use client';

// 홈의 첫 화면 — 「이번 주말의 조건」.
//
// 예전에는 60vh 히어로 사진이 첫 화면을 통째로 먹었다. 사진은 예쁘지만
// 접힘 위에서 '이 서비스가 나에게 뭘 해주는가'를 말하지 못했다.
// 이 방향의 주장은 **'이번 주말 아니면'** 이라서, 정보가 사진보다 앞에 온다.
//
// 🔑 두 상태를 가진다 (getWeekendElements().same):
//    같으면 기운을 하나로 합쳐 넓게, 다르면 두 날을 나란히 —
//    다를 때는 그 자체가 '어느 날 나갈까'의 근거가 된다.

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { WeekendWeather, DayWeather } from '@/lib/weekend-types';
import { getWeekendElements, ELEMENT_META, ELEMENT_COURSE_HINT } from '@/lib/saju';

interface Props {
  weather: WeekendWeather | null;
  /** 이번 주말에 끝나는 축제 수. 없으면 타일을 띄우지 않는다. */
  closingCount: number;
}

/** "맑음 24° · 강수 10%" — 한 줄로 읽히게. 아이콘은 옆 WeatherCard 가 담당한다. */
function weatherLine(day: DayWeather | undefined): string {
  if (!day) return '정보 준비 중';
  return `${day.summary} ${day.tempMax}°`;
}

/** 나가기 좋은 날인지 한마디. 숫자만 나열하면 읽는 사람이 판단을 대신해야 한다. */
function popHint(day: DayWeather | undefined): { text: string; tone: string } {
  if (!day) return { text: '', tone: 'text-ink-3' };
  if (day.pop >= 60) return { text: `강수 ${day.pop}% · 실내 위주`, tone: 'text-warning' };
  if (day.pop >= 30) return { text: `강수 ${day.pop}% · 우산 챙기세요`, tone: 'text-warning' };
  return { text: `강수 ${day.pop}% · 나가기 좋아요`, tone: 'text-success' };
}

function weekendLabel(sat: Date, sun: Date): string {
  const satM = sat.getUTCMonth() + 1;
  const sunM = sun.getUTCMonth() + 1;
  return satM === sunM
    ? `${satM}월 ${sat.getUTCDate()}~${sun.getUTCDate()}일`
    : `${satM}월 ${sat.getUTCDate()}일~${sunM}월 ${sun.getUTCDate()}일`;
}

export default function WeekendConditionBar({ weather, closingCount }: Props) {
  const { saturday, sunday, saturdayDate, sundayDate, same } = getWeekendElements();
  const satMeta = ELEMENT_META[saturday];
  const sunMeta = ELEMENT_META[sunday];

  // 🔴 ELEMENT_META.name 은 "土 (토)" 라 요일(토·일) 옆에서 "(토)" 가 토요일로 읽힌다.
  //    이 화면에서는 한자만 쓴다.
  const satHanja = satMeta.name.split(' ')[0];
  const sunHanja = sunMeta.name.split(' ')[0];

  const satHint = popHint(weather?.saturday);
  const sunHint = popHint(weather?.sunday);

  const cta = (
    <Link
      href="/course"
      className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
    >
      <Sparkles size={18} strokeWidth={2} aria-hidden="true" />
      이번 주말 코스 짜기
    </Link>
  );

  return (
    <section aria-labelledby="weekend-heading" className="pt-6 lg:pt-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-bold text-brand mb-1">
            {weekendLabel(saturdayDate, sundayDate)} 주말
          </p>
          <h1
            id="weekend-heading"
            className="text-2xl lg:text-4xl font-bold text-ink-1 leading-tight break-keep"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {same ? '이번 주말, 이런 게 기다려요' : '이번 주말, 두 날의 결이 달라요'}
          </h1>
        </div>
        <div className="hidden lg:block flex-shrink-0">{cta}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {same ? (
          <>
            {/* 토·일이 같은 기운 — 하나로 합쳐 넓게 */}
            <div className={`col-span-2 p-4 rounded-xl border flex items-center gap-4 ${satMeta.color}`}>
              <span className="text-3xl leading-none flex-shrink-0" aria-hidden="true">{satMeta.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs text-ink-4">이번 주말의 기운</p>
                <p className="text-base lg:text-lg font-bold">{satHanja} · {ELEMENT_COURSE_HINT[saturday]}</p>
                <p className="text-xs text-ink-3 mt-0.5">토·일 모두 {satHanja} — 주말마다 바뀌어요</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-line">
              <p className="text-xs text-ink-4">토요일 {saturdayDate.getUTCDate()}일</p>
              <p className="text-base font-bold text-ink-1 mt-0.5">{weatherLine(weather?.saturday)}</p>
              <p className={`text-xs mt-0.5 ${satHint.tone}`}>{satHint.text}</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-line">
              <p className="text-xs text-ink-4">일요일 {sundayDate.getUTCDate()}일</p>
              <p className="text-base font-bold text-ink-1 mt-0.5">{weatherLine(weather?.sunday)}</p>
              <p className={`text-xs mt-0.5 ${sunHint.tone}`}>{sunHint.text}</p>
            </div>
          </>
        ) : (
          <>
            {/* 토·일이 다른 기운 — 나란히. 기운과 날씨를 날짜별로 합친다 */}
            <div className={`lg:col-span-2 p-4 rounded-xl border ${satMeta.color}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{satMeta.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-4">토요일 {saturdayDate.getUTCDate()}일 · {satHanja}</p>
                  <p className="text-sm lg:text-base font-bold break-keep">{ELEMENT_COURSE_HINT[saturday]}</p>
                </div>
              </div>
              <p className="text-xs text-ink-3 mt-2">
                {weatherLine(weather?.saturday)} · <span className={satHint.tone}>{satHint.text}</span>
              </p>
            </div>

            <div className={`lg:col-span-2 p-4 rounded-xl border ${sunMeta.color}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{sunMeta.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-4">일요일 {sundayDate.getUTCDate()}일 · {sunHanja}</p>
                  <p className="text-sm lg:text-base font-bold break-keep">{ELEMENT_COURSE_HINT[sunday]}</p>
                </div>
              </div>
              <p className="text-xs text-ink-3 mt-2">
                {weatherLine(weather?.sunday)} · <span className={sunHint.tone}>{sunHint.text}</span>
              </p>
            </div>
          </>
        )}

        {/* 마감 임박 — 근거(실제 종료 축제)가 있을 때만 띄운다 */}
        {closingCount > 0 && (
          <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-warning-soft border border-warning/30">
            <p className="text-xs text-ink-4">이번 주말 종료</p>
            <p className="text-base font-bold text-warning mt-0.5">축제 {closingCount}곳</p>
            <p className="text-xs text-ink-3 mt-0.5">이번 주말이 마지막이에요</p>
          </div>
        )}
      </div>

      <div className="mt-4 lg:hidden">{cta}</div>

      {/* 「오늘의 내 기운」은 코스 만들기에 남아 있다 — 두 축의 연결을 드러낸다 */}
      <p className="text-[11px] text-ink-4 mt-3 text-right">
        오늘의 내 기운(사주)은 코스 만들기에서
      </p>
    </section>
  );
}
