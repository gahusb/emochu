// Local-only UI regression. All API responses and Kakao failure are mocked.
// Start Next with NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3113, port 3112.
// Requires a locally available Playwright installation; does not install anything.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';

const base = 'http://localhost:3112';
const out = `.scratch-playwright/review-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(out, { recursive: true });
const stops = ['검증용 숲 산책길', '검증용 점심 식당', '검증용 아주 긴 이름의 주말 디저트 카페', '검증용 주말 공연'].map((title, i) => ({
  order: i + 1, contentId: `qa-${i}`, title, timeStart: ['10:00', '11:00', '12:10', '13:20'][i], durationMin: i === 0 || i === 3 ? 40 : 60,
  description: '화면 배치 확인을 위한 모의 장소예요. 실제 추천이나 관광정보가 아닙니다.', tip: '운영시간은 방문 전 확인해주세요.',
  latitude: 37.5 + i * 0.01, longitude: 127, imageUrl: '/hero/autumn-clear.png', isFestival: i === 3,
  role: ['attraction', 'restaurant', 'cafe'][i], contentTypeId: i === 3 ? '15' : i ? '39' : '12', source: 'tourapi',
  openStatus: i ? 'unknown' : 'open', tel: '02-1234-5678', day: 1,
  hoursStatus: ['unknown', 'within', 'outside', 'unknown'][i],
  accessibilityStatus: 'unverified', accessibilityNeeds: ['mobility'],
}));
const fixture = {
  courseId: 'qa-course', shareUrl: '/course/qa-review', persistence: 'saved', editToken: 'qa-not-a-real-token', kakaoNaviUrl: '',
  course: {
    title: '검증용 주말 코스 (모의 데이터)', summary: '모바일 일정·지도·편집 상태를 검증하는 화면입니다.', totalDistanceKm: 2.2,
    tip: '이 화면은 UI 검증용이며 공모전 실데이터 증빙이 아닙니다.', stops, generationMode: 'ai',
    verification: { visitDates: ['2026-09-13'], checkedAt: '2026-09-08T01:00:00Z', warnings: [
      '날씨 예보를 확인하지 못했어요. 출발 전 예보를 확인해주세요.',
      '누락된 식사를 관광정보의 음식점 후보로 보완했어요. 추가·변경된 장소와 운영시간을 확인해주세요.',
      '검증용 아주 긴 이름의 주말 디저트 카페: 제안 시간이 원본 운영시간·준비시간·입장/주문 마감과 맞지 않아요. 방문 시간을 조정해주세요.',
    ], adjustments: [
      { kind: 'festival_meal', day: 1, contentId: 'qa-1', previousContentId: 'qa-old-festival', previousTitle: '검증용 아주 긴 이름의 식사와 시간이 겹친 야간 공연' },
      { kind: 'shorter_leg', day: 1, contentId: 'qa-2', previousContentId: 'qa-old' },
      { kind: 'festival_timing', day: 1, contentId: 'qa-3' },
      { kind: 'budget_trim', day: 1, contentId: 'qa-2', previousContentId: 'qa-old-park', previousTitle: '검증용 일정 끝의 아주 긴 이름의 선택 관광 공원' },
      { kind: 'time_compacted', day: 1, contentId: 'qa-2' },
      { kind: 'meal_added', day: 1, contentId: 'qa-removed' },
      { kind: 'festival_timing', day: 1, contentId: 'qa-removed-festival' },
    ] },
    saju: { birthElement: 'metal', todayElement: 'fire', relation: 'controlled', headline: '여행일의 오행 테마', message: '취향을 우선하고 비슷한 후보에 작은 가산점을 더해요.', basisDate: '2026-09-13' },
  },
};
const weather = { saturday: { date: '20260912', sky: 'clear', precipitation: 'none', tempMin: 20, tempMax: 25, pop: 0, summary: '' }, sunday: { date: '20260913', sky: 'cloudy', precipitation: 'none', tempMin: 0, tempMax: 0, pop: 0, summary: '', unavailable: true }, recommendation: '', unavailable: false };
// Server-rendered metadata also stays local; no real course lookup/view counter.
const metadata = createServer((_req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(fixture)); });
await new Promise(resolve => metadata.listen(3113, '127.0.0.1', resolve));
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let result = structuredClone(fixture);
    let temporary = false;
    let sentRequest;
    let festivalMode = 'error';
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__qaCopied = text; } }, configurable: true });
    });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname === '/api/festival') {
        const rows = [{ contentId: 'qa-festival', title: '검증용 주말 문화 축제 — 긴 행사명 반응형 확인', addr1: '서울특별시 검증용 주소', eventStart: '20260912', eventEnd: '20260913', distanceKm: 1.2 }];
        return route.fulfill({ status: festivalMode === 'error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ festivals: festivalMode === 'empty' || festivalMode === 'error' ? [] : rows, dataStatus: festivalMode === 'error' ? 'unavailable' : festivalMode === 'partial' ? 'partial' : 'available', weekendDates: { saturday: '20260912', sunday: '20260913' } }) });
      }
      let data = {};
      if (url.pathname === '/api/home') data = { weather, festivals: [], recommended: [], weekendDates: { saturday: '20260912', sunday: '20260913' } };
      else if (url.pathname === '/api/course' && route.request().method() === 'POST') {
        sentRequest = route.request().postDataJSON();
        data = temporary ? { ...result, persistence: 'temporary', editToken: undefined } : result;
      } else if (url.pathname.endsWith('/alternatives')) data = { alternatives: [{ contentId: 'qa-new', title: '교체된 검증용 산책길', addr1: '검증용 주소', detourKm: 0.3 }] };
      else if (url.pathname === '/api/course/qa-review' && route.request().method() === 'PATCH') {
        result.course.stops[0] = { ...result.course.stops[0], title: '교체된 검증용 산책길', contentId: 'qa-new' };
        data = { course: result.course };
      } else if (url.pathname === '/api/course/qa-review') data = result;
      else if (url.pathname.includes('community')) data = { courses: [], hasMore: false };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const check = async name => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(() => document.fonts.ready);
      // 전체 페이지 캡처는 화면 아래의 lazy 이미지 로딩을 기다려주지 않는다.
      await page.locator('img').evaluateAll(async images => {
        images.forEach(img => { img.loading = 'eager'; });
        await Promise.all(images.map(img => img.decode().catch(() => {})));
      });
      const dimension = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
      assert.ok(dimension.document <= width, `${width}/${name} overflow: ${JSON.stringify(dimension)}`);
      await page.screenshot({ path: `${out}/${width}-${name}.png`, fullPage: true, animations: 'disabled' });
      results.push({ width, name, ...dimension });
    };
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.ok(!(await page.locator('meta[name="viewport"]').getAttribute('content')).includes('maximum-scale=1'), 'Browser zoom must not be disabled');
    await page.locator('#hero-heading').waitFor();
    await page.getByText(/^토요일 맑음 · 일요일 예보 미확인/).waitFor();
    await check('home');
    await page.goto(`${base}/festival`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: '축제 정보를 불러오지 못했어요', exact: true }).waitFor();
    await page.getByText('조회 미확인', { exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: '조건에 맞는 축제가 없어요', exact: true }).count(), 0);
    await check('festival-error');
    festivalMode = 'available';
    await page.getByRole('button', { name: '축제 다시 불러오기', exact: true }).click();
    await page.getByRole('heading', { name: /검증용 주말 문화 축제/ }).waitFor();
    for (const control of await page.getByRole('group', { name: '검색 반경' }).getByRole('button').all()) assert.ok((await control.boundingBox()).height >= 44);
    await check('festival-loaded');
    festivalMode = 'partial';
    await page.getByRole('button', { name: '30km', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '일부 조회 범위만 확인했어요' }).waitFor();
    await check('festival-partial');
    festivalMode = 'empty';
    await page.getByRole('button', { name: '100km', exact: true }).click();
    await page.getByRole('heading', { name: '조건에 맞는 축제가 없어요', exact: true }).waitFor();
    await check('festival-empty');
    await page.goto(`${base}/course`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /도시 선택/ }).click();
    await page.getByRole('button', { name: '서울', exact: true }).click();
    await page.getByRole('button', { name: /힐링이 필요해요/ }).click();
    await check('where');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByRole('button', { name: '내 기운 보기', exact: true }).click();
    await check('energy');
    await page.getByRole('button', { name: '이 기운으로 코스 짜기', exact: true }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByRole('button', { name: /반나절/ }).click();
    await page.getByRole('button', { name: '혼자', exact: true }).click();
    await page.getByRole('button', { name: '일요일', exact: true }).click();
    await check('when');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByRole('button', { name: '자연·산책', exact: true }).click();
    await page.getByRole('button', { name: /편하게 다니려면/ }).click();
    await page.getByRole('button', { name: '휠체어·보행 불편', exact: true }).click();
    await check('taste');
    await page.getByRole('button', { name: '코스 만들기', exact: true }).click();
    await page.waitForURL('**/course/qa-review');
    await page.getByRole('heading', { name: fixture.course.title }).waitFor();
    assert.equal(sentRequest.visitDay, 'sun');
    assert.deepEqual(sentRequest.accessibility, ['mobility']);
    await check('result');
    const evidence = page.getByRole('region', { name: '코스 정보 확인' });
    await evidence.getByText('제안 시간과 원문 운영구간 일치 1/4곳 · 운영시간 미확인 2곳 · 시간 불일치 1곳', { exact: true }).waitFor();
    const firstStop = page.getByRole('button', { name: /^1번째 코스: 검증용 숲 산책길/ });
    assert.ok((await firstStop.getAttribute('aria-label')).includes('정기 휴무일과 겹치지 않음, 운영시간 미확인'));
    await firstStop.getByText('운영시간 미확인 · 실제 운영·예약은 확인해주세요.', { exact: true }).waitFor();
    await evidence.getByText('1일차 · 축제 대신 식사 보완: 검증용 점심 식당 (이전 축제: 검증용 아주 긴 이름의 식사와 시간이 겹친 야간 공연)', { exact: true }).waitFor();
    await evidence.getByText('1일차 · 긴 이동 구간 보완: 검증용 아주 긴 이름의 주말 디저트 카페', { exact: true }).waitFor();
    await evidence.getByText('1일차 · 공연 시간 보완: 검증용 주말 공연', { exact: true }).waitFor();
    await evidence.getByText('1일차 · 시간 예산 보완: 검증용 일정 끝의 아주 긴 이름의 선택 관광 공원 제외', { exact: true }).waitFor();
    await evidence.getByText('1일차 · 대기 간격 보완: 검증용 아주 긴 이름의 주말 디저트 카페', { exact: true }).waitFor();
    assert.equal(await evidence.locator('li').filter({ hasText: '식사 보완:' }).count(), 1, '삭제된 장소는 보완 목록에서 숨김');
    assert.equal(await evidence.locator('li').filter({ hasText: '공연 시간 보완:' }).count(), 1, '삭제된 공연은 보완 목록에서 숨김');
    await evidence.getByText('확인할 내용 3개 보기', { exact: true }).click();
    await check('evidence-expanded');
    // 전체 페이지 캡처의 고정 탭바에 가려지지 않게 보완 사유 영역을 별도로 육안 확인한다.
    // 상세 캡처만 높이를 늘려 고정 내비 사이에 둔다. 전체 상태 검사는 원래 900px 높이다.
    await page.setViewportSize({ width, height: Math.max(900, Math.ceil((await evidence.boundingBox()).height) + 200) });
    await evidence.evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 80));
    await evidence.screenshot({ path: `${out}/${width}-evidence-detail.png` });
    if (width === 320 || width === 1440) {
      await firstStop.evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 80));
      await firstStop.screenshot({ path: `${out}/${width}-hours-detail.png` });
    }
    await page.setViewportSize({ width, height: 900 });
    for (const control of await page.getByRole('link', { name: /검증용.*(길찾기|전화)/ }).all()) {
      assert.ok((await control.boundingBox()).height >= 44);
    }
    if (width < 1024) {
      await page.getByRole('button', { name: '지도 보기', exact: true }).click();
      await page.getByText('지도를 불러오지 못했어요.', { exact: true }).filter({ visible: true }).waitFor({ timeout: 12_000 });
      await check('map-failure');
      await page.getByRole('button', { name: '일정 보기', exact: true }).click();
    } else {
      await page.getByText('지도를 불러오지 못했어요.', { exact: true }).filter({ visible: true }).waitFor({ timeout: 12_000 });
      await check('map-failure');
    }
    await page.getByRole('button', { name: '검증용 숲 산책길 다른 곳으로 바꾸기', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await check('replace');
    await page.getByRole('dialog').getByRole('button', { name: '닫기', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('dialog').getByRole('button', { name: '닫기', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: '검증용 숲 산책길 다른 곳으로 바꾸기', exact: true }).click();
    await page.getByRole('button', { name: /교체된 검증용 산책길/ }).click();
    await page.getByRole('heading', { name: '교체된 검증용 산책길' }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: '교체된 검증용 산책길' }).waitFor();
    await page.getByRole('button', { name: '링크 복사', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__qaCopied), `${base}/course/qa-review`);
    // 임시 결과는 공유·B 생성·편집 버튼을 보여주지 않는다.
    temporary = true;
    await page.evaluate(data => sessionStorage.setItem('weekendCourse', JSON.stringify({ ...data, persistence: 'temporary', editToken: undefined })), result);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(/서버에 저장하지 못했어요/).waitFor();
    assert.equal(await page.getByRole('button', { name: '링크 복사', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /다른 곳으로 바꾸기/ }).count(), 0);
    await check('temporary');
    assert.deepEqual(errors, [], `Browser exceptions at ${width}px`);
    await context.close();
    console.log(`PASS ${width}px: wizard → result → map failure → edit → reload → absolute share → temporary`);
  }
  writeFileSync(`${out}/report.json`, JSON.stringify({ type: 'mocked-local-ui', results }, null, 2));
} finally {
  await browser.close();
  // Next의 메타데이터 keep-alive가 남아도 검증기의 종료가 무기한 대기하지 않는다.
  metadata.closeAllConnections();
  await new Promise(resolve => metadata.close(resolve));
}
