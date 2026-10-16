import { test, expect, type Page } from '@playwright/test';

declare global { interface Window { __analyticsAuth: { release: () => void; switch: (account: string) => void }; dataLayer?: any[]; [key: `ga-disable-${string}`]: boolean; } }
const campaign = 'source=meta&campaign=launch_202610&creative=a';
async function seed(page: Page, account: string, consent = 'accepted', delay = false) {
  await page.addInitScript(({ account, consent, delay }) => {
    localStorage.setItem('fixture_auth_account', account);
    localStorage.setItem('fixture_auth_delay', String(delay));
    localStorage.setItem('nipyeon_analytics_consent_v1', consent);
  }, { account, consent, delay });
}
const events = (page: Page) => page.evaluate(() => (window.dataLayer ?? []).map(item => Array.from(item)).filter(item => item[0] === 'event'));
const flag = (page: Page) => page.evaluate(() => window['ga-disable-G-ANALYTICSTEST']);
async function send(page: Page, props: Record<string, unknown> = {}) {
  await page.evaluate(async props => { const { sendGA4Event } = await import(String('/src/lib/ga4.ts')); sendGA4Event('vote_submit', props); }, props);
}
const consent = (page: Page, next: string) => page.evaluate(async next => { const { setAnalyticsConsent } = await import(String('/src/lib/analyticsConsent.ts')); setAnalyticsConsent(next); }, next);

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    // A local stub only. Never execute or contact a real Google/Supabase service.
    if (url.hostname === 'www.googletagmanager.com') return route.fulfill({ contentType: 'application/javascript', body: '/* isolated Google loader stub */' });
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/api/analytics/eligibility') return route.fulfill({ json: { eligible: route.request().headers().authorization === 'Bearer fixture:normal' }, headers: { 'Cache-Control': 'no-store' } });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
    if (url.pathname.startsWith('/fixture/rpc/')) return route.fulfill({ json: { data: [], error: null } });
    return route.continue();
  });
});

for (const path of ['/', '/landing.html']) {
  test(`${path} test-account restoration has no Google loader/events before or after the exclusion decision`, async ({ page }) => {
    await seed(page, 'test', 'accepted', true);
    await page.goto(`${path}?${campaign}`);
    await expect.poll(() => page.evaluate(() => !!window.__analyticsAuth)).toBe(true);
    await send(page); expect(await events(page)).toEqual([]);
    await expect(page.locator('script[data-ga4]')).toHaveCount(0); expect(await flag(page)).toBe(true);
    await page.evaluate(() => window.__analyticsAuth.release());
    await expect.poll(async () => page.evaluate(async () => { const { hasAnalyticsAccountEligibility } = await import(String('/src/lib/analyticsAccountState.ts')); return hasAnalyticsAccountEligibility(); })).toBe(false);
    await page.waitForTimeout(100); await send(page);
    await expect(page.locator('script[data-ga4]')).toHaveCount(0); expect(await events(page)).toEqual([]);
    await consent(page, 'refused'); await consent(page, 'accepted'); await send(page);
    expect(await flag(page)).toBe(true); expect(await events(page)).toEqual([]);
  });
}

test('normal account events are sanitized and same-tab account changes block the loaded tag immediately', async ({ page }) => {
  await seed(page, 'normal'); await page.goto(`/landing.html?${campaign}&email=PII_MARKER&token=CREDENTIAL_MARKER&utm_campaign=PRIVATE_MARKER`);
  await expect(page.locator('script[data-ga4]')).toHaveCount(1);
  await send(page, { email: 'PII_MARKER', token: 'CREDENTIAL_MARKER', page_location: 'https://private.invalid/?token=secret', campaign_code: 'PRIVATE_MARKER' });
  const before = await events(page); expect(before.length).toBeGreaterThan(0);
  const payload = JSON.stringify(before); expect(payload).not.toMatch(/PII_MARKER|CREDENTIAL_MARKER|PRIVATE_MARKER|private.invalid/);
  expect(before.at(-1)?.[2]).toMatchObject({ recruitment_source: 'meta', campaign_code: 'launch_202610', creative_code: 'a', page_location: 'http://127.0.0.1:4186/landing' });
  await page.evaluate(() => window.__analyticsAuth.switch('test')); expect(await flag(page)).toBe(true);
  await send(page); expect(await events(page)).toEqual([]);
  await consent(page, 'accepted'); expect(await flag(page)).toBe(true);
  await page.evaluate(() => window.__analyticsAuth.switch('guest'));
  await expect.poll(() => flag(page)).toBe(false); await send(page); expect((await events(page)).length).toBeGreaterThan(0);
  await page.evaluate(() => window.__analyticsAuth.switch('normal'));
  await expect.poll(() => flag(page)).toBe(false); await send(page); expect((await events(page)).length).toBeGreaterThan(0);
});

test('refusal remains respected after identity resolution and campaign storage is cleared on withdrawal', async ({ page }) => {
  await seed(page, 'normal', 'refused'); await page.goto(`/landing.html?${campaign}`);
  await send(page); await expect(page.locator('script[data-ga4]')).toHaveCount(0); expect(await events(page)).toEqual([]);
  await consent(page, 'accepted'); await expect(page.locator('script[data-ga4]')).toHaveCount(1);
  expect(await page.evaluate(() => sessionStorage.getItem('nipyeon_recruitment_source_v1'))).toContain('launch_202610');
  await consent(page, 'refused'); await send(page); expect(await flag(page)).toBe(true);
  expect(await page.evaluate(() => sessionStorage.getItem('nipyeon_recruitment_source_v1'))).toBe(null);
});

test('landing CTA preserves approved campaign/creative only and the app retains attribution', async ({ page }) => {
  await seed(page, 'guest'); await page.goto(`/landing.html?${campaign}&email=PII_MARKER&token=CREDENTIAL_MARKER`);
  const cta = page.locator('a[data-landing-cta="browse"]').first();
  await expect(cta).toHaveAttribute('href', '/?browse=1&source=meta&campaign=launch_202610&creative=a');
  await cta.click(); await expect(page).toHaveURL(/source=meta&campaign=launch_202610&creative=a/);
  await expect(page.locator('script[data-ga4]')).toHaveCount(1); await send(page);
  const payload = (await events(page)).at(-1)?.[2]; expect(payload).toMatchObject({ recruitment_source: 'meta', campaign_code: 'launch_202610', creative_code: 'a' });
  expect(JSON.stringify(payload)).not.toMatch(/PII_MARKER|CREDENTIAL_MARKER/);
});

test('late task outcomes from a blocked account are not replayed after logout', async ({ page }) => {
  await seed(page, 'test'); await page.goto('/landing.html');
  await page.evaluate(async () => { const { beginTask } = await import(String('/src/lib/taskAnalytics.ts')); (window as any).__pendingTask = beginTask('logout'); });
  await page.evaluate(() => window.__analyticsAuth.switch('guest'));
  await expect(page.locator('script[data-ga4]')).toHaveCount(1);
  await page.evaluate(() => (window as any).__pendingTask.finish('success'));
  expect((await events(page)).some(event => event[1] === 'operation_success')).toBe(false);
});
