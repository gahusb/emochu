'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles, MapPinOff, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from '../nav/LocationContext';
import { useHomeData } from '@/lib/use-home-data';
import HomeHero from './HomeHero';
import MagazineGrid from './MagazineGrid';
import WeatherCard from './WeatherCard';
import FestivalSideList from './FestivalSideList';
import SectionHeader from '../ui/SectionHeader';
import Container from '../ui/Container';
import Card from '../ui/Card';
import SpotCard from '../SpotCard';
import FestivalBadge from '../FestivalBadge';
import SearchBar from '../SearchBar';

export default function HomeView() {
  const { location, openModal, gpsPermissionDenied, requestGPS } = useLocation();
  const { weather, festivals, spots, loading } = useHomeData(location);
  const [gpsBannerDismissed, setGpsBannerDismissed] = useState(false);

  const main = (
    <div className="space-y-12 lg:space-y-16">
      {/* Mobile-only sections (sidebar 콘텐츠 합류) */}
      <div className="lg:hidden space-y-6">
        <SearchBar />
        <WeatherCard weather={weather} />
      </div>

      {/* 추천 관광지 */}
      <section id="recommended">
        <SectionHeader
          title="지금 가면 좋은 곳"
          description="이번 주말 추천 관광지"
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

      {/* AI 코스 CTA — 큰 매거진 카드 */}
      <section>
        <Card className="relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-6 lg:p-10 flex flex-col justify-center">
              <p className="text-xs font-semibold text-brand uppercase tracking-wide mb-3">AI 코스 추천</p>
              <h3
                className="text-2xl lg:text-3xl font-bold text-ink-1 leading-tight break-keep"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                3가지 선택만으로<br />당신만의 주말 코스를
              </h3>
              <p className="text-sm text-ink-3 mt-3 leading-relaxed break-keep">
                위치 · 동반자 · 기분을 알려주시면 AI가 10초 만에 맞춤 코스를 설계합니다.
              </p>
              <Link
                href="/course"
                className="inline-flex items-center gap-2 self-start mt-6 h-11 px-5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
              >
                <Sparkles size={16} strokeWidth={2} />
                지금 만들어보기
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>
            <div className="relative aspect-[16/10] lg:aspect-auto bg-gradient-to-br from-hero-fallback-start via-hero-fallback-mid to-hero-fallback-end">
              <Image
                src="/hero/autumn-clear.png"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Sparkles size={56} strokeWidth={1.25} className="text-white/30" aria-hidden="true" />
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 근처 축제 */}
      <section>
        <SectionHeader
          title="이번 주말 근처 축제"
          description="진행 중이거나 곧 시작하는 축제"
          moreHref="/festival"
        />
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 lg:mx-0 px-5 lg:px-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-64 lg:w-72">
                <div className="skeleton aspect-[16/10] rounded-xl" />
                <div className="space-y-2 mt-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : festivals.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-ink-3">진행 중인 축제가 없어요</p>
          </Card>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-2 -mx-5 lg:mx-0 px-5 lg:px-0 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {festivals.map((f) => (
              <Link
                key={f.contentId}
                href={`/spot/${f.contentId}`}
                className="snap-start text-left block"
                aria-label={`${f.title} 상세 보기`}
              >
                <FestivalBadge festival={f} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 서비스 소개 한 줄 */}
      <section>
        <Card variant="sunken" className="p-5 lg:p-6 text-center">
          <p className="text-sm text-ink-2 leading-relaxed break-keep">
            <strong className="text-brand font-bold">이모추</strong>는 한국관광공사 TourAPI와 AI를 활용해
            매주 새로운 주말 나들이 코스를 추천합니다.
          </p>
          <p className="text-xs text-ink-4 mt-2">2026 관광데이터 활용 공모전 출품작</p>
        </Card>
      </section>
    </div>
  );

  const side = (
    <>
      <WeatherCard weather={weather} />
      <FestivalSideList festivals={festivals} />
      <Card className="p-5">
        <h3
          className="text-sm font-bold text-ink-1 mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          현재 위치
        </h3>
        <p className="text-sm text-ink-2 mb-4">{location?.name ?? '위치 설정 필요'}</p>
        <button
          onClick={openModal}
          className="w-full h-10 rounded-md border border-line text-sm font-semibold text-ink-2 hover:border-brand hover:text-brand transition-colors"
        >
          위치 변경
        </button>
      </Card>
    </>
  );

  const showGpsBanner = gpsPermissionDenied && !gpsBannerDismissed;

  return (
    <>
      <HomeHero weather={weather} spots={spots} />

      {/* GPS 권한 거부 안내 배너 */}
      {showGpsBanner && (
        <div
          role="alert"
          className="bg-mocha-soft border-b border-mocha/20"
        >
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

      <Container className="py-10 lg:py-14">
        <MagazineGrid main={main} side={side} />
      </Container>
    </>
  );
}
