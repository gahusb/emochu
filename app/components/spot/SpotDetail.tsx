'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, Globe, ChevronDown, ChevronUp, ImageOff } from 'lucide-react';
import KakaoMiniMap from './KakaoMiniMap';

export interface SpotDetailData {
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
  subInfo: { name: string; overview: string; image?: string }[];
}

interface Props { detail: SpotDetailData; }

export default function SpotDetail({ detail }: Props) {
  const [activeImage, setActiveImage] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);

  const allImages: { url: string; thumbnail?: string; name: string }[] = [
    ...(detail.mainImage ? [{ url: detail.mainImage, name: detail.title }] : []),
    ...detail.images.filter((img) => img.url !== detail.mainImage),
  ];

  const kakaoMapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(detail.title)},${detail.lat},${detail.lng}`;
  const telNumber = detail.tel ? detail.tel.replace(/[^0-9-]/g, '').split(',')[0]?.trim() : '';

  const needsFold = detail.overview.length > 400;

  return (
    <article className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0 lg:gap-8 max-w-5xl mx-auto lg:p-6">
      {/* ─── 좌: 이미지 갤러리 ─── */}
      <section className="lg:order-1" aria-label="이미지 갤러리">
        {allImages.length > 0 ? (
          <>
            <div className="relative aspect-[4/3] bg-surface-sunken overflow-hidden lg:rounded-lg">
              <Image
                key={allImages[activeImage]?.url}
                src={allImages[activeImage]?.url ?? ''}
                alt={allImages[activeImage]?.name || detail.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                unoptimized={allImages[activeImage]?.url.startsWith('http://')}
                priority
              />
              {allImages.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-ink-1/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  {activeImage + 1} / {allImages.length}
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-1.5 px-4 py-3 lg:px-0 overflow-x-auto" role="list">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`${i + 1}번째 이미지 보기`}
                    aria-pressed={activeImage === i}
                    className={`flex-shrink-0 relative w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                      activeImage === i ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={img.thumbnail ?? img.url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized={(img.thumbnail ?? img.url).startsWith('http://')}
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="relative aspect-[4/3] bg-surface-sunken flex items-center justify-center lg:rounded-lg">
            <ImageOff size={48} strokeWidth={1.5} className="text-ink-4" aria-hidden="true" />
          </div>
        )}
      </section>

      {/* ─── 우: 정보 섹션 ─── */}
      <section className="lg:order-2 px-5 py-5 lg:p-0" aria-label="장소 정보">
        <h1
          className="text-xl lg:text-2xl font-bold text-ink-1 break-keep"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {detail.title}
        </h1>

        {detail.addr && (
          <a
            href={kakaoMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-ink-3 hover:text-brand transition-colors"
          >
            <MapPin size={14} strokeWidth={1.75} className="flex-shrink-0" aria-hidden="true" />
            <span className="break-keep">{detail.addr}</span>
          </a>
        )}

        {/* ─── CTA 행 ─── */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            href={kakaoMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
          >
            <MapPin size={16} strokeWidth={2} />
            카카오맵
          </Link>
          {telNumber && (
            <a
              href={`tel:${telNumber}`}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold rounded-lg bg-transparent text-brand border border-brand hover:bg-brand-soft transition-colors"
            >
              <Phone size={16} strokeWidth={2} />
              전화
            </a>
          )}
          {detail.homepage && (
            <a
              href={detail.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold rounded-lg bg-transparent text-ink-2 hover:bg-surface-sunken transition-colors"
            >
              <Globe size={16} strokeWidth={2} />
              홈페이지
            </a>
          )}
        </div>

        {/* ─── 지도 미니뷰 ─── */}
        {detail.lat && detail.lng ? (
          <div className="mt-5">
            <KakaoMiniMap lat={detail.lat} lng={detail.lng} title={detail.title} />
          </div>
        ) : null}

        {/* ─── 상세 정보 ─── */}
        {detail.introFields.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink-2 mb-2">상세 정보</h2>
            <dl className="bg-surface-sunken rounded-lg overflow-hidden divide-y divide-line">
              {detail.introFields.map(({ label, value }) => (
                <div key={label} className="flex px-4 py-3 gap-3">
                  <dt className="text-xs font-semibold text-ink-4 w-16 flex-shrink-0 pt-0.5">{label}</dt>
                  <dd className="text-xs text-ink-2 break-keep leading-relaxed flex-1">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* ─── 소개 ─── */}
        {detail.overview && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink-2 mb-2">소개</h2>
            <p
              className={`text-sm text-ink-2 leading-relaxed break-keep whitespace-pre-line ${
                !showFullOverview && needsFold ? 'line-clamp-4' : ''
              }`}
            >
              {detail.overview}
            </p>
            {needsFold && (
              <button
                type="button"
                onClick={() => setShowFullOverview((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-brand font-semibold mt-2 hover:underline"
                aria-expanded={showFullOverview}
              >
                {showFullOverview ? '접기' : '더보기'}
                {showFullOverview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        )}

        {/* ─── 세부 정보 (코스·객실 등) ─── */}
        {detail.subInfo.length > 0 && (
          <div className="mt-6 mb-4">
            <h2 className="text-sm font-semibold text-ink-2 mb-3">세부 정보</h2>
            <ul className="space-y-3">
              {detail.subInfo.map((item, idx) => (
                <li key={idx} className="bg-surface-sunken rounded-lg overflow-hidden">
                  {item.image && (
                    <div className="relative w-full h-32 bg-surface-sunken">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                        unoptimized={item.image.startsWith('http://')}
                      />
                    </div>
                  )}
                  <div className="px-4 py-3">
                    {item.name && <p className="text-xs font-semibold text-ink-2 mb-1">{item.name}</p>}
                    {item.overview && (
                      <p className="text-xs text-ink-3 leading-relaxed break-keep whitespace-pre-line">
                        {item.overview.length > 150 ? `${item.overview.slice(0, 150)}...` : item.overview}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </article>
  );
}
