import { afterEach, describe, expect, it, vi } from 'vitest';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

afterEach(() => vi.unstubAllGlobals());
function bodyWithOverflow(overflow: string) {
  const body = { style: { overflow } };
  vi.stubGlobal('document', { body });
  return body;
}

describe('중첩 상세/사진 화면의 본문 스크롤 잠금', () => {
  it.each(['', 'auto', 'hidden'])('원래 overflow=%s 값을 보존한다', (overflow) => {
    const body = bodyWithOverflow(overflow);
    const unlock = lockBodyScroll();
    expect(body.style.overflow).toBe('hidden');
    unlock();
    expect(body.style.overflow).toBe(overflow);
  });

  it.each([true, false])('부모가 먼저 해제되는지(%s)와 관계없이 마지막에 복원한다', (parentFirst) => {
    const body = bodyWithOverflow('auto');
    const parent = lockBodyScroll();
    const child = lockBodyScroll();
    const [first, last] = parentFirst ? [parent, child] : [child, parent];
    first();
    expect(body.style.overflow).toBe('hidden');
    last();
    expect(body.style.overflow).toBe('auto');
  });

  it('중복 cleanup이 다른 모달의 잠금을 해제하지 않는다', () => {
    const body = bodyWithOverflow('');
    const first = lockBodyScroll();
    const last = lockBodyScroll();
    first();
    first();
    expect(body.style.overflow).toBe('hidden');
    last();
    expect(body.style.overflow).toBe('');
    const reopened = lockBodyScroll();
    expect(body.style.overflow).toBe('hidden');
    reopened();
    expect(body.style.overflow).toBe('');
  });
});
