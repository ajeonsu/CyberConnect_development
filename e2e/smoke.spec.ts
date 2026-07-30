import { test, expect } from '@playwright/test';

/**
 * Phase 1 Vercel Preview smoke test.
 *
 * Verifies only that the public /login screen renders. No login, account
 * creation, or any authenticated flow is performed. The target is provided via
 * the PREVIEW_URL environment variable; the test is skipped when it is absent
 * (e.g. a local run without a running server).
 */

const previewUrl = process.env.PREVIEW_URL;

test('login screen renders on the Vercel Preview', async ({ page }) => {
  test.skip(!previewUrl, 'PREVIEW_URL is not set; skipping preview smoke test.');

  const base = previewUrl!.replace(/\/+$/, '');
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', { name: 'CyberConnect Platform' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  // Always capture a screenshot of the login screen (kept in test-results/).
  await page.screenshot({ path: 'test-results/login.png', fullPage: true });
});
