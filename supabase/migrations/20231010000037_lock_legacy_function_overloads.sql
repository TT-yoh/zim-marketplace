-- 20231010000037_lock_legacy_function_overloads.sql
-- The live database carries extra overloads of ledger functions that were created outside the
-- repo's migrations (e.g. a 2-argument fulfill_marketplace_order with different parameter types).
-- Those still ran the old, unchecked logic and were callable by anon/authenticated clients.
-- This revokes client access to every overload except the hardened signatures from migration 035.

DO $$
DECLARE
    v_fn RECORD;
    v_allowed TEXT[] := ARRAY[
        'public.fulfill_marketplace_order(uuid,text,integer)',
        'public.release_escrow(uuid)',
        'public.vendor_purge_inventory(uuid)',
        'public.admin_delete_vendor_store(uuid)',
        'public.expire_stale_pending_orders(interval,interval)',
        'public.recompute_order_totals(uuid)',
        'public.purge_unsold_shop_listings(uuid)',
        'public.request_vendor_payout(integer,text,jsonb)',
        'public.admin_process_payout(uuid,text,text)'
    ];
BEGIN
    FOR v_fn IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'fulfill_marketplace_order', 'release_escrow', 'vendor_purge_inventory',
              'admin_delete_vendor_store', 'expire_stale_pending_orders', 'recompute_order_totals',
              'purge_unsold_shop_listings', 'request_vendor_payout', 'admin_process_payout'
          )
    LOOP
        -- regprocedure text omits "public." when public is on the search_path, so normalise both sides
        IF replace(replace(v_fn.sig::TEXT, 'public.', ''), ' ', '') <> ALL (
            SELECT replace(replace(a, 'public.', ''), ' ', '') FROM unnest(v_allowed) AS a
        ) THEN
            EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_fn.sig);
            RAISE NOTICE 'Locked legacy overload %', v_fn.sig;
        END IF;
    END LOOP;
END $$;
