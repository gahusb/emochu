import type { Metadata, Viewport } from 'next';
import './globals.css';
import KakaoSDK from './components/KakaoSDK';

export const metadata: Metadata = {
  title: {
    default: '이모추! — 이번 주에 모하지 추천',
    template: '%s | 이모추!',
  },
  description:
    '매주 금요일 열어보는 주말 나들이 AI 코스 플래너. 내 위치 + 축제 + 날씨를 AI가 분석해 10초 만에 맞춤 코스를 만들어드려요.',
  keywords: [
    '주말 나들이',
    '당일치기 여행',
    'AI 코스 추천',
    '축제 정보',
    '주말 갈만한곳',
    '나들이 코스',
    '관광지 추천',
    '이모추',
  ],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '이모추! — 이번 주에 모하지 추천',
    description: '3번의 선택 → AI가 10초 만에 주말 나들이 코스 완성!',
    siteName: '이모추!',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#FFF8F0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <div
          className="min-h-[100dvh] bg-[#FFF8F0] text-slate-800 flex flex-col"
          style={{ fontFamily: "'Pretendard', 'CookieRun', system-ui, sans-serif" }}
        >
          <main className="flex-1 overflow-y-auto">{children}</main>
          <KakaoSDK />
        </div>
      </body>
    </html>
  );
}
