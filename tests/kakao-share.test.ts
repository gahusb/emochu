import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import SaveShareBar from '@/app/components/course/result/SaveShareBar';

// Invoke the real event handlers without a DOM; never send a Kakao message or
// contact the keep API. Preserve hook state only to inspect clipboard fallback UI.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = initial;
      return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
    },
  };
});

type Element = ReactElement<Record<string, any>>;
function findElement(node: ReactNode, predicate: (element: Element) => boolean): Element | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
  }
  if (!isValidElement<Record<string, any>>(node)) return undefined;
  if (predicate(node)) return node;
  return findElement(node.props.children, predicate);
}
function render(shareUrl = '/course/qa-share-link') {
  hooks.cursor = 0;
  return SaveShareBar({
    shareUrl, slug: 'qa-share-link', title: '공유 회귀 테스트',
    editToken: 'test-only-owner-token',
  });
}
function click(tree: ReactNode, label: string) {
  const button = findElement(tree, (element) => element.props.children === label);
  expect(button).toBeDefined();
  return button!.props.onClick();
}

const origin = 'https://emochu.vercel.app';
const absoluteUrl = origin + '/course/qa-share-link';
const sendDefault = vi.fn();
const writeText = vi.fn();
const keepRequest = vi.fn();
beforeEach(() => {
  hooks.values = [];
  hooks.cursor = 0;
  vi.useFakeTimers();
  sendDefault.mockReset();
  writeText.mockReset().mockResolvedValue(undefined);
  keepRequest.mockReset().mockResolvedValue({ ok: true });
  vi.stubGlobal('window', {
    location: { origin },
    Kakao: { isInitialized: () => true, Share: { sendDefault } },
  });
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  vi.stubGlobal('fetch', keepRequest);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SaveShareBar course URL regression', () => {
  it.each(['/course/qa-share-link', absoluteUrl])(
    'uses a full course URL for both Kakao card and button on mobile and PC: %s',
    async (shareUrl) => {
      await click(render(shareUrl), '카카오톡 공유');
      expect(sendDefault).toHaveBeenCalledTimes(1);
      const payload = sendDefault.mock.calls[0][0];
      expect(payload.content.link).toEqual({ mobileWebUrl: absoluteUrl, webUrl: absoluteUrl });
      expect(payload.buttons).toEqual([
        { title: '코스 보기', link: { mobileWebUrl: absoluteUrl, webUrl: absoluteUrl } },
      ]);
      expect(JSON.stringify(payload)).not.toContain('test-only-owner-token');
      expect(writeText).not.toHaveBeenCalled();
    },
  );

  it('copies the full course URL instead of the API-relative path', async () => {
    await click(render(), '링크 복사');
    expect(writeText).toHaveBeenCalledExactlyOnceWith(absoluteUrl);
    expect(findElement(render(), (element) => element.props.children === '복사됨!')).toBeDefined();
  });

  it.each([undefined, { isInitialized: () => false }])(
    'copies the full URL when the Kakao SDK is unavailable or uninitialized',
    async (Kakao) => {
      vi.stubGlobal('window', { location: { origin }, Kakao });
      await click(render(), '카카오톡 공유');
      expect(sendDefault).not.toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledExactlyOnceWith(absoluteUrl);
    },
  );

  it('offers a selectable full URL when clipboard permission is denied', async () => {
    writeText.mockRejectedValueOnce(new Error('NotAllowedError'));
    await click(render(), '링크 복사');
    const input = findElement(render(), (element) => element.props['aria-label'] === '공유 주소');
    expect(input?.props.readOnly).toBe(true);
    expect(input?.props.value).toBe(absoluteUrl);
    const select = vi.fn();
    input!.props.onFocus({ target: { select } });
    expect(select).toHaveBeenCalledOnce();
    await click(render(), '링크 복사');
    expect(findElement(render(), (element) => element.props['aria-label'] === '공유 주소')).toBeUndefined();
  });

  it('still shares the full course URL when preservation fails', async () => {
    keepRequest.mockRejectedValueOnce(new Error('offline'));
    await click(render(), '카카오톡 공유');
    expect(sendDefault.mock.calls[0][0].buttons[0].link.mobileWebUrl).toBe(absoluteUrl);
  });

  it('does not access the browser origin during initial server rendering', () => {
    vi.stubGlobal('window', undefined);
    expect(() => render()).not.toThrow();
  });
});
