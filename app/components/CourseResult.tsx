'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CourseResponse, CourseStop } from '@/lib/weekend-types';
import WeekendHeader from './WeekendHeader';
import BottomTabBar from './BottomTabBar';
import CourseMap from './CourseMap';
import SpotDetailModal from './SpotDetailModal';
import ImageGallery from './ImageGallery';
import FacilityBadges from './FacilityBadges';

// ─── 카테고리별 그라데이션 색상 ───

const STOP_COLORS = [
  'from-orange-400 to-pink-400',
  'from-sky-400 to-blue-400',
  'from-emerald-400 to-teal-400',
  'from-violet-400 to-purple-400',
  'from-amber-400 to-orange-400',
  'from-rose-400 to-pink-400',
  'from-cyan-400 to-sky-400',
];

function getStopColor(index: number) {
  return STOP_COLORS[index % STOP_COLORS.length];
}

// ─── 시간 포맷 ───

function formatTime(timeStart: string, durationMin: number) {
  const [h, m] = timeStart.split(':').map(Number);
  const endTotal = h * 60 + m + durationMin;
  const endH = Math.floor(endTotal / 60);
  const endM = endTotal % 60;
  return `${timeStart} ~ ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// ─── 장소 카드 컴포넌트 ───

function StopCard({ stop, index, isLast, onTap }: { stop: CourseStop; index: number; isLast: boolean; onTap: () => void }) {
  const color = getStopColor(index);

  return (
    <div className="relative flex gap-4">
      {/* 타임라인 */}
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-black shadow-md`}>
          {stop.order}
        </div>
        {!isLast && (
          <div className="flex-1 w-0.5 bg-gradient-to-b from-orange-200 to-orange-100 my-1" />
        )}
      </div>

      {/* 카드 — 클릭 가능 */}
      <div
        onClick={onTap}
        className="flex-1 bg-white rounded-3xl shadow-sm border border-orange-50 overflow-hidden mb-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98]"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* 이미지 or 플레이스홀더 */}
        {stop.imageUrl ? (
          <div className="relative h-36 overflow-hidden">
            <img
              src={stop.imageUrl}
              alt={stop.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {(stop.isFestival || stop.isStay) && (
              <span className={`absolute top-2 left-2 ${stop.isStay ? 'bg-indigo-500' : 'bg-red-500'} text-white text-[10px] font-black px-2 py-0.5 rounded-full`}>
                {stop.isStay ? '숙박' : '축제'}
              </span>
            )}
          </div>
        ) : (
          <div className={`h-24 bg-gradient-to-br ${color} opacity-20 flex items-center justify-center`}>
            {(stop.isFestival || stop.isStay) && (
              <span className={`${stop.isStay ? 'bg-indigo-500' : 'bg-red-500'} text-white text-[10px] font-black px-2 py-0.5 rounded-full opacity-100 relative z-10`}>
                {stop.isStay ? '숙박' : '축제'}
              </span>
            )}
          </div>
        )}

        <div className="p-4">
          {/* 시간 뱃지 */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${color} text-white`}>
              {formatTime(stop.timeStart, stop.durationMin)}
            </span>
            <span className="text-[10px] text-slate-400">{stop.durationMin}분</span>
          </div>

          {/* 제목 */}
          <h3 className="text-base font-black text-slate-800 break-keep">{stop.title}</h3>

          {/* 설명 */}
          <p className="text-sm text-slate-600 mt-1 break-keep leading-relaxed">
            {stop.description}
          </p>

          {/* 꿀팁 */}
          {stop.tip && (
            <div className="mt-3 flex gap-2 items-start bg-orange-50 rounded-xl px-3 py-2">
              <span className="text-sm flex-shrink-0">💡</span>
              <p className="text-xs text-orange-700 font-medium break-keep">{stop.tip}</p>
            </div>
          )}

          {/* 상세보기 힌트 */}
          <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
            <span>탭하면 상세정보 보기</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───

interface Props {
  slug: string;
}

export default function CourseResult({ slug }: Props) {
  const [data, setData] = useState<CourseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  useEffect(() => {
    // sessionStorage에서 먼저 확인 (CourseWizard에서 저장한 데이터)
    const cached = sessionStorage.getItem('weekendCourse');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CourseResponse;
        // slug가 일치하는지 확인
        if (parsed.shareUrl?.includes(slug)) {
          setData(parsed);
          setLoading(false);
          return;
        }
      } catch { /* 무시 */ }
    }

    // DB에서 조회 (공유 URL로 접근한 경우)
    fetch(`/api/course/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('코스를 찾을 수 없어요');
        return res.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/course/${slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* 클립보드 미지원 */ }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return handleCopyLink();
    try {
      await navigator.share({
        title: data?.course.title ?? '이모추! 나들이 코스',
        text: data?.course.summary ?? '주말 코스를 확인해보세요!',
        url: shareUrl,
      });
    } catch { /* 사용자 취소 */ }
  };

  const handleKakaoShare = () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao?.isInitialized?.()) {
      // SDK 미초기화 시 링크 복사로 폴백
      handleCopyLink();
      return;
    }

    const stopNames = data?.course.stops.map(s => s.title).join(' → ') ?? '';

    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: data?.course.title ?? '이모추! AI 나들이 코스',
        description: data?.course.summary
          ? `${data.course.summary}\n📍 ${stopNames}`
          : '주말 코스를 확인해보세요!',
        imageUrl: data?.course.stops.find(s => s.imageUrl)?.imageUrl
          ?? 'https://jaengseung-made.com/icons/weekend-og.png',
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        {
          title: '코스 보기',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    });
  };

  // 로딩
  if (loading) {
    return (
      <>
        <WeekendHeader locationName="코스 보기" />
        <div className="flex flex-col items-center justify-center min-h-[60dvh] pt-20">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl animate-bounce">🧳</div>
          </div>
          <p className="text-slate-500 text-sm mt-4">코스를 불러오는 중...</p>
        </div>
        <BottomTabBar />
      </>
    );
  }

  // 코스 없음
  if (!data) {
    return (
      <>
        <WeekendHeader locationName="코스 보기" />
        <div className="flex flex-col items-center justify-center min-h-[60dvh] pt-20 px-6">
          <span className="text-5xl mb-4">😢</span>
          <h2 className="text-lg font-black text-slate-800" style={{ fontFamily: "'CookieRun', sans-serif" }}>
            코스를 찾을 수 없어요
          </h2>
          <p className="text-sm text-slate-500 mt-2 text-center break-keep">
            링크가 만료되었거나 잘못된 주소예요
          </p>
          <Link
            href="/course"
            className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white text-sm font-black rounded-2xl shadow-md shadow-orange-200/50"
          >
            새 코스 만들기
          </Link>
        </div>
        <BottomTabBar />
      </>
    );
  }

  const { course, kakaoNaviUrl } = data;

  // 코스 제목을 헤더에 표시
  const locationName = course.title || '코스 보기';

  // 카카오맵 웹 URL: 멀티마커가 아닌 개별 장소 마커 URL 사용
  const buildKakaoMapUrl = () => {
    if (course.stops.length === 0) return '';
    if (course.stops.length === 1) {
      const s = course.stops[0];
      return `https://map.kakao.com/link/map/${encodeURIComponent(s.title)},${s.latitude},${s.longitude}`;
    }
    // 다중 마커: link/map/title,lat,lng 형식은 단일만 지원 → roadview 대신 to 형태 사용
    // 카카오맵 멀티마커: https://map.kakao.com/link/map/title1,lat1,lng1/title2,lat2,lng2 는 미지원
    // 대안: 첫 장소를 출발, 마지막 장소를 도착으로 길찾기 URL 생성
    const origin = course.stops[0];
    const dest = course.stops[course.stops.length - 1];
    return `https://map.kakao.com/link/from/${encodeURIComponent(origin.title)},${origin.latitude},${origin.longitude}/to/${encodeURIComponent(dest.title)},${dest.latitude},${dest.longitude}`;
  };

  const kakaoMapWebUrl = buildKakaoMapUrl();

  const handleKakaoMap = () => {
    // 모바일이면 카카오맵 앱 딥링크 시도, 실패 시 웹으로 폴백
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

    if (isMobile && course.stops.length >= 2) {
      const origin = course.stops[0];
      const dest = course.stops[course.stops.length - 1];
      const vias = course.stops.slice(1, -1);
      let deeplink = `kakaomap://route?sp=${origin.latitude},${origin.longitude}&ep=${dest.latitude},${dest.longitude}&by=CAR`;
      vias.forEach((v, i) => { deeplink += `&via${i + 1}=${v.latitude},${v.longitude}`; });

      // 앱 열기 시도 → 1.5초 후 웹으로 폴백
      const start = Date.now();
      window.location.href = deeplink;
      setTimeout(() => {
        if (Date.now() - start < 2000) {
          window.open(kakaoMapWebUrl, '_blank');
        }
      }, 1500);
    } else {
      window.open(kakaoMapWebUrl, '_blank');
    }
  };

  return (
    <>
      <WeekendHeader locationName={locationName ?? '코스 보기'} />

      <div className="max-w-lg mx-auto px-5 pt-16 pb-28">
        {/* 헤더 영역 */}
        <div className="mt-4 mb-6 animate-[fadeSlide_0.5s_ease-out]">
          {data.fortuneMessage && (
            <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 via-pink-50 to-violet-50 rounded-2xl border border-orange-100/50">
              <p className="text-xs font-bold text-orange-400 mb-1">✨ 오늘의 나들이 운세</p>
              <p className="text-sm text-slate-700 font-bold break-keep">{data.fortuneMessage}</p>
            </div>
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 text-white uppercase tracking-wider">
              AI 추천 코스
            </span>
            <span className="text-[10px] text-slate-400">
              {course.stops.length}곳 · {course.totalDistanceKm}km
            </span>
          </div>

          <h1
            className="text-2xl font-black text-slate-800 break-keep"
            style={{ fontFamily: "'CookieRun', sans-serif" }}
          >
            {course.title}
          </h1>
          <p className="text-sm text-slate-500 mt-2 break-keep leading-relaxed">
            {course.summary}
          </p>

          {/* 전체 꿀팁 */}
          {course.tip && (
            <div className="mt-4 flex gap-2 items-start bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
              <span className="text-base flex-shrink-0">💡</span>
              <p className="text-sm text-orange-700 font-medium break-keep">{course.tip}</p>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex flex-col gap-2 mt-4">
            {/* 카카오맵 길안내 */}
            {course.stops.length > 0 && (
              <button
                onClick={handleKakaoMap}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#FEE500] text-[#3C1E1E] text-sm font-black shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c-5.4 0-9.8 3.6-9.8 8 0 2.9 1.9 5.4 4.8 6.8l-1 3.7c-.1.3.3.5.5.3l4.2-2.8c.4 0 .9.1 1.3.1 5.4 0 9.8-3.6 9.8-8S17.4 3 12 3z" />
                </svg>
                카카오맵에서 코스 보기
              </button>
            )}

            {/* 공유 버튼 행 */}
            <div className="flex gap-2">
              {/* 카카오톡 공유 */}
              <button
                onClick={handleKakaoShare}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#FEE500]/30 border border-[#FEE500] text-[#3C1E1E] text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#3C1E1E">
                  <path d="M12 3c-5.4 0-9.8 3.6-9.8 8 0 2.9 1.9 5.4 4.8 6.8l-1 3.7c-.1.3.3.5.5.3l4.2-2.8c.4 0 .9.1 1.3.1 5.4 0 9.8-3.6 9.8-8S17.4 3 12 3z" />
                </svg>
                카톡 공유
              </button>

              {/* 링크 복사 */}
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-orange-100 text-slate-600 text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {shared ? (
                  <span className="text-orange-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    복사됨
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.061a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                    </svg>
                    링크
                  </>
                )}
              </button>

              {/* 기타 공유 (Web Share API) */}
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center px-3 py-3 rounded-2xl bg-white border border-orange-100 text-slate-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                aria-label="더보기 공유"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 코스 지도 */}
        <div className="mb-5 animate-[fadeSlide_0.5s_ease-out_0.15s_both]">
          <CourseMap stops={course.stops} />
        </div>

        {/* 타임라인 코스 */}
        <div className="animate-[fadeSlide_0.5s_ease-out_0.3s_both]">
          <div className="relative">
            {/* 세로 연속선 */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-300 via-pink-300 to-violet-300" />

            {/* 첫째 날 헤더 */}
            {course.stops[0]?.day === 1 && (
              <div className="relative flex items-center gap-3 mb-4 ml-10 pl-3">
                <span className="text-xs font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full">🌅 첫째 날</span>
              </div>
            )}

            {course.stops.map((stop, i) => {
              const color = getStopColor(i);
              const prevDay = i > 0 ? course.stops[i - 1].day : undefined;
              const showDayDivider = stop.day && stop.day !== prevDay && stop.day > 1;
              const showTransit = i > 0 && stop.transitInfo;

              return (
                <div key={stop.contentId}>
                  {/* 둘째 날 구분선 */}
                  {showDayDivider && (
                    <div className="relative flex items-center gap-3 my-5 ml-10 pl-3">
                      <span className="text-xs font-black text-violet-500 bg-violet-50 px-3 py-1 rounded-full">🌄 둘째 날</span>
                    </div>
                  )}

                  {/* 이동 정보 */}
                  {showTransit && (
                    <div className="relative flex items-center gap-2 py-2 ml-10 pl-3">
                      <span className="text-[11px] text-slate-400">🚗 {stop.transitInfo}</span>
                    </div>
                  )}

                  {/* 장소 카드 */}
                  <div className="relative flex gap-4 mb-4">
                    {/* 원형 마커 */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-black shadow-md z-10`}>
                      {stop.order}
                    </div>

                    {/* 카드 */}
                    <div
                      onClick={() => setSelectedSpotId(stop.contentId)}
                      className="flex-1 bg-white rounded-3xl shadow-sm border border-orange-50 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {/* 이미지 갤러리 */}
                      <ImageGallery
                        images={stop.images?.length ? stop.images : (stop.imageUrl ? [stop.imageUrl] : [])}
                        alt={stop.title}
                        height="h-36"
                      />

                      <div className="p-4">
                        {/* 시간 + 뱃지 */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${color} text-white`}>
                            {formatTime(stop.timeStart, stop.durationMin)}
                          </span>
                          <span className="text-[10px] text-slate-400">{stop.durationMin}분</span>
                          {(stop.isFestival || stop.isStay) && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stop.isStay ? 'bg-indigo-100 text-indigo-600' : 'bg-red-100 text-red-600'}`}>
                              {stop.isStay ? '🏨 숙박' : '🎪 축제'}
                            </span>
                          )}
                        </div>

                        {/* 제목 */}
                        <h3 className="text-base font-black text-slate-800 break-keep">{stop.title}</h3>

                        {/* 설명 */}
                        <p className="text-sm text-slate-600 mt-1 break-keep leading-relaxed">
                          {stop.description}
                        </p>

                        {/* 편의시설 뱃지 */}
                        {stop.facilities && (
                          <div className="mt-2">
                            <FacilityBadges facilities={stop.facilities} compact />
                          </div>
                        )}

                        {/* 꿀팁 */}
                        {stop.tip && (
                          <div className="mt-3 flex gap-2 items-start bg-orange-50 rounded-xl px-3 py-2">
                            <span className="text-sm flex-shrink-0">💡</span>
                            <p className="text-xs text-orange-700 font-medium break-keep">{stop.tip}</p>
                          </div>
                        )}

                        {/* 상세보기 힌트 */}
                        <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
                          <span>탭하면 상세정보 보기</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 CTA */}
        <div className="mt-8 flex flex-col gap-3 animate-[fadeSlide_0.5s_ease-out_0.5s_both]">
          <Link
            href="/course"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-400 text-white text-sm font-black text-center shadow-md shadow-orange-200/50 hover:shadow-lg transition-all"
          >
            다른 코스 만들기
          </Link>
          <Link
            href="/"
            className="w-full py-3.5 rounded-2xl bg-white border border-orange-100 text-slate-500 text-sm font-bold text-center shadow-sm hover:shadow-md transition-all"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>

      <BottomTabBar />

      {/* 장소 상세 모달 */}
      <SpotDetailModal
        contentId={selectedSpotId}
        onClose={() => setSelectedSpotId(null)}
      />

      <style jsx global>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
