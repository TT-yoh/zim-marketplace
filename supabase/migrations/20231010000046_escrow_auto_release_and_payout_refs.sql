-- 20231010000046_escrow_auto_release_and_payout_refs.sql
-- 1. Escrow auto-release: a shipped item's money moves to the vendor 7 days after shipping
--    unless the buyer has reported a problem. Buyers who never press "Confirm delivery"
--    no longer leave vendors' money stuck in escrow forever.
--    - order_items.shipped_at is stamped when the vendor marks the item shipped.
--    - Buyers report a problem with report_order_item_problem(); that holds the money until an
--      admin releases or refunds it.
--    - auto_release_shipped_escrow() runs hourly via pg_cron.
-- 2. Payouts: "Mark as paid" now needs the EcoCash / bank transaction reference, stored in
--    payout_requests.payout_reference so vendor and admin can both trace the transfer.

-- ============================================================================
-- 1a. COLUMNS
-- ============================================================================
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS auto_released BOOLEAN NOT NULL DEFAULT false;

-- Items already shipped get a full 7-day window from today
UPDATE public.order_items SET shipped_at = timezone('utc'::text, now())
WHERE status = 'shipped' AND shipped_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_shipped_open
    ON public.order_items(shipped_at) WHERE status = 'shipped';

-- ============================================================================
-- 1b. STAMP shipped_at; KEEP THE ESCROW FIELDS OUT OF CLIENT HANDS
-- ============================================================================
-- Vendors can update their order items (to mark them shipped). Without this guard a vendor
-- could back-date shipped_at or clear a buyer's dispute to get paid early.
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

    IF NEW.status = 'shipped' AND OLD.status IS DISTINCT FROM 'shipped' THEN
        NEW.shipped_at := timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_item_escrow_fields ON public.order_items;
CREATE TRIGGER trg_guard_order_item_escrow_fields
BEFORE UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.guard_order_item_escrow_fields();

