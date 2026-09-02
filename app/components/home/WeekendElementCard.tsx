'use client';

// 홈 첫 화면의 「이번 주말의 기운」.
//
// 기준 축이 「오늘」이 아니라 「이번 주말」인 이유: 이모추는 주말 나들이 서비스다.
// 축제 종료일·기상청 주말 예보·토일 휴무가 전부 주말 단위인데 화면만 오늘 기준이면 어긋난다.
//
// 🔑 「오늘의 내 기운」(생년 × 오늘)은 없애지 않았다. 코스 만들기 위저드에 그대로 있다.
//    홈은 주 단위로 '이번 주말에 뭐가 있나', 위저드는 일 단위로 '오늘의 나에게 맞는 코스' —
//    두 화면이 서로 다른 질문에 답한다. 아래 마지막 줄이 그 연결을 드러낸다.
//
// 🔑 두 상태를 가진다. 천간 10개가 오행 5개에 2:1 로 대응해 **연속된 이틀이 같을 확률이 절반**이라
//    둘 다 흔하다. 같으면 하나로 합쳐 크게, 다르면 나란히 — 다를 때는 '어느 날 나갈까'의 근거가 된다.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getWeekendElements, ELEMENT_META, ELEMENT_COURSE_HINT } from '@/lib/saju';

/**
 * "9월 5~6일" — 토·일이 같은 달이면 달을 한 번만 쓰고, 달이 넘어가면 양쪽에 쓴다.
 * 🔴 KST 자정을 UTC 로 표현한 Date 라서 UTC 게터로 읽어야 날짜가 어긋나지 않는다.
 */
function weekendLabel(sat: Date, sun: Date): string {
  const satM = sat.getUTCMonth() + 1;
  const sunM = sun.getUTCMonth() + 1;
  return satM === sunM
    ? `${satM}월 ${sat.getUTCDate()}~${sun.getUTCDate()}일`
    : `${satM}월 ${sat.getUTCDate()}일~${sunM}월 ${sun.getUTCDate()}일`;
}

export default function WeekendElementCard() {
  // getWeekendElements 는 KST 고정이라 서버 렌더와 브라우저가 같은 값을 낸다.
  const { saturday, sunday, saturdayDate, sundayDate, same } = getWeekendElements();
  const satMeta = ELEMENT_META[saturday];
  const sunMeta = ELEMENT_META[sunday];

  // 🔴 ELEMENT_META.name 은 "土 (토)" 처럼 한글 음을 달고 있는데, 이 카드에서는
  //    바로 옆에 요일(토·일) 이 나온다 — "토·일 모두 土 (토)" 는 (토)가 토요일로 읽힌다.
  //    여기서만 한자만 쓴다.
  const satHanja = satMeta.name.split(' ')[0];
  const sunHanja = sunMeta.name.split(' ')[0];

  const dateLabel = weekendLabel(saturdayDate, sundayDate);

  return (
    <section aria-labelledby="weekend-element-heading">
      <Link
        href="/course"
        className="group block p-5 lg:p-6 rounded-xl border border-brand/25 bg-gradient-to-br from-brand-soft/60 to-transparent hover:border-brand/50 transition-colors"
      >
        <p className="text-xs text-ink-4 mb-2">{dateLabel} 주말</p>

        {same ? (
          /* ─── 토·일이 같은 기운 — 하나로 합쳐 크게 ─── */
          <div className="flex items-center gap-4">
            <div
              className={`flex flex-col items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-xl border flex-shrink-0 ${satMeta.color}`}
              aria-hidden="true"
            >
              <span className="text-2xl lg:text-3xl leading-none">{satMeta.emoji}</span>
              <span className="text-[11px] font-bold mt-1">{satHanja}</span>
            </div>

            <div className="flex-1 min-w-0">
              <h2
                id="weekend-element-heading"
                className="text-base lg:text-lg font-bold text-ink-1 break-keep"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {satHanja} 기운이 흐르는 주말
              </h2>
              <p className="text-sm text-brand font-semibold mt-0.5 break-keep">
                {ELEMENT_COURSE_HINT[saturday]}
              </p>
              <p className="text-xs text-ink-3 mt-1.5 break-keep">
                토·일 모두 {satHanja} — 기운은{' '}
                <strong className="font-semibold text-ink-2">주말마다 바뀌어요.</strong>
              </p>
            </div>

            <ArrowRight
              size={20}
              className="text-brand flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
          </div>
        ) : (
          /* ─── 토·일이 다른 기운 — 나란히. 어느 날 나갈지의 근거가 된다 ─── */
          <>
            <h2
              id="weekend-element-heading"
              className="text-base lg:text-lg font-bold text-ink-1 break-keep mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              두 날의 결이 달라요
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border ${satMeta.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none" aria-hidden="true">{satMeta.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink-4">토요일 {saturdayDate.getUTCDate()}일</p>
                    <p className="text-sm font-bold">{satHanja}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-ink-1 mt-2 break-keep">
                  {ELEMENT_COURSE_HINT[saturday]}
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${sunMeta.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none" aria-hidden="true">{sunMeta.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink-4">일요일 {sundayDate.getUTCDate()}일</p>
                    <p className="text-sm font-bold">{sunHanja}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-ink-1 mt-2 break-keep">
                  {ELEMENT_COURSE_HINT[sunday]}
                </p>
              </div>
            </div>

            <p className="flex items-center gap-1 text-xs text-brand font-semibold mt-3">
              어느 날 나갈지 골라볼까요?
              <ArrowRight
                size={14}
                className="group-hover:translate-x-0.5 transition-transform"
                aria-hidden="true"
              />
            </p>
          </>
        )}

        {/* 「오늘의 내 기운」은 코스 만들기에 남아 있다 — 두 축의 연결을 드러낸다 */}
        <p className="text-[11px] text-ink-4 mt-3 text-right">
          오늘의 내 기운(사주)은 코스 만들기에서
        </p>
      </Link>
    </section>
  );
}
