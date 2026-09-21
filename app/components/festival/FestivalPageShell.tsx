'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FestivalCard as FestivalCardData } from '@/lib/weekend-types';
import FestivalHeader from './FestivalHeader';
import FestivalFilterBar from './FestivalFilterBar';
import FestivalRadius from './FestivalRadius';
import FestivalRegionFilter from './FestivalRegionFilter';
import FestivalGrid from './FestivalGrid';
import Button from '@/app/components/ui/Button';

type StatusFilter = 'all' | 'ongoing' | 'thisWeekend' | 'upcoming';
type SortKey = 'distance' | 'endingSoon' | 'newest';

function getTodayStr(): string {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replaceAll('-', '');
}

function extractRegion(addr: string): string {
  if (!addr) return '기타';
  const match = addr.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
  return match ? match[1] : '기타';
}

export default function FestivalPageShell() {
  const [festivals, setFestivals] = useState<FestivalCardData[]>([]);
  const [weekendLabel, setWeekendLabel] = useState('');
  const [weekendDates, setWeekendDates] = useState<{ saturday: string; sunday: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [retry, setRetry] = useState(0);
  const [radius, setRadius] = useState(50);
  const [locationName, setLocationName] = useState('위치 설정');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('distance');

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLoc({ lat: 37.5665, lng: 126.9780 });
      setLocationName('서울');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationName('내 근처');
      },
      () => {
        setUserLoc({ lat: 37.5665, lng: 126.9780 });
        setLocationName('서울');
      },
      { timeout: 5000 },
    );
  }, []);

  // Fetch
  useEffect(() => {
    if (!userLoc) return;
    setLoading(true);
    setError(false); setPartial(false); setFestivals([]);
    const controller = new AbortController();
    fetch(`/api/festival?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=${radius}`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error('FESTIVAL_UNAVAILABLE'); return res.json(); })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data?.festivals) || data.dataStatus === 'unavailable') throw new Error('FESTIVAL_UNAVAILABLE');
        setFestivals(data.festivals);
        setPartial(data.dataStatus === 'partial');
        setRegionFilter('all');
        if (data.weekendDates) {
          setWeekendDates(data.weekendDates);
          const { saturday: sat, sunday: sun } = data.weekendDates;
          setWeekendLabel(`${sat.slice(4, 6)}/${sat.slice(6, 8)}~${sun.slice(6, 8)}`);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) { setError(true); setFestivals([]); }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userLoc, radius, retry]);

  const availableRegions = useMemo(() => {
    const regions = new Set(festivals.map((f) => extractRegion(f.addr1)));
    return ['all', ...Array.from(regions).sort()];
  }, [festivals]);

  const today = getTodayStr();
  const satStr = weekendDates?.saturday ?? '';
  const sunStr = weekendDates?.sunday ?? '';

  const filtered = useMemo(() => {
    let list = [...festivals];
    if (statusFilter === 'ongoing') list = list.filter((f) => f.eventStart <= today && f.eventEnd >= today);
    else if (statusFilter === 'thisWeekend') list = list.filter((f) => f.eventStart <= sunStr && f.eventEnd >= satStr);
    else if (statusFilter === 'upcoming') list = list.filter((f) => f.eventStart > today);

    if (regionFilter !== 'all') list = list.filter((f) => extractRegion(f.addr1) === regionFilter);

    if (sortKey === 'distance') list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    else if (sortKey === 'endingSoon') list.sort((a, b) => a.eventEnd.localeCompare(b.eventEnd));
    else if (sortKey === 'newest') list.sort((a, b) => b.eventStart.localeCompare(a.eventStart));

    return list;
  }, [festivals, statusFilter, regionFilter, sortKey, today, satStr, sunStr]);

  return (
    <>
      <FestivalHeader
        weekendLabel={weekendLabel}
        locationName={locationName}
        radius={radius}
        count={filtered.length}
        status={loading ? 'loading' : error ? 'unavailable' : partial ? 'partial' : 'available'}
      />
      <FestivalFilterBar
        status={statusFilter}
        sort={sortKey}
        onStatusChange={setStatusFilter}
        onSortChange={setSortKey}
      />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-4 space-y-3 border-b border-line">
        <FestivalRadius value={radius} onChange={setRadius} />
        <FestivalRegionFilter regions={availableRegions} value={regionFilter} onChange={setRegionFilter} />
      </div>
      <p className="max-w-7xl mx-auto px-5 lg:px-8 pt-4 text-xs leading-relaxed text-ink-3">개최기간이 이번 주말과 겹치는 행사예요. 매일 열리는 것은 아니니 운영일·공연 회차·예약을 확인해주세요. 거리는 직선 추정치예요.</p>
      {partial && <p role="status" className="max-w-7xl mx-auto px-5 lg:px-8 pt-3 text-sm text-ink-2">일부 조회 범위만 확인했어요. 표시되지 않은 행사가 있을 수 있어요.</p>}
      {error ? (
        <div role="alert" className="max-w-7xl mx-auto px-5 lg:px-8 py-12 text-center">
          <h2 className="font-bold text-ink-1">축제 정보를 불러오지 못했어요</h2>
          <p className="mt-2 mb-5 text-sm text-ink-3">축제가 없다는 뜻은 아니에요. 잠시 후 다시 확인해주세요.</p>
          <Button variant="secondary" onClick={() => setRetry(value => value + 1)}>축제 다시 불러오기</Button>
        </div>
      ) : <FestivalGrid
        festivals={filtered}
        loading={loading}
        today={today}
        satStr={satStr}
        sunStr={sunStr}
        onExpandRadius={() => setRadius(200)}
      />}
    </>
  );
}
