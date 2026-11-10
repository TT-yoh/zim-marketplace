-- 20231010000036_schedule_stale_order_expiry.sql
-- Enables pg_cron and runs expire_stale_pending_orders() (migration 035) every 15 minutes,
-- so unpaid orders release their reserved stock.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

GRANT USAGE ON SCHEMA cron TO postgres;

SELECT cron.schedule(
    'expire-stale-pending-orders',
    '*/15 * * * *',
    'SELECT public.expire_stale_pending_orders()'
);
