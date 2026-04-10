'use client';

import { useState, useEffect, useCallback } from 'react';

interface SubInfo {
  name: string;
  overview: string;
  image?: string;
}

interface SpotDetail {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr: string;
  tel: string;
  homepage: string;
  overview: string;
  mainImage: string;
  images: { url: string; thumbnail: string; name: string }[];
  lat: number;
  lng: number;
  introFields: { label: string; value: string }[];
  subInfo: SubInfo[];
}

interface Props {
  contentId: string | null;
  onClose: () => void;
}

export default function SpotDetailModal({ contentId, onClose }: Props) {
  const [detail, setDetail] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);

  useEffect(() => {
    if (!contentId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(null);
    setActiveImage(0);
    setShowFullOverview(false);

    fetch(`/api/spot?contentId=${contentId}`)
      .then(res => {
        if (!res.ok) throw new Error('상세 정보를 불러올 수 없어요');
        return res.json();
      })
      .then(setDetail)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [contentId]);

  // ESC 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (contentId) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [contentId, onClose]);

  // 카카오맵 열기
  const openKakaoMap = useCallback(() => {
    if (!detail) return;
    const url = `https://map.kakao.com/link/map/${encodeURIComponent(detail.title)},${detail.lat},${detail.lng}`;
    window.open(url, '_blank');
  }, [detail]);

  // 전화 연결
  const handleCall = useCallback(() => {
    if (!detail?.tel) return;
    const phone = detail.tel.replace(/[^0-9-]/g, '').split(',')[0].trim();
    if (phone) window.location.href = `tel:${phone}`;
  }, [detail]);

  if (!contentId) return null;

  // 모든 이미지 (메인 + 갤러리)
  const allImages = detail
    ? [
        ...(detail.mainImage ? [{ url: detail.mainImage, name: detail.title }] : []),
        ...detail.images.filter(img => img.url !== detail.mainImage),
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-lg max-h-[85dvh] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden animate-[slideUp_0.3s_ease-out] flex flex-col">
        {/* 닫기 핸들 (모바일) */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* 로딩 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400 mt-3">정보를 불러오는 중...</p>
            </div>
          )}

          {/* 에러 */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <span className="text-4xl mb-3">😢</span>
              <p className="text-sm text-slate-500 text-center break-keep">{error}</p>
            </div>
          )}

          {/* 상세 내용 */}
          {detail && !loading && (
            <>
              {/* 이미지 갤러리 */}
              {allImages.length > 0 ? (
                <div className="relative">
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={allImages[activeImage]?.url}
                      alt={allImages[activeImage]?.name || detail.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 이미지 카운터 */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      {activeImage + 1} / {allImages.length}
                    </div>
                  )}

                  {/* 썸네일 스크롤 */}
                  {allImages.length > 1 && (
                    <div className="flex gap-1.5 px-4 py-2 overflow-x-auto">
                      {allImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImage(i)}
                          className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                            activeImage === i ? 'border-orange-400 scale-105' : 'border-transparent opacity-60'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-32 bg-gradient-to-br from-orange-100 to-pink-50 flex items-center justify-center">
                  <span className="text-5xl opacity-30">📍</span>
                </div>
              )}

              {/* 정보 영역 */}
              <div className="px-5 py-4">
                {/* 제목 */}
                <h2 className="text-xl font-black text-slate-800 break-keep" style={{ fontFamily: "'CookieRun', sans-serif" }}>
                  {detail.title}
                </h2>

                {/* 주소 */}
                <button
                  onClick={openKakaoMap}
                  className="flex items-center gap-1.5 mt-2 text-sm text-slate-500 hover:text-orange-500 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                  <span className="break-keep">{detail.addr}</span>
                  <svg className="w-3 h-3 flex-shrink-0 opacity-40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </button>

                {/* 액션 버튼들 */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={openKakaoMap}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FEE500] text-[#3C1E1E] text-xs font-bold"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                    지도 보기
                  </button>

                  {detail.tel && (
                    <button
                      onClick={handleCall}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      전화
                    </button>
                  )}

                  {detail.homepage && (
                    <a
                      href={detail.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
                      </svg>
                      홈페이지
                    </a>
                  )}
                </div>

                {/* 상세 정보 (운영시간, 주차 등) */}
                {detail.introFields.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">상세 정보</h3>
                    <div className="bg-slate-50 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {detail.introFields.map(({ label, value }) => (
                        <div key={label} className="flex px-4 py-3 gap-3">
                          <span className="text-xs font-bold text-slate-400 w-16 flex-shrink-0 pt-0.5">
                            {label}
                          </span>
                          <span className="text-xs text-slate-600 break-keep leading-relaxed flex-1">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 소개 */}
                {detail.overview && (
                  <div className="mt-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">소개</h3>
                    <p className={`text-sm text-slate-600 leading-relaxed break-keep whitespace-pre-line ${
                      !showFullOverview && detail.overview.length > 200 ? 'line-clamp-4' : ''
                    }`}>
                      {detail.overview}
                    </p>
                    {detail.overview.length > 200 && (
                      <button
                        onClick={() => setShowFullOverview(v => !v)}
                        className="text-xs text-orange-500 font-bold mt-2"
                      >
                        {showFullOverview ? '접기' : '더보기'}
                      </button>
                    )}
                  </div>
                )}

                {/* 세부 정보 (코스, 객실 등) */}
                {detail.subInfo && detail.subInfo.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">세부 정보</h3>
                    <div className="space-y-3">
                      {detail.subInfo.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-2xl overflow-hidden">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-32 object-cover"
                              loading="lazy"
                            />
                          )}
                          <div className="px-4 py-3">
                            {item.name && (
                              <p className="text-xs font-bold text-slate-700 mb-1">{item.name}</p>
                            )}
                            {item.overview && (
                              <p className="text-xs text-slate-500 leading-relaxed break-keep whitespace-pre-line">
                                {item.overview.length > 150 ? item.overview.slice(0, 150) + '...' : item.overview}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 하단 여백 */}
                <div className="h-6" />
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
