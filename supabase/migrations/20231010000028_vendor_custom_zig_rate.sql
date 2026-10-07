-- 20231010000028_vendor_custom_zig_rate.sql
-- Enables store owners to set their own custom ZiG currency exchange rate or follow the official RBZ interbank rate.

ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS custom_zig_rate NUMERIC;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS use_custom_rate BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.vendor_profiles.custom_zig_rate IS 'Custom exchange rate (ZiG per 1 USD) configured by the store owner';
COMMENT ON COLUMN public.vendor_profiles.use_custom_rate IS 'True if store owner uses custom rate, false if following official RBZ interbank rate';
