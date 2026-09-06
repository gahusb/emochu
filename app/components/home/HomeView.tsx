'use client';

// 홈 조립.
//
// 🔴 2026-09-04 재구성. 이전 홈은 섹션이 열 개였다(조건 바 · 3축 카드 · 마감 축제 ·
//    검색 · 날씨 카드 · 추천 · AI CTA 카드 · 축제 캐러셀 · 서비스 소개 + 사이드 4장).
//    "복잡하고 뭘 원하는지 모르겠다"는 말은 정확했다 — 화면이 열 가지를 동시에 권했다.
//
// 지금은 네 덩어리다:
//    1. 히어로 — 코스를 짜준다는 주장 + 조건 두 줄 + 큰 CTA
//    2. 추천 관광지 — 실제 콘텐츠
//    3. 축제는 탭으로 보낸다 (한 줄)
//    4. 서비스 한 줄
//
// 걷어낸 것: WeekendConditionBar · ThreeAxis · WeekendClosingFestival · WhichDaySide ·
//            WeatherCard · FestivalSideList · MagazineGrid 사이드바.
//            날씨는 히어로의 한 줄이 대신하고, 축제는 축제 탭이 대신한다.

import Link from 'next/link';
import { MapPinOff, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from '../nav/LocationContext';
import { useHomeData } from '@/lib/use-home-data';
import HomeHeroLanding from './HomeHeroLanding';
import FestivalTabInvite from './FestivalTabInvite';
import CommunityInvite from './CommunityInvite';
import { getWeekendElements, ELEMENT_META } from '@/lib/saju';
import SectionHeader from '../ui/SectionHeader';
import Container from '../ui/Container';
import Card from '../ui/Card';
import SpotCard from '../SpotCard';
import SearchBar from '../SearchBar';

export default function HomeView() {
  const { location, gpsPermissionDenied, requestGPS } = useLocation();
  const { weather, festivals, spots, loading } = useHomeData(location);
  const [gpsBannerDismissed, setGpsBannerDismissed] = useState(false);

  // 추천 섹션 제목은 이번 주말의 기운을 그대로 말한다.
  // 🔴 서버가 실제로 그 기운으로 정렬했을 때만 그렇게 부른다 — 제목만 바꾸면 거짓말이 된다.
  const weekend = getWeekendElements();
  const satHanja = ELEMENT_META[weekend.saturday].name.split(' ')[0];
  const hasElementMatch = spots.some((s) => s.weekendMatch);
  const recommendTitle = !hasElementMatch
    ? '지금 가면 좋은 곳'
    : weekend.same
      ? `이번 주말 ${satHanja} 기운과 맞는 곳`
      : '날마다 맞는 곳이 달라요';

  const showGpsBanner = gpsPermissionDenied && !gpsBannerDismissed;

  return (
    <>
      {/* GPS 권한 거부 안내 배너 */}
      {showGpsBanner && (
        <div role="alert" className="bg-mocha-soft border-b border-mocha/20">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-3 flex items-center gap-3">
            <MapPinOff size={16} className="text-mocha flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-ink-2 flex-1 break-keep">
              위치 권한이 거부되어 <strong className="font-semibold">서울</strong> 기준으로 보여드리고 있어요.
            </p>
            <button
              type="button"
              onClick={async () => {
                const granted = await requestGPS();
                // 성공 시에만 배너 닫기; 재거부 시 배너 유지
                if (granted) setGpsBannerDismissed(true);
              }}
              className="text-xs font-semibold text-brand whitespace-nowrap hover:underline"
            >
              권한 허용하기
            </button>
            <button
              type="button"
              onClick={() => setGpsBannerDismissed(true)}
              className="text-ink-4 hover:text-ink-2 flex-shrink-0"
              aria-label="닫기"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      <HomeHeroLanding weather={weather} />

      <Container className="py-10 lg:py-14">
        <div className="space-y-10 lg:space-y-14">
          {/* 데스크톱은 헤더에 검색이 있다. 모바일에는 여기밖에 없다. */}
          <div className="lg:hidden">
            <SearchBar />
          </div>

          {/* ─── 추천 관광지 ─── */}
          <section id="recommended">
            <SectionHeader
              title={recommendTitle}
              description={hasElementMatch ? '주말 기운에 맞춰 골랐어요' : '이번 주말 추천 관광지'}
            />
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i}>
                    <div className="skeleton aspect-[4/3] rounded-xl" />
                    <div className="space-y-2 mt-3">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {spots.slice(0, 6).map((s) => (
                  <Link
                    key={s.contentId}
                    href={`/spot/${s.contentId}`}
                    className="text-left w-full block"
                    aria-label={`${s.title} 상세 보기`}
                  >
                    <SpotCard spot={s} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ─── 축제는 탭으로 ─── */}
          <FestivalTabInvite festivals={festivals} />

          {/* ─── 커뮤니티 코스 둘러보기 ─── */}
          <CommunityInvite />

          {/* ─── 서비스 한 줄 ─── */}
          <Card variant="sunken" className="p-5 lg:p-6 text-center">
            <p className="text-sm text-ink-2 leading-relaxed break-keep">
              <strong className="text-brand font-bold">이모추</strong>는 한국관광공사 TourAPI와 AI를 활용해
              매주 새로운 주말 나들이 코스를 추천합니다.
            </p>
            <p className="text-xs text-ink-4 mt-2">2026 관광데이터 활용 공모전 출품작</p>
          </Card>
        </div>
      </Container>
    </>
  );
}
