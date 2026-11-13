// client/src/utils/pricing.js
// Single source of truth for what a buyer pays, mirroring the database trigger
// enforce_order_item_integrity (migration 035): a product's price_cents is its regular price,
// and a promotion only applies when is_promotion is on AND 0 < promo_discount_percent < 100.

// "$1,234.50": thousands separators make large prices readable
export function formatUsd(dollars) {
    const value = Number(dollars) || 0;
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getPromoPercent(product) {
    const pct = Number(product?.promo_discount_percent) || 0;
    return product?.is_promotion && pct > 0 && pct < 100 ? pct : 0;
}

export function hasActivePromo(product) {
    return getPromoPercent(product) > 0;
}

// Price actually charged at checkout, in cents
export function getEffectivePriceCents(product) {
    const regular = Number(product?.price_cents) || 0;
    const pct = getPromoPercent(product);
    return pct > 0 ? Math.round(regular * (1 - pct / 100)) : regular;
}

// Regular price to show crossed out, or null when there is no real promotion
export function getWasPriceCents(product) {
    return hasActivePromo(product) ? (Number(product?.price_cents) || 0) : null;
}
