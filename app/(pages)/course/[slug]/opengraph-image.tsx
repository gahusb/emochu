// 코스별 공유 카드 이미지.
//
// 예전에는 첫 장소의 TourAPI 사진 한 장을 그대로 OG 이미지로 썼다. 그러면
// 카톡에 뿌렸을 때 「어떤 코스인지」가 안 보인다 — 사진 한 장은 코스가 아니다.
// 여기서는 제목 + 코스 동선(장소 → 장소 → 장소) + 거리·시간을 그려
// **링크만 보고도 코스임을 알 수 있게** 한다.
//
// 🔴 실패해도 이미지를 반드시 돌려준다. OG 생성이 던지면 카톡 미리보기가 통째로
//    비므로, 코스를 못 읽었을 때는 기본 카드로 떨어진다.

import { ImageResponse } from 'next/og';
import { getSiteUrl } from '@/lib/site-url';

export const runtime = 'nodejs';
export const alt = '이모추! AI가 만든 주말 나들이 코스';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Stop { title: string }
interface Course {
  title?: string;
  summary?: string;
  totalDistanceKm?: number;
  stops?: Stop[];
}

export default async function CourseOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 🔴 폰트를 fs 로 읽지 않는다. 서버리스 런타임에는 public/ 이 번들에 없어서
  //    readFile 이 던지고 이 라우트가 통째로 500 이 된다(2026-08-31 라이브 실측:
  //    빌드 때 미리 만들어지는 홈 OG 는 200, 요청 시 만드는 코스 OG 만 500 이었다).
  //    CDN 이 서빙하는 같은 파일을 HTTP 로 받는다.
  // 🔑 실패해도 500 을 내지 않는다 — 기본 폰트로 그린 카드가 깨진 미리보기보다 낫다.
  let cookieRun: ArrayBuffer | null = null;
  try {
    const res = await fetch(`${getSiteUrl()}/fonts/CookieRun-Bold.otf`, { next: { revalidate: 86400 } });
    if (res.ok) cookieRun = await res.arrayBuffer();
  } catch {
    /* 기본 폰트로 그린다 */
  }

  let course: Course | null = null;
  try {
    const res = await fetch(`${getSiteUrl()}/api/course/${slug}`, { next: { revalidate: 3600 } });
    if (res.ok) course = (await res.json()).course as Course;
  } catch {
    /* 기본 카드로 떨어진다 */
  }

  const title = course?.title ?? '이모추! 주말 나들이 코스';
  const stops = course?.stops ?? [];
  // 4곳까지만 적는다. 그 이상은 글자가 작아져서 오히려 안 읽힌다.
  const shown = stops.slice(0, 4).map((s) => s.title);
  const rest = stops.length - shown.length;
  const routeLine = shown.join('  →  ') + (rest > 0 ? `  →  외 ${rest}곳` : '');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '64px 72px',
          background: 'linear-gradient(135deg, #FFF8F0 0%, #FFE0B8 55%, #FFB066 100%)',
          fontFamily: cookieRun ? 'CookieRun' : 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 40, color: '#E8730C' }}>이모추!</div>
          <div style={{ fontSize: 26, color: '#A06A3A' }}>AI 주말 나들이 코스</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: title.length > 26 ? 62 : 76, color: '#7A3E00', lineHeight: 1.15 }}>
            {title}
          </div>
          {routeLine && (
            <div style={{ fontSize: 30, color: '#8A5A2B', marginTop: 28, lineHeight: 1.4 }}>
              {routeLine}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 26, color: '#A06A3A' }}>
          {stops.length > 0 && <div>📍 {stops.length}곳</div>}
          {course?.totalDistanceKm ? <div>🚗 총 {course.totalDistanceKm.toFixed(1)}km</div> : null}
          <div style={{ marginLeft: 'auto', color: '#B07A4A' }}>출처: ⓒ한국관광공사</div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(cookieRun
        ? { fonts: [{ name: 'CookieRun', data: cookieRun, style: 'normal' as const, weight: 700 as const }] }
        : {}),
    },
  );
}
