// Local browser regression only. No production API, AI, or real festival data.
// Start Next on 3312 with NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3313
// and NEXT_PUBLIC_AUTH_ENABLED=false. Requires the existing local Playwright.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = 'http://127.0.0.1:3312';
const imageBase = 'http://127.0.0.1:3313/images';
const output = `.scratch-playwright/spot-images-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(output, { recursive: true });
const makeDetail = (kind = 'multiple') => ({
  contentId: 'qa-festival', contentTypeId: '15', title: '검증용 주말 축제 — 원본 포스터 전체 보기',
  addr: '검증용 주소', tel: '', homepage: '', overview: '모의 데이터이며 실제 관광정보가 아닙니다. '.repeat(50),
  mainImage: kind === 'empty' ? '' : `${imageBase}/landscape.svg`,
  images: kind === 'multiple' ? [
    { url: `${imageBase}/portrait.svg`, thumbnail: `${imageBase}/thumbnail.svg`, name: '세로 포스터 원본' },
    { url: `${imageBase}/missing.svg`, thumbnail: `${imageBase}/thumbnail.svg`, name: '로드 실패 확인' },
  ] : [], lat: 0, lng: 0, introFields: [{ label: '안내', value: '검증용 정보' }], subInfo: [],
});
let detail = makeDetail();
const metadata = createServer((req, res) => {
  if (req.url?.startsWith('/images/')) {
    if (req.url.endsWith('/missing.svg')) { res.writeHead(404); res.end(); return; }
    const portrait = req.url.endsWith('/portrait.svg');
    const width = portrait ? 600 : 1200;
    const height = portrait ? 1200 : 600;
    res.setHeader('content-type', 'image/svg+xml');
    res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#F2EBE0"/><rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="20" fill="#C5532D"/><g fill="white" text-anchor="middle" font-family="sans-serif"><text x="50%" y="80" font-size="40">TOP — ORIGINAL</text><text x="50%" y="50%" font-size="56">${portrait ? 'POSTER' : 'LANDSCAPE'}</text><text x="50%" y="${height - 40}" font-size="40">BOTTOM — FULL IMAGE</text></g></svg>`);
    return;
  }
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(detail));
});
await new Promise(resolve => metadata.listen(3313, '127.0.0.1', resolve));
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    detail = makeDetail();
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width < 768, reducedMotion: 'reduce', geolocation: { latitude: 37.5, longitude: 127 }, permissions: ['geolocation'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
      if (url.pathname === '/api/spot') return route.fulfill({ json: detail });
      if (url.pathname === '/api/festival') return route.fulfill({ json: {
        festivals: [{ contentId: detail.contentId, title: detail.title, addr1: '서울 검증용 주소', firstImage: detail.mainImage, eventStart: '20260101', eventEnd: '20261231', distanceKm: 1 }],
        dataStatus: 'available', weekendDates: { saturday: '20260912', sunday: '20260913' },
      } });
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
      return route.continue();
    });
    const viewer = () => page.getByRole('dialog', { name: `${detail.title} 사진 전체 보기`, exact: true });
    const sheet = () => page.getByRole('dialog', { name: '장소 상세', exact: true });
    const open = async (number) => {
      await page.getByRole('button', { name: `${detail.title} ${number}번째 사진 전체 보기`, exact: true }).click();
      await viewer().waitFor();
      assert.equal(await viewer().evaluate(el => el.matches(':modal')), true);
    };
    const photoReady = async () => {
      await viewer().locator('img').evaluate(image => image.decode());
      await page.waitForFunction(() => document.querySelector('dialog img')?.classList.contains('opacity-0') === false);
    };
    const capture = async (name) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const box = await viewer().boundingBox();
      assert.ok(box && Math.abs(box.width - width) <= 1 && box.height <= 844 && box.y >= 0, JSON.stringify(box));
      for (const button of await viewer().getByRole('button').all()) {
        const rect = await button.boundingBox();
        assert.ok(rect.width >= 44 && rect.height >= 44, '44px touch target');
      }
      await page.screenshot({ path: `${output}/${width}-${name}.png`, animations: 'disabled' });
      results.push({ width, name, fullscreen: true, overflow: false });
    };

    await page.goto(`${base}/festival`);
    await page.getByRole('link', { name: new RegExp('검증용 주말 축제') }).click();
    await sheet().waitFor();
    await open(1);
    await photoReady();
    assert.equal(await viewer().locator('img').getAttribute('src'), `${imageBase}/landscape.svg`);
    assert.equal(await viewer().locator('img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    assert.equal(await viewer().getByRole('button', { name: '사진 전체 보기 닫기' }).evaluate(el => el === document.activeElement), true);
    await capture('landscape');

    await viewer().getByRole('button', { name: '다음 사진' }).click();
    await photoReady();
    assert.equal(await viewer().locator('img').getAttribute('src'), `${imageBase}/portrait.svg`);
    assert.equal(await viewer().getByRole('link').getAttribute('href'), `${imageBase}/portrait.svg`);
    assert.equal(await viewer().getByRole('link').getAttribute('target'), '_blank');
    await capture('portrait');
    const popupOpened = context.waitForEvent('page');
    await viewer().getByRole('link').click();
    const popup = await popupOpened;
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(), `${imageBase}/portrait.svg`);
    assert.equal(await popup.evaluate(() => window.opener === null), true);
    await popup.close();
    // Native focus trap must not fall into the underlying detail sheet.
    await viewer().getByRole('link').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog[open]')), true);
    await viewer().getByRole('button', { name: '사진 전체 보기 닫기' }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog[open]')), true);

    const routeBeforeClose = page.url();
    await page.keyboard.press('Escape');
    await viewer().waitFor({ state: 'detached' });
    assert.equal(page.url(), routeBeforeClose, 'Escape closes viewer only');
    assert.equal(await sheet().isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-haspopup')), 'dialog');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden', 'sheet lock remains');

    // Thumbnail selection opens that original, not the small thumbnail URL.
    await page.getByRole('button', { name: '2번째 이미지 전체 보기', exact: true }).click();
    await viewer().waitFor();
    await photoReady();
    await page.keyboard.press('ArrowRight');
    await viewer().getByText('이미지를 불러오지 못했어요.', { exact: false }).waitFor();
    await capture('image-error');
    await page.keyboard.press('ArrowRight');
    await photoReady();
    assert.equal(await viewer().locator('img').getAttribute('src'), `${imageBase}/landscape.svg`, 'wrap to first');
    await page.keyboard.press('ArrowLeft');
    await viewer().getByText('이미지를 불러오지 못했어요.', { exact: false }).waitFor();
    await viewer().getByRole('button', { name: '이전 사진' }).click();
    await photoReady();
    await viewer().getByRole('button', { name: '사진 전체 보기 닫기' }).click();
    await viewer().waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('button', { name: '2번째 이미지 전체 보기', exact: true }).evaluate(el => el === document.activeElement), true);
    await sheet().getByRole('button', { name: '닫기', exact: true }).click();
    await sheet().waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'both locks restored');

    await page.getByRole('link', { name: new RegExp('검증용 주말 축제') }).click();
    await sheet().waitFor();
    await open(1);
    await page.goBack();
    await viewer().waitFor({ state: 'detached' });
    await sheet().waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'route unmount restores nested scroll locks');

    // The same component must work on a direct /spot URL outside a sheet.
    detail = makeDetail('single');
    await page.goto(`${base}/spot/qa-single`);
    await open(1);
    await photoReady();
    assert.equal(await viewer().getByRole('button', { name: '다음 사진' }).count(), 0);
    await capture('direct-single');
    await page.keyboard.press('Escape');
    await viewer().waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    detail = makeDetail('empty');
    await page.goto(`${base}/spot/qa-empty`);
    await page.getByRole('heading', { name: detail.title, exact: true }).waitFor();
    assert.equal(await page.getByRole('region', { name: '이미지 갤러리' }).locator('button[aria-haspopup="dialog"]').count(), 0);
    assert.deepEqual(errors, []);
    results.push({ width, name: 'interaction-flow', nestedEscape: true, focusRestored: true, keyboardNavigation: true, emptyGallery: true, pageErrors: 0 });
    await context.close();
  }
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.length, output, externalAPIs: 0, pageErrors: 0 }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => metadata.close(resolve));
}
