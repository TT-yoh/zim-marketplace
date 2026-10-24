-- 20231010000023_vendor_slugs_and_shipping_settings.sql
-- Adds support for vendor custom store vanity slugs (e.g. /store/mms-autoparts)
-- and custom vendor shipping price rules, delivery zones, and free shipping thresholds.

-- 1. Add store_slug column to vendor_profiles
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS store_slug TEXT UNIQUE;

-- 2. Add shipping_settings JSONB column to vendor_profiles
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS shipping_settings JSONB DEFAULT '{
    "mode": "default",
    "flat_fee_cents": 300,
    "free_shipping_threshold_cents": null,
    "pickup_enabled": true,
    "custom_zones": {}
}'::jsonb;

-- 3. Populate existing store slugs from store_name if null
UPDATE public.vendor_profiles 
SET store_slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(store_name), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE store_slug IS NULL AND store_name IS NOT NULL;
