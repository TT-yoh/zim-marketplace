-- 20231010000038_exclude_test_payments_from_financials.sql
-- Mock payments (PAYMENT_MOCK_MODE in the initiate-payment edge function) settle orders in the
-- ISO 4217 test currency XTS. Keep that test money out of the clearinghouse summary.
-- XTS balances can never be withdrawn: request_vendor_payout only pays out USD.

CREATE OR REPLACE FUNCTION public.get_platform_financial_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_platform_cleared_cents BIGINT := 0;
    v_platform_pending_cents BIGINT := 0;
    v_vendor_escrow_float_cents BIGINT := 0;
    v_vendor_payable_cents BIGINT := 0;
    v_owner_sales_cents BIGINT := 0;
    v_pending_payouts_cents BIGINT := 0;
    v_test_orders_count BIGINT := 0;
    v_admin_ids UUID[];
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: platform admin only.';
    END IF;

    SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::UUID[]) INTO v_admin_ids FROM public.platform_admins;

    SELECT
        COALESCE(SUM(CASE WHEN status = 'cleared' THEN amount_cents ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'pending_escrow' THEN amount_cents ELSE 0 END), 0)
    INTO v_platform_cleared_cents, v_platform_pending_cents
    FROM public.platform_earnings
    WHERE currency <> 'XTS';

    SELECT
        COALESCE(SUM(escrow_balance_cents), 0),
        COALESCE(SUM(available_balance_cents), 0)
    INTO v_vendor_escrow_float_cents, v_vendor_payable_cents
    FROM public.vendor_balances
    WHERE shop_id <> ALL(v_admin_ids)
      AND currency <> 'XTS';

    SELECT COALESCE(SUM(oi.price_at_purchase_cents * oi.quantity), 0)
    INTO v_owner_sales_cents
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.status = 'paid'
      AND o.currency <> 'XTS'
      AND oi.shop_id = ANY(v_admin_ids);

    SELECT COALESCE(SUM(amount_cents), 0)
    INTO v_pending_payouts_cents
    FROM public.payout_requests
    WHERE status = 'pending';

    SELECT COUNT(*) INTO v_test_orders_count
    FROM public.orders
    WHERE currency = 'XTS';

    RETURN jsonb_build_object(
        'success', true,
        'platform_cleared_commission_cents', v_platform_cleared_cents,
        'platform_pending_commission_cents', v_platform_pending_cents,
        'vendor_escrow_float_cents', v_vendor_escrow_float_cents,
        'vendor_payable_cents', v_vendor_payable_cents,
        'owner_store_sales_cents', v_owner_sales_cents,
        'pending_payouts_cents', v_pending_payouts_cents,
        'test_orders_count', v_test_orders_count
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_platform_financial_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_financial_summary() TO authenticated;