-- ============================================================================
-- 1c. RELEASE LOGIC SPLIT INTO AN INTERNAL FUNCTION (shared by buyer, admin and the job)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_escrow_internal(p_item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item RECORD;
    v_rate NUMERIC(5, 2);
    v_total INTEGER;
    v_vendor_cut INTEGER;
    v_ship_shop UUID;
    v_open_items BOOLEAN;
BEGIN
    SELECT oi.id, oi.order_id, oi.shop_id, oi.price_at_purchase_cents, oi.quantity, oi.status,
           oi.vendor_net_cents,
           o.buyer_id, o.status AS order_status, COALESCE(o.currency, 'USD') AS currency,
           COALESCE(o.shipping_fee_cents, 0) AS shipping_fee_cents,
           COALESCE(o.shipping_fee_released, false) AS shipping_released,
           o.shipping_shop_id
    INTO v_item
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = p_item_id
    FOR UPDATE OF oi, o;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;

    IF v_item.order_status IS DISTINCT FROM 'paid' THEN
        RAISE EXCEPTION 'Cannot release escrow: order has not been paid.';
    END IF;

    IF v_item.status = 'delivered' THEN
        RAISE EXCEPTION 'Escrow already released for this item';
    END IF;

    IF v_item.status NOT IN ('pending', 'shipped') THEN
        RAISE EXCEPTION 'Cannot release escrow for an item with status %.', v_item.status;
    END IF;

    -- Commission snapshot taken at payment; legacy items fall back to the live rate
    IF v_item.vendor_net_cents IS NOT NULL THEN
        v_vendor_cut := v_item.vendor_net_cents;
    ELSE
        IF EXISTS (SELECT 1 FROM public.platform_admins WHERE id = v_item.shop_id) THEN
            v_rate := 0.00;
        ELSE
            SELECT COALESCE(commission_rate_percent, 10.00) INTO v_rate
            FROM public.vendor_profiles WHERE id = v_item.shop_id;
            v_rate := LEAST(100.00, GREATEST(0.00, COALESCE(v_rate, 10.00)));
        END IF;
        v_total := v_item.price_at_purchase_cents * v_item.quantity;
        v_vendor_cut := v_total - ROUND(v_total * (v_rate / 100.0))::INTEGER;
    END IF;

    PERFORM set_config('zimmarket.ledger_op', 'on', true);

    UPDATE public.order_items SET status = 'delivered' WHERE id = p_item_id;

    INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
    VALUES (v_item.shop_id, v_item.currency, v_vendor_cut, 0)
    ON CONFLICT (shop_id, currency)
    DO UPDATE SET
        available_balance_cents = public.vendor_balances.available_balance_cents + v_vendor_cut,
        escrow_balance_cents = GREATEST(0, public.vendor_balances.escrow_balance_cents - v_vendor_cut),
        updated_at = timezone('utc'::text, now());

    UPDATE public.platform_earnings
    SET status = 'cleared', cleared_at = timezone('utc'::text, now())
    WHERE order_item_id = p_item_id AND status = 'pending_escrow';

    -- Release shipping to the shop that was credited for it, once no item is still open
    IF v_item.shipping_fee_cents > 0 AND NOT v_item.shipping_released THEN
        SELECT EXISTS (
            SELECT 1 FROM public.order_items
            WHERE order_id = v_item.order_id AND status NOT IN ('delivered', 'refunded')
        ) INTO v_open_items;

        IF NOT v_open_items THEN
            v_ship_shop := COALESCE(v_item.shipping_shop_id, v_item.shop_id);

            INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
            VALUES (v_ship_shop, v_item.currency, v_item.shipping_fee_cents, 0)
            ON CONFLICT (shop_id, currency)
            DO UPDATE SET
                available_balance_cents = public.vendor_balances.available_balance_cents + v_item.shipping_fee_cents,
                escrow_balance_cents = GREATEST(0, public.vendor_balances.escrow_balance_cents - v_item.shipping_fee_cents),
                updated_at = timezone('utc'::text, now());

            UPDATE public.orders SET shipping_fee_released = true WHERE id = v_item.order_id;
        END IF;
    END IF;

    PERFORM set_config('zimmarket.ledger_op', 'off', true);
END;
$$;

-- Public entry point: the buyer confirms delivery, or an admin releases (e.g. resolving a dispute)
CREATE OR REPLACE FUNCTION public.release_escrow(p_item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_buyer UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT o.buyer_id INTO v_buyer
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = p_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;

    IF v_buyer IS DISTINCT FROM auth.uid() AND NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only the buyer can confirm delivery';
    END IF;

    PERFORM public.release_escrow_internal(p_item_id);
END;
$$;

-- ============================================================================
-- 1d. BUYER REPORTS A PROBLEM (holds the money for admin review)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.report_order_item_problem(p_item_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'Please describe the problem (at least 5 characters).';
    END IF;

    SELECT oi.status, oi.disputed_at, o.buyer_id, o.status AS order_status
    INTO v_item
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = p_item_id
    FOR UPDATE OF oi;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;
    IF v_item.buyer_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: only the buyer can report a problem with this item.';
    END IF;
    IF v_item.order_status IS DISTINCT FROM 'paid' OR v_item.status NOT IN ('pending', 'shipped') THEN
        RAISE EXCEPTION 'This item can no longer be disputed (status %).', v_item.status;
    END IF;
    IF v_item.disputed_at IS NOT NULL THEN
        RAISE EXCEPTION 'A problem has already been reported for this item.';
    END IF;

    PERFORM set_config('zimmarket.ledger_op', 'on', true);
    UPDATE public.order_items
    SET disputed_at = timezone('utc'::text, now()),
        dispute_reason = left(trim(p_reason), 1000)
    WHERE id = p_item_id;
    PERFORM set_config('zimmarket.ledger_op', 'off', true);
END;
$$;

-- ============================================================================
-- 1e. AUTO-RELEASE JOB
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_release_shipped_escrow(p_after INTERVAL DEFAULT INTERVAL '7 days')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_count INTEGER := 0;
BEGIN
    FOR v_id IN
        SELECT oi.id
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.status = 'shipped'
          AND oi.disputed_at IS NULL
          AND oi.shipped_at IS NOT NULL
          AND oi.shipped_at < now() - p_after
          AND o.status = 'paid'
        ORDER BY oi.shipped_at
        LIMIT 500
    LOOP
        BEGIN
            PERFORM public.release_escrow_internal(v_id);
            PERFORM set_config('zimmarket.ledger_op', 'on', true);
            UPDATE public.order_items SET auto_released = true WHERE id = v_id;
            PERFORM set_config('zimmarket.ledger_op', 'off', true);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- One bad item must not block the rest; it stays shipped and is retried next run
            RAISE WARNING 'auto_release_shipped_escrow: item % skipped: %', v_id, SQLERRM;
        END;
    END LOOP;
    RETURN v_count;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'auto-release-shipped-escrow',
            '7 * * * *',
            'SELECT public.auto_release_shipped_escrow()'
        );
    ELSE
        RAISE NOTICE 'pg_cron is not enabled: schedule public.auto_release_shipped_escrow() manually.';
    END IF;
END $$;

-- ============================================================================
-- 2. PAYOUT TRANSACTION REFERENCE
-- ============================================================================
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS payout_reference TEXT;

CREATE OR REPLACE FUNCTION public.admin_process_payout(
    p_payout_id UUID,
    p_new_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_note TEXT := NULLIF(trim(COALESCE(p_admin_notes, '')), '');
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: caller is not a platform admin.';
    END IF;

    IF p_new_status NOT IN ('approved', 'paid', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be approved, paid, or rejected.';
    END IF;

    -- For 'paid' the note IS the transaction reference, and it is required
    IF p_new_status = 'paid' AND (v_note IS NULL OR length(v_note) < 4) THEN
        RAISE EXCEPTION 'Enter the EcoCash / bank transaction reference to mark this payout as paid.';
    END IF;
    IF p_new_status = 'rejected' AND v_note IS NULL THEN
        RAISE EXCEPTION 'Give a reason for rejecting this payout.';
    END IF;

    SELECT * INTO v_req
    FROM public.payout_requests
    WHERE id = p_payout_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payout request not found.';
    END IF;
    IF v_req.status = 'paid' THEN
        RAISE EXCEPTION 'Cannot modify a payout that has already been marked as paid.';
    END IF;
    IF v_req.status = 'rejected' THEN
        RAISE EXCEPTION 'Cannot modify a payout that has already been rejected.';
    END IF;

    -- Rejected: atomically return the funds to the vendor's available balance
    IF p_new_status = 'rejected' THEN
        UPDATE public.vendor_balances
        SET available_balance_cents = available_balance_cents + v_req.amount_cents,
            updated_at = timezone('utc'::text, now())
        WHERE shop_id = v_req.shop_id AND currency = v_req.currency;
    END IF;

    UPDATE public.payout_requests
    SET status = p_new_status,
        admin_notes = COALESCE(v_note, admin_notes),
        payout_reference = CASE WHEN p_new_status = 'paid' THEN left(v_note, 200) ELSE payout_reference END,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_payout_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', p_payout_id,
        'status', p_new_status,
        'amount_cents', v_req.amount_cents
    );
END;
$$;

-- ============================================================================
-- 3. PERMISSIONS
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.guard_order_item_escrow_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_escrow_internal(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_release_shipped_escrow(INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_release_shipped_escrow(INTERVAL) TO service_role;
REVOKE EXECUTE ON FUNCTION public.release_escrow(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_escrow(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.report_order_item_problem(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_order_item_problem(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_process_payout(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_process_payout(UUID, TEXT, TEXT) TO authenticated;
