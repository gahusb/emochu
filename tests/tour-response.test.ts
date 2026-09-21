import { afterEach, expect, it, vi } from 'vitest';
import { searchFestival } from '@/lib/tour-api';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it.each([{ response: { header: { resultCode: '22', resultMsg: 'private-fixture' }, body: { items: '' } } }, { response: { header: { resultCode: '0000' } } }])('HTTP 200의 기관 오류·잘못된 응답을 빈 결과로 숨기지 않는다', async body => {
  vi.stubEnv('TOUR_API_KEY', 'test'); vi.stubGlobal('fetch', vi.fn(async () => Response.json(body)));
  await expect(searchFestival({ eventStartDate: '20260912', eventEndDate: '20260913' })).rejects.toThrow(/응답/);
});
it('정상 0건은 빈 목록이다', async () => {
  vi.stubEnv('TOUR_API_KEY', 'test'); vi.stubGlobal('fetch', vi.fn(async () => Response.json({ response: { header: { resultCode: '0000' }, body: { items: '', totalCount: 0 } } })));
  expect(await searchFestival({ eventStartDate: '20260912', eventEndDate: '20260913' })).toEqual([]);
});
