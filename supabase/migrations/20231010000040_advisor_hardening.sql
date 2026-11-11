-- 20231010000040_advisor_hardening.sql
-- Fixes from the Supabase security advisor run on 2026-11-11:
-- 1. Drop the legacy fulfill_marketplace_order(uuid, varchar) overload (created outside the
--    repo, unchecked logic; already locked in 037). The webhook uses the 3-argument version.
-- 2. Remove API execute rights from trigger / event-trigger / internal helper functions.
--    Triggers still fire normally; these were never meant to be called via /rest/v1/rpc.
-- 3. Pin search_path on functions the advisor flagged as mutable.
-- is_platform_admin() and is_vendor_for_order() stay executable by signed-in users because
-- RLS policies call them as the requesting user; only anon access is removed.

DROP FUNCTION IF EXISTS public.fulfill_marketplace_order(UUID, CHARACTER VARYING);

DO $$
DECLARE
    v_sig TEXT;
BEGIN
    FOREACH v_sig IN ARRAY ARRAY[
        'public.after_order_item_insert()',
        'public.check_verified_purchase_review()',
        'public.enforce_order_insert_integrity()',
        'public.enforce_order_item_integrity()',
        'public.protect_buyer_verification_status()',
        'public.protect_order_item_updates()',
        'public.protect_product_featured_hero()',
        'public.protect_vendor_profile_privileges()',
        'public.rls_auto_enable()',
        'public.ledger_op_active()',
        'public.jsonb_cents(jsonb)'
    ]
    LOOP
        IF to_regprocedure(v_sig) IS NOT NULL THEN
            EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
        END IF;
    END LOOP;

    FOREACH v_sig IN ARRAY ARRAY[
        'public.is_platform_admin()',
        'public.is_vendor_for_order(uuid)'
    ]
    LOOP
        IF to_regprocedure(v_sig) IS NOT NULL THEN
            EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', v_sig);
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_sig);
        END IF;
    END LOOP;

    FOREACH v_sig IN ARRAY ARRAY[
        'public.protect_buyer_verification_status()',
        'public.protect_product_featured_hero()',
        'public.check_verified_purchase_review()',
        'public.ledger_op_active()',
        'public.jsonb_cents(jsonb)'
    ]
    LOOP
        IF to_regprocedure(v_sig) IS NOT NULL THEN
            EXECUTE format('ALTER FUNCTION %s SET search_path = public', v_sig);
        END IF;
    END LOOP;
END $$;
