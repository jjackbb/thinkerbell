import { test, expect } from '@playwright/test';
const emailOwnership = process.env.PRIVACY_EMAIL_CHECK_ENABLED === 'true';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.goto('/privacy.html');
});

test('shared draft is explicitly incomplete and creates no consent requirement', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '개인정보처리방침 검토 초안' })).toBeVisible();
  await expect(page.getByText('변종현 (개인 운영자)', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ds5305naver@gmail.com' })).toHaveAttribute('href', 'mailto:ds5305naver@gmail.com');
  await page.getByRole('button', { name: '거부', exact: true }).click();
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  await page.getByRole('button', { name: '가입 화면 검토하기' }).click();
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  await expect(page.getByText('최소 이용 연령을 만 18세 이상으로 변경하기로 했습니다.', { exact: false }).last()).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  if (emailOwnership) await expect(page.locator('#signup-check-email')).toBeVisible();
  else await expect(page.getByRole('button', { name: '니편내편 시작하기' })).toBeVisible();
  await page.getByRole('button', { name: '개인정보 처리 안내 보기' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect(modal.locator('[data-privacy-version]')).toHaveAttribute('data-privacy-version', '2026-10-13.review-1');
  await expect(modal.getByRole('heading', { name: '개인정보 처리 안내 검토' })).toBeFocused();
  await expect(modal.getByText('게시 전 확인이 필요한 사항')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('button', { name: '개인정보 처리 안내 보기' })).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storage);
});

test('focus containment, close, Back and repeated opening preserve signup fields', async ({ page }) => {
  await page.getByRole('button', { name: '가입 화면 검토하기' }).click();
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  const email = emailOwnership ? page.locator('#signup-check-email') : page.locator('input[type=email]');
  await email.fill('draft@example.invalid');
  const trigger = page.getByRole('button', { name: '개인정보 처리 안내 보기' });
  await trigger.click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: '안내 닫기' }).focus();
  await page.keyboard.press('Tab');
  expect(await modal.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await modal.getByRole('button', { name: '안내 닫기' }).click();
  await expect(modal).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(history.state?.privacyDraft))).toBe(false);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.goBack();
  await expect(modal).not.toBeVisible();
  await expect(email).toHaveValue('draft@example.invalid');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(modal).toBeVisible();
  expect(await modal.evaluate(node => node.getBoundingClientRect().width <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '로그인 없이 둘러보기' }).click();
  await expect(page.getByRole('heading', { name: '개인정보처리방침 검토 초안' })).toBeVisible();
});

test('initially-open StrictMode modal creates only one history entry', async ({ page }) => {
  await page.goto('/privacy.html?initialNotice');
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(history.state?.privacyDraft))).toBe(true);
  await page.goBack();
  await expect(modal).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(history.state?.privacyDraft))).toBe(false);
  await expect(page).toHaveURL(/privacy\.html\?initialNotice$/);
});
