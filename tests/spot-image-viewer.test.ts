import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SpotDetail, { type SpotDetailData } from '@/app/components/spot/SpotDetail';
import SpotImageViewer from '@/app/components/spot/SpotImageViewer';

const detail: SpotDetailData = {
  contentId: 'qa-festival', contentTypeId: '15', title: '검증용 축제',
  addr: '', tel: '', homepage: '', overview: '', mainImage: '/qa/main.svg',
  images: [], lat: 0, lng: 0, introFields: [], subInfo: [],
};
const renderDetail = (overrides: Partial<SpotDetailData> = {}) => renderToStaticMarkup(
  createElement(SpotDetail, { detail: { ...detail, ...overrides } }),
);
const renderViewer = (images = [{ url: '/qa/original.svg', name: '세로 포스터' }], index = 0) => renderToStaticMarkup(
  createElement(SpotImageViewer, { images, index, title: detail.title, onClose: vi.fn(), onIndexChange: vi.fn() }),
);

describe('축제 상세 원본 사진 보기', () => {
  it('대표 사진 한 장도 전체 보기 버튼을 제공한다', () => {
    const html = renderDetail();
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('검증용 축제 1번째 사진 전체 보기');
    expect(html).not.toContain('<dialog');
  });

  it('사진이 없으면 실행할 수 없는 전체 보기 버튼을 만들지 않는다', () => {
    expect(renderDetail({ mainImage: '' })).not.toContain('aria-haspopup="dialog"');
  });

  it('빈 원본과 대표 사진 중복을 제외하고 빈 썸네일은 원본으로 대체한다', () => {
    const html = renderDetail({ images: [
      { url: '', thumbnail: '', name: '빈 이미지' },
      { url: '/qa/main.svg', thumbnail: '', name: '대표 중복' },
      { url: '/qa/poster.svg', thumbnail: '', name: '포스터' },
    ] });
    expect(html).toContain('2번째 이미지 전체 보기');
    expect(html).not.toContain('3번째 이미지 전체 보기');
    expect(html).toContain('src="/qa/poster.svg"');
    expect(html).not.toContain('src=""');
  });

  it('원본 주소를 그대로 사용하고 전체 비율로 표시한다', () => {
    const html = renderViewer();
    expect(html).toContain('src="/qa/original.svg"');
    expect(html).toContain('object-contain');
    expect(html).not.toContain('object-cover');
    expect(html).not.toContain('/_next/image');
    expect(html).toContain('href="/qa/original.svg"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('한 장일 때도 닫기와 원본 열기는 제공하고 이동 버튼은 숨긴다', () => {
    const html = renderViewer();
    expect(html).toContain('사진 전체 보기 닫기');
    expect(html).toContain('원본 이미지 새 탭에서 열기');
    expect(html).not.toContain('이전 사진');
    expect(html).not.toContain('다음 사진');
  });

  it('여러 장일 때 선택한 원본과 사진 이동 버튼을 표시한다', () => {
    const html = renderViewer([
      { url: '/qa/landscape.svg', name: '가로 사진' },
      { url: '/qa/portrait.svg', name: '세로 포스터' },
    ], 1);
    expect(html).toContain('src="/qa/portrait.svg"');
    expect(html).toContain('이전 사진');
    expect(html).toContain('다음 사진');
    expect(html).toContain('aria-live="polite"');
  });

  it('사진이 사라지거나 인덱스가 유효하지 않으면 빈 화면을 열지 않는다', () => {
    expect(renderViewer([])).toBe('');
    expect(renderViewer(undefined, 99)).toBe('');
  });
});
