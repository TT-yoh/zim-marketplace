-- 20231010000051_admin_confirmed_escrow_release.sql
-- Escrow is no longer released automatically. ZimMarket holds the buyers' money, so a platform
-- admin now confirms every release that the buyer didn't confirm themselves:
--   - The buyer pressing "I received my order" still releases immediately (unchanged).
--   - 7 days after shipping with no confirmation and no reported problem, the item becomes
--     "due for release". Admins are notified and release it from Admin -> Escrow
--     (release_escrow, which admins may call). Nothing moves without that click.
-- Replaces the hourly auto-release job from migration 046.

-- 1. Stop and remove the auto-release job and function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- dynamic SQL: cron.job doesn't exist (and can't be parsed) where pg_cron isn't installed
        EXECUTE 'SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = ''auto-release-shipped-escrow''';
    END IF;
END $$;

DROP FUNCTION IF EXISTS public.auto_release_shipped_escrow(INTERVAL);

-- 2. Remember which due items admins were already told about (one alert per item)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS release_due_notified_at TIMESTAMP WITH TIME ZONE;

-- The escrow-field guard (046) must also keep this column out of client hands
CREATE OR REPLACE FUNCTION public.guard_order_item_escrow_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.ledger_op_active() THEN
        RETURN NEW;
    END IF;

    NEW.shipped_at := OLD.shipped_at;
    NEW.disputed_at := OLD.disputed_at;
    NEW.dispute_reason := OLD.dispute_reason;
    NEW.auto_released := OLD.auto_released;
    NEW.release_due_notified_at := OLD.release_due_notified_at;

    IF NEW.status = 'shipped' AND OLD.status IS DISTINCT FROM 'shipped' THEN
        NEW.shipped_at := timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Hourly: tell admins about items that became due for release (no money moves)
CREATE OR REPLACE FUNCTION public.notify_escrow_due_for_release(p_after INTERVAL DEFAULT INTERVAL '7 days')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ids UUID[];
    v_count INTEGER;
BEGIN
    SELECT COALESCE(array_agg(oi.id), ARRAY[]::UUID[]) INTO v_ids
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.status = 'shipped'
      AND oi.disputed_at IS NULL
      AND oi.release_due_notified_at IS NULL
      AND oi.shipped_at < now() - p_after
      AND o.status = 'paid';

    v_count := COALESCE(array_length(v_ids, 1), 0);
    IF v_count = 0 THEN
        RETURN 0;
    END IF;

    PERFORM set_config('zimmarket.ledger_op', 'on', true);
    UPDATE public.order_items SET release_due_notified_at = timezone('utc'::text, now())
    WHERE id = ANY(v_ids);
    PERFORM set_config('zimmarket.ledger_op', 'off', true);

    PERFORM public.notify_admins('escrow_due',
        v_count || ' escrow item(s) ready for release',
        'Shipped over 7 days ago with no problem reported and no buyer confirmation. Review and release them in Admin → Escrow.',
        'admin');

    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_escrow_due_for_release(INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_escrow_due_for_release(INTERVAL) TO service_role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'notify-escrow-due-for-release',
            '7 * * * *',
            'SELECT public.notify_escrow_due_for_release()'
        );
    END IF;
END $$;
