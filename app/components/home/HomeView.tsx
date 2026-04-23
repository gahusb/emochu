'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
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
import SpotDetailModal from '../SpotDetailModal';

export default function HomeView() {
  const { location, openModal } = useLocation();
  const { weather, festivals, spots, loading } = useHomeData(location);
  const searchParams = useSearchParams();
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  useEffect(() => {
    const spotParam = searchParams.get('spot');
    if (spotParam) setSelectedContentId(spotParam);
  }, [searchParams]);

  const main = (
    <div className="space-y-12 lg:space-y-16">
      {/* Mobile-only sections (sidebar 콘텐츠 합류) */}
      <div className="lg:hidden space-y-6">
        <SearchBar onSelectSpot={(id) => setSelectedContentId(id)} />
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
              <div key={s.contentId} onClick={() => setSelectedContentId(s.contentId)}>
                <SpotCard spot={s} />
              </div>
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
            <div className="relative aspect-[16/10] lg:aspect-auto bg-surface-sunken">
              <img
                src="/hero/autumn-clear.jpg"
                alt=""
                className="w-full h-full object-cover"
              />
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
              <div
                key={f.contentId}
                className="snap-start"
                onClick={() => setSelectedContentId(f.contentId)}
              >
                <FestivalBadge festival={f} />
              </div>
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
      <FestivalSideList
        festivals={festivals}
        onSelect={(id) => setSelectedContentId(id)}
      />
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

  return (
    <>
      <HomeHero weather={weather} spots={spots} />
      <Container className="py-10 lg:py-14">
        <MagazineGrid main={main} side={side} />
      </Container>

      <SpotDetailModal
        contentId={selectedContentId}
        onClose={() => setSelectedContentId(null)}
      />
    </>
  );
}
