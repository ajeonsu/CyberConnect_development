import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 1 smoke config for verifying a deployed Vercel Preview.
 *
 * The target URL is provided at runtime via PREVIEW_URL (set by the
 * pr-preview-smoke workflow). No web server is started here; we only visit an
 * already-deployed, black-box Preview URL.
 *
 * Security notes:
 * - `trace`/`video` are disabled so that request headers (which may include a
 *   Vercel protection-bypass token in the future) are never recorded into the
 *   HTML report or artifacts.
 * - The optional bypass header is only attached when
 *   VERCEL_AUTOMATION_BYPASS_SECRET is set; its value is never logged.
 */

const previewUrl = process.env.PREVIEW_URL;
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const extraHTTPHeaders = bypassSecret
  ? {
      'x-vercel-protection-bypass': bypassSecret,
      'x-vercel-set-bypass-cookie': 'true',
    }
  : undefined;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 30_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: previewUrl,
    // Keep tracing/video off so no request headers land in artifacts.
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    ...(extraHTTPHeaders ? { extraHTTPHeaders } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
