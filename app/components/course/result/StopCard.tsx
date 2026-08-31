'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lightbulb, Route, Navigation, Phone, Repeat2, ChevronUp, ChevronDown } from 'lucide-react';
import type { CourseStop } from '@/lib/weekend-types';
import { getRoleInfo } from '@/lib/course-role';
import { formatTimeRange } from './formatTime';
import BarrierFreeNotice from '@/app/components/BarrierFreeNotice';

interface Props {
  stop: CourseStop;
  isLast: boolean;
  isActive: boolean;
  onActivate: () => void;
  /** 코스를 만든 사람에게만 편집 조작이 보인다(편집 토큰 보유 여부). */
  editable?: boolean;
  busy?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onReplace?: () => void;
  onMove?: (direction: 'up' | 'down') => void;
}

export default function StopCard({
  stop, isLast, isActive, onActivate,
  editable = false, busy = false, canMoveUp = false, canMoveDown = false, onReplace, onMove,
}: Props) {
  const router = useRouter();
  const { colorHex, label } = getRoleInfo(stop);
  const timeRange = formatTimeRange(stop.timeStart, stop.durationMin);

  // 카카오맵 길찾기. 좌표까지 넘기므로 이름이 겹치는 곳에서도 정확히 찍힌다.
  const naviUrl =
    `https://map.kakao.com/link/to/${encodeURIComponent(stop.title)},${stop.latitude},${stop.longitude}`;
  // tel: 스킴은 숫자와 +만 받는다. TourAPI 전화번호에는 안내문이 섞여 오는 경우가 있다.
  const telDigits = stop.tel?.replace(/[^0-9+]/g, '') ?? '';

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: colorHex }}
          aria-hidden="true"
        >
          {stop.order}
        </div>
        {!isLast && <div className="flex-1 w-px bg-line my-1" />}
      </div>

      <div className="flex-1 mb-4">
      <button
        type="button"
        onClick={() => { if (isActive) router.push(`/spot/${stop.contentId}`); else onActivate(); }}
        aria-label={`${stop.order}번째 코스: ${stop.title}, ${timeRange}, ${label}${
          stop.openStatus === 'open' ? ', 방문일 영업 확인됨' : stop.openStatus === 'unknown' ? ', 운영시간 확인 필요' : ''
        }${
          stop.accessibilityStatus === 'unverified' ? ', 접근성 정보 확인 필요' : ''
        }${isActive ? '. 다시 눌러 상세 보기' : ''}`}
        className={`w-full text-left bg-surface-elevated rounded-lg border overflow-hidden transition-all hover:border-ink-4 ${
          isActive ? 'border-brand ring-2 ring-brand/20' : 'border-line'
        }`}
      >
        {stop.imageUrl && (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={stop.imageUrl}
              alt={stop.title}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              unoptimized={stop.imageUrl.startsWith('http://')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {stop.hook && (
              <span className="absolute bottom-2 left-2 text-[11px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
                {stop.hook}
              </span>
            )}
          </div>
        )}

        <div className="p-4 space-y-2">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white px-2 py-0.5 rounded-md"
            style={{ backgroundColor: colorHex }}
          >
            {label}
          </span>
          {stop.openStatus === 'open' && (
            <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-soft border border-success/30 px-2 py-0.5 rounded-md">
              영업 확인
            </span>
          )}
          {stop.openStatus === 'unknown' && (
            <span
              className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 bg-surface-sunken border border-line px-2 py-0.5 rounded-md"
              title={stop.restdate ? `쉬는날: ${stop.restdate}` : undefined}
            >
              운영시간 확인 필요
            </span>
          )}
          <h3 className="text-base font-semibold text-ink-1">{stop.title}</h3>
          <p className="text-xs text-ink-3">{timeRange} · {stop.durationMin}분</p>
          {stop.whyNow && (
            <p className="text-xs font-semibold text-brand mb-2">{stop.whyNow}</p>
          )}
          <p className="text-sm text-ink-2 line-clamp-3">{stop.description}</p>
          {stop.transitInfo && (
            <p className="text-xs text-ink-3 flex items-center gap-1">
              <Route size={12} strokeWidth={1.75} aria-hidden="true" /> {stop.transitInfo}
            </p>
          )}
          {stop.tip && (
            <p className="text-xs text-ink-2 bg-mocha-soft px-3 py-2 rounded-md flex items-start gap-2">
              <Lightbulb size={14} strokeWidth={1.75} className="text-mocha flex-shrink-0 mt-px" aria-hidden="true" />
              <span>{stop.tip}</span>
            </p>
          )}
          <BarrierFreeNotice
            barrierFree={stop.facilities?.barrierFree}
            status={stop.accessibilityStatus}
            needs={stop.accessibilityNeeds}
          />
        </div>
      </button>

      {/* ─── 실행 연결 ───
          「보는 코스」를 「가는 코스」로 만드는 최소 장치다. 길찾기·전화가 없으면
          사용자는 코스를 보고 나서 다시 검색창으로 나가야 한다.
          🔴 카드 전체가 <button> 이라 그 안에 링크를 넣을 수 없다(인터랙티브 중첩).
             그래서 카드 바깥, 같은 열에 둔다. */}
      <div className="flex gap-2 mt-2">
        <a
          href={naviUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${stop.title} 길찾기 (새 창)`}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface-elevated text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors"
        >
          <Navigation size={13} strokeWidth={2} aria-hidden="true" />
          길찾기
        </a>
        {telDigits && (
          <a
            href={`tel:${telDigits}`}
            aria-label={`${stop.title} 전화 ${stop.tel}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface-elevated text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors"
          >
            <Phone size={13} strokeWidth={2} aria-hidden="true" />
            전화
          </a>
        )}

        {/* ─── 편집 조작 ───
            🔑 코스를 만든 사람에게만 보인다. 공유 링크로 들어온 사람에게 보이면
               눌러도 안 되는 버튼이 되고, 그건 없느니만 못하다. */}
        {editable && (
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onReplace}
              disabled={busy}
              aria-label={`${stop.title} 다른 곳으로 바꾸기`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface-elevated text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand disabled:opacity-50 transition-colors"
            >
              <Repeat2 size={13} strokeWidth={2} aria-hidden="true" />
              바꾸기
            </button>
            <button
              type="button"
              onClick={() => onMove?.('up')}
              disabled={busy || !canMoveUp}
              aria-label={`${stop.title} 앞으로 옮기기`}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-line bg-surface-elevated text-ink-2 hover:border-brand hover:text-brand disabled:opacity-40 transition-colors"
            >
              <ChevronUp size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onMove?.('down')}
              disabled={busy || !canMoveDown}
              aria-label={`${stop.title} 뒤로 옮기기`}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-line bg-surface-elevated text-ink-2 hover:border-brand hover:text-brand disabled:opacity-40 transition-colors"
            >
              <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
