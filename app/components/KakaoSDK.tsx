'use client';

import Script from 'next/script';

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

export default function KakaoSDK() {
  if (!KAKAO_KEY) return null;

  return (
    <>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`}
        strategy="lazyOnload"
      />
      <Script
        src="//developers.kakao.com/sdk/js/kakao.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          if ((window as any).Kakao && !(window as any).Kakao.isInitialized()) {
            (window as any).Kakao.init(KAKAO_KEY);
          }
        }}
      />
    </>
  );
}
