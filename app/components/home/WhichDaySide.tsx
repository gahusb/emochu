'use client';

// 사이드 칼럼이 주말 상태에 따라 다른 질문에 답한다.
//
// · 토·일 기운이 **다르면** → 「어느 날 나갈까요?」
//   두 날의 결이 다를 때만 생기는 질문이고, 화면이 그 답을 대신 해준다.
// · 토·일 기운이 **같으면** → 「놓치면 아쉬운 것」
//   고를 필요가 없으니 대신 마감 임박한 것들을 모아 준다.
//
// 🔑 같은 자리가 주말마다 다른 얼굴을 갖는다 — 이게 이 방향의 리텐션 근거다.

import Link from 'next/link';
import type { FestivalCard, WeekendWeather } from '@/lib/weekend-types';
import { getWeekendElements, ELEMENT_META, ELEMENT_COURSE_HINT } from '@/lib/saju';
import Card from '../ui/Card';

interface Props {
  festivals: FestivalCard[];
  weather: WeekendWeather | null;
}

export default function WhichDaySide({ festivals, weather }: Props) {
  const { saturday, sunday, same } = getWeekendElements();
  const satMeta = ELEMENT_META[saturday];
  const sunMeta = ELEMENT_META[sunday];
  const satHanja = satMeta.name.split(' ')[0];
  const sunHanja = sunMeta.name.split(' ')[0];

  if (!same) {
    const satWet = (weather?.saturday.pop ?? 0) >= 60;
    const sunWet = (weather?.sunday.pop ?? 0) >= 60;

    return (
      <Card className="p-5">
        <h3 className="text-sm font-bold text-ink-1 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          어느 날 나갈까요?
        </h3>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${satMeta.color}`} aria-hidden="true">
              {satMeta.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-1">토요일은 {satHanja}</p>
              <p className="text-xs text-ink-3 break-keep">
                {ELEMENT_COURSE_HINT[saturday]}
                {satWet ? ' — 다만 비 소식이 있어요' : ''}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${sunMeta.color}`} aria-hidden="true">
              {sunMeta.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-1">일요일은 {sunHanja}</p>
              <p className="text-xs text-ink-3 break-keep">
                {ELEMENT_COURSE_HINT[sunday]}
                {sunWet ? ' — 다만 비 소식이 있어요' : ''}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-10 h-10 rounded-lg bg-brand-soft text-brand text-xs font-bold flex items-center justify-center flex-shrink-0" aria-hidden="true">
              둘 다
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-1">1박 2일로 이어도 돼요</p>
              <p className="text-xs text-ink-3 break-keep">결이 다른 두 날이라 오히려 이어집니다</p>
            </div>
          </li>
        </ul>
        <Link
          href="/course"
          className="mt-4 inline-flex w-full items-center justify-center h-10 rounded-md border border-line text-sm font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors"
        >
          날짜 골라서 코스 짜기
        </Link>
      </Card>
    );
  }

  // 같은 기운 주말 — 고를 필요가 없으니 마감 임박한 것들을 모아 준다
  const closing = festivals
    .filter((f) => typeof f.dDay === 'number' && f.dDay >= 0 && f.dDay <= 14)
    .sort((a, b) => (a.dDay ?? 99) - (b.dDay ?? 99))
    .slice(0, 3);

  if (closing.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-ink-1 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        놓치면 아쉬운 것
      </h3>
      <ul className="space-y-3">
        {closing.map((f) => (
          <li key={f.contentId}>
            <Link href={`/spot/${f.contentId}`} className="flex gap-3 group">
              <span className="w-10 h-10 rounded-lg bg-warning-soft text-warning text-xs font-bold flex items-center justify-center flex-shrink-0">
                {f.dDay === 0 ? '오늘' : `D-${f.dDay}`}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-1 truncate group-hover:text-brand transition-colors">
                  {f.title}
                </p>
                <p className="text-xs text-ink-3 truncate">{f.addr1}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-ink-4 mt-3 break-keep">
        축제 종료일은 한국관광공사 데이터예요. 근거 없는 곳엔 급함을 붙이지 않아요.
      </p>
    </Card>
  );
}
