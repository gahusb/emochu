import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const alt = '이모추! — 이번 주에 모하지 추천';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const cookieRun = await readFile(join(process.cwd(), 'public/fonts/CookieRun-Bold.otf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF8F0 0%, #FFE0B8 55%, #FFB066 100%)',
          fontFamily: 'CookieRun',
        }}
      >
        <div style={{ fontSize: 150, color: '#7A3E00', lineHeight: 1 }}>이모추!</div>
        <div style={{ fontSize: 46, color: '#E8730C', marginTop: 18 }}>이번 주에 모하지 추천</div>
        <div style={{ fontSize: 34, color: '#8A5A2B', marginTop: 40 }}>AI 주말 나들이 코스 플래너</div>
        <div style={{ fontSize: 28, color: '#A06A3A', marginTop: 12 }}>위치 · 축제 · 날씨 → 10초 코스 완성</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'CookieRun', data: cookieRun, style: 'normal', weight: 700 }],
    },
  );
}
