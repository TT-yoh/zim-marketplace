-- 20231010000021_drop_global_purge_rpc.sql
-- Removes global platform wipe procedures to prevent accidental platform-wide data loss.
-- Only vendor-specific single-store purges (vendor_purge_inventory) and individual product deletions are permitted.

DROP FUNCTION IF EXISTS public.admin_purge_all_products();
DROP FUNCTION IF EXISTS public.admin_purge_all_orders();
