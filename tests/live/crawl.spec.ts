import { expect, test } from '@playwright/test';

// Checks the deployed Cloudflare Pages site: status codes, edge headers, a real
// 404, the JSON /health endpoint and cache headers on hashed assets (the edge
// config from public/_headers, public/404.html and functions/health.js).

test('live crawl: / answers 200 with HSTS and nosniff', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBe(200);
  expect(res.headers()['strict-transport-security']).toBeTruthy();
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  expect(res.headers()['content-type']).toContain('text/html');
});

test('live crawl: an unknown path is a real 404, not the SPA shell', async ({ request }) => {
  const res = await request.get('/qa-junk-path');
  expect(res.status()).toBe(404);
});

test('live crawl: /health is JSON', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  await expect(res.json()).resolves.toBeTruthy();
});

test('live crawl: hashed assets are served immutable', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const asset = html.match(/\/assets\/[^"']+\.js/)?.[0];
  expect(asset, 'index.html references a hashed /assets/*.js').toBeTruthy();
  const res = await request.get(asset as string);
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toContain('immutable');
});

test('live crawl: the landing page loads without console or page errors', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

  const res = await page.goto('/', { waitUntil: 'load' });
  expect(res?.status()).toBe(200);
  await page.waitForLoadState('networkidle').catch(() => {});
  expect(problems).toEqual([]);
});
