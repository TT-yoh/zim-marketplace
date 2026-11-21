// End-to-end tests against the LOCAL Supabase stack (never the live project).
// Prerequisite: `npm run local:start` (starts Supabase, loads supabase/seed.sql, writes client/.env.localdb).
// Run: `npm run test:e2e`
import { defineConfig, devices } from '@playwright/test';

const PORT = 5174;

export default defineConfig({
    testDir: './e2e',
    timeout: 45_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        // PW_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's own Chromium
        { name: 'desktop', use: { ...devices['Desktop Chrome'], ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) } },
    ],
    webServer: {
        command: `npm run dev:local --prefix client -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
