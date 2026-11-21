// Shared helpers for the E2E tests. Accounts come from supabase/seed.sql (local stack only).
import { expect } from '@playwright/test';

export const PASSWORD = 'zimmarket-local-dev';
export const ACCOUNTS = {
    admin: 'admin@zimmarket.local',
    buyer: 'buyer@zimmarket.local',
    vendor: 'vendor@zimmarket.local',
};

export async function signIn(page, who) {
    await page.goto('/');
    await page.getByRole('button', { name: /^Sign In$/ }).first().click();
    await page.getByPlaceholder('you@example.com').fill(ACCOUNTS[who]);
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByRole('button', { name: /Sign In to ZimMarket/ }).click();
    await expect(page.getByRole('button', { name: /Sign Out/i }).first()).toBeAttached({ timeout: 15_000 });
}
