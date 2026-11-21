// Core journeys against the local stack and its seed data (supabase/seed.sql).
import { test, expect } from '@playwright/test';
import { signIn } from './helpers.mjs';

test.describe('guest', () => {
    test('can browse the shop and read the policies without an account', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: /ZimMarket/ }).first()).toBeVisible();
        // Seeded products are listed
        await expect(page.getByText('Cordless Drill 18V').filter({ visible: true }).first()).toBeVisible();

        const footer = page.locator('footer.site-footer');
        await footer.getByRole('button', { name: 'Refunds & Escrow' }).click();
        await expect(page).toHaveURL(/\/refunds$/);
        await expect(page.getByRole('heading', { name: 'Refunds & Escrow', level: 1 })).toBeVisible();
        await expect(page.getByText(/7 days after the item was marked as shipped/)).toBeVisible();

        await page.goto('/privacy');
        await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
    });

    test('is asked to sign in when opening My Orders', async ({ page }) => {
        await page.goto('/orders');
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    });
});

test.describe('buyer', () => {
    test('sees the paid seed order with escrow information', async ({ page }) => {
        await signIn(page, 'buyer');
        await page.goto('/orders');
        await expect(page.getByRole('heading', { name: 'My Orders' })).toBeVisible();
        await page.getByRole('button', { name: /View Items/ }).first().click();
        await expect(page.getByText('Cordless Drill 18V').filter({ visible: true }).first()).toBeVisible();
        // Shipped items show either the auto-release date or the problem-reported notice
        await expect(page.getByText(/automatically on|Problem reported/).filter({ visible: true }).first()).toBeVisible();
    });

    test('has a notification bell', async ({ page }) => {
        await signIn(page, 'buyer');
        const bell = page.getByRole('button', { name: /^Notifications/ });
        await expect(bell).toBeVisible();
        await bell.click();
        await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
    });
});

test.describe('vendor', () => {
    test('sees paid orders to fulfil', async ({ page }) => {
        await signIn(page, 'vendor');
        await page.goto('/vendor/orders');
        await expect(page.getByRole('heading', { name: 'Order Fulfillment' })).toBeVisible();
        await page.getByRole('button', { name: /View Items/ }).filter({ visible: true }).first().click();
        await expect(page.getByText(/PVC Pipe 6m|Cordless Drill 18V/).filter({ visible: true }).first()).toBeVisible();
    });
});

test.describe('admin', () => {
    test('must pass two-factor sign-in before the admin dashboard opens', async ({ page }) => {
        await signIn(page, 'admin');
        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: /Admin two-factor sign-in/ })).toBeVisible();
        await expect(page.getByText('Platform Admin')).toHaveCount(0);
    });
});
