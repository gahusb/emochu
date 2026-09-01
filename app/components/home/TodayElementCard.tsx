'use client';

// 홈 첫 화면의 「오늘의 기운」.
//
// 왜 홈에 올렸나: 이 서비스의 차별점(사주 오행)이 위저드 2단계까지 들어가야만
// 보였다. 첫 화면에서 3초 안에 보이지 않으면 없는 기능이나 마찬가지다.
//
// 🔑 여기서 보여주는 건 **오늘의 오행 하나**다. 사주는 「생년 × 오늘」 두 축인데
//    홈에는 생년이 없다. 그래서 홈은 「오늘」만 알려주고, 생년을 더하면 내 코스가
//    된다고 안내해 위저드로 보낸다.
//
// 🔑 문구가 **날마다 바뀐다는 사실**을 드러낸다. 그게 이 서비스에 다시 올 이유이고,
//    코드가 이미 그렇게 동작한다(getTodayElement 는 일주 기준이다).

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getTodayElement, ELEMENT_META, ELEMENT_COURSE_HINT } from '@/lib/saju';

export default function TodayElementCard() {
  // getTodayElement 는 KST 고정이라 서버 렌더와 브라우저가 같은 값을 낸다.
  // (예전엔 실행 환경의 로컬 날짜를 읽어 UTC 서버에서 하루가 어긋났다.)
  const element = getTodayElement();
  const meta = ELEMENT_META[element];
  const hint = ELEMENT_COURSE_HINT[element];

  return (
    <section aria-labelledby="today-element-heading">
      <Link
        href="/course"
        className="group flex items-center gap-4 p-5 lg:p-6 rounded-xl border border-brand/25 bg-gradient-to-br from-brand-soft/60 to-transparent hover:border-brand/50 transition-colors"
      >
        <div
          className={`flex flex-col items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-xl border flex-shrink-0 ${meta.color}`}
          aria-hidden="true"
        >
          <span className="text-2xl lg:text-3xl leading-none">{meta.emoji}</span>
          <span className="text-[11px] font-bold mt-1">{meta.name}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-ink-4">오늘의 기운</p>
          <h2
            id="today-element-heading"
            className="text-base lg:text-lg font-bold text-ink-1 break-keep"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {meta.name} 기운이 흐르는 날
          </h2>
          <p className="text-sm text-brand font-semibold mt-0.5 break-keep">{hint}</p>
          {/* 리텐션의 핵심 문장. 오늘 본 사람이 내일 다시 올 이유다. */}
          <p className="text-xs text-ink-3 mt-1.5 break-keep">
            기운은 <strong className="font-semibold text-ink-2">날마다 바뀌어요.</strong>{' '}
            태어난 해까지 더하면 <strong className="font-semibold text-ink-2">나만의 코스</strong>가 돼요.
          </p>
        </div>

        <ArrowRight
          size={20}
          className="text-brand flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
          aria-hidden="true"
        />
      </Link>
    </section>
  );
}
