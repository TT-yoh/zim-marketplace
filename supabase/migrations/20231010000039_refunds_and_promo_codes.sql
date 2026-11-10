-- 20231010000039_refunds_and_promo_codes.sql
-- 1. Promo codes move from hard-coded values into a promo_codes table. Each percentage code
--    says who funds the discount: 'platform' (vendor still gets the full price, as before) or
--    'vendor' (the item is treated as sold at the discounted price). Free-shipping codes simply
--    waive the fee, so the shipping vendor is not credited a fee.
-- 2. Admin refunds become a real ledger operation: admin_refund_order_item reverses the vendor's
--    escrow and the platform commission, restores stock, refunds shipping once every item in the
--    order is refunded, and records what is owed to the buyer in a refunds table.
--    Paynow has no refund API for mobile money, so admins pay the buyer manually and then
--    record the reference with admin_mark_refund_paid.

-- ============================================================================
-- 1. PROMO CODES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
    code TEXT PRIMARY KEY CHECK (code = UPPER(code)),
    label TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('percent_off', 'free_shipping')),
    percent_off INTEGER CHECK (percent_off IS NULL OR (percent_off > 0 AND percent_off <= 90)),
    max_discount_cents INTEGER CHECK (max_discount_cents IS NULL OR max_discount_cents > 0),
    funded_by TEXT NOT NULL DEFAULT 'platform' CHECK (funded_by IN ('platform', 'vendor')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (kind <> 'percent_off' OR percent_off IS NOT NULL)
);

INSERT INTO public.promo_codes (code, label, kind, percent_off, funded_by) VALUES
    ('ZIM10', '10% Off Subtotal', 'percent_off', 10, 'platform'),
    ('HARARE10', '10% Off Subtotal', 'percent_off', 10, 'platform'),
    ('FREESHIP', 'Free Shipping Promo', 'free_shipping', NULL, 'platform')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;
CREATE POLICY "Anyone can read active promo codes"
ON public.promo_codes FOR SELECT
USING (is_active AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins manage promo codes"
ON public.promo_codes FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- New tables are not always exposed to the Data API automatically; grant explicitly (RLS still applies)
GRANT SELECT ON public.promo_codes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_funded_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee_refunded BOOLEAN DEFAULT false;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_share_cents INTEGER;

-- Keep buyers from setting these on insert
CREATE OR REPLACE FUNCTION public.enforce_order_insert_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF COALESCE(auth.role(), '') = 'service_role' THEN
        RETURN NEW;
    END IF;

    NEW.status := 'pending';
    NEW.payment_intent_id := NULL;
    NEW.shipping_fee_released := false;
    NEW.shipping_fee_refunded := false;
    NEW.paid_at := NULL;
    NEW.cancelled_at := NULL;
    NEW.shipping_shop_id := NULL;
    NEW.items_subtotal_cents := 0;
    NEW.discount_cents := 0;
    NEW.discount_funded_by := NULL;
    NEW.shipping_fee_cents := 0;
    NEW.total_amount_cents := 0;
    NEW.currency := 'USD';
    NEW.fulfillment_type := CASE WHEN NEW.fulfillment_type = 'pickup' THEN 'pickup' ELSE 'courier' END;
    NEW.promo_code := NULLIF(UPPER(TRIM(COALESCE(NEW.promo_code, ''))), '');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_order_totals(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_promo RECORD;
    v_subtotal BIGINT;
    v_fee INTEGER;
    v_discount INTEGER := 0;
    v_code TEXT;
    v_funded_by TEXT;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND OR v_order.status <> 'pending' THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(price_at_purchase_cents::BIGINT * quantity), 0)
    INTO v_subtotal
    FROM public.order_items
    WHERE order_id = p_order_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.order_items
        WHERE order_id = p_order_id AND shop_id = v_order.shipping_shop_id
    ) THEN
        v_order.shipping_shop_id := (
            SELECT shop_id FROM public.order_items WHERE order_id = p_order_id ORDER BY id LIMIT 1
        );
    END IF;

    v_fee := CASE WHEN v_order.shipping_shop_id IS NULL THEN 0
                  ELSE public.compute_order_shipping_fee(v_order.shipping_shop_id, v_order.fulfillment_type, v_order.delivery_zone, v_subtotal)
             END;

    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE code = v_order.promo_code
      AND is_active
      AND (expires_at IS NULL OR expires_at > now());

    IF FOUND THEN
        v_code := v_promo.code;
        IF v_promo.kind = 'free_shipping' THEN
            v_fee := 0;
        ELSE
            v_discount := ROUND(v_subtotal * v_promo.percent_off / 100.0)::INTEGER;
            IF v_promo.max_discount_cents IS NOT NULL THEN
                v_discount := LEAST(v_discount, v_promo.max_discount_cents);
            END IF;
            v_discount := LEAST(v_discount, v_subtotal::INTEGER);
            v_funded_by := v_promo.funded_by;
        END IF;
    END IF;

    UPDATE public.orders
    SET items_subtotal_cents = v_subtotal,
        shipping_shop_id = v_order.shipping_shop_id,
        shipping_fee_cents = v_fee,
        discount_cents = v_discount,
        discount_funded_by = CASE WHEN v_discount > 0 THEN v_funded_by ELSE NULL END,
        promo_code = v_code,
        total_amount_cents = GREATEST(0, v_subtotal + v_fee - v_discount)
    WHERE id = p_order_id;
END;
$$;


-- ============================================================================
-- 2. FULFILL: ALLOCATE DISCOUNT PER ITEM (vendor-funded codes reduce the vendor cut)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fulfill_marketplace_order(
    target_order_id UUID,
    gateway_ref TEXT,
    paid_amount_cents INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_rate NUMERIC(5, 2);
    v_total INTEGER;
    v_net INTEGER;
    v_share INTEGER;
    v_allocated INTEGER := 0;
    v_item_count INTEGER;
    v_index INTEGER := 0;
    v_platform_cut INTEGER;
    v_vendor_cut INTEGER;
    v_ship_shop UUID;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = target_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', target_order_id;
    END IF;

    IF v_order.status = 'paid' THEN
        RETURN;
    END IF;

    IF v_order.status <> 'pending' THEN
        RAISE EXCEPTION 'Order % has status "%", cannot fulfill.', target_order_id, v_order.status;
    END IF;

    IF COALESCE(v_order.total_amount_cents, 0) <= 0 THEN
        RAISE EXCEPTION 'Order % has no payable total.', target_order_id;
    END IF;

    IF paid_amount_cents IS NULL OR paid_amount_cents < v_order.total_amount_cents THEN
        RAISE EXCEPTION 'Amount mismatch for order %: paid % cents, due % cents.',
            target_order_id, paid_amount_cents, v_order.total_amount_cents;
    END IF;

    PERFORM set_config('zimmarket.ledger_op', 'on', true);

    UPDATE public.orders
    SET status = 'paid',
        payment_intent_id = gateway_ref,
        paid_at = timezone('utc'::text, now())
    WHERE id = target_order_id;

    SELECT COUNT(*) INTO v_item_count FROM public.order_items WHERE order_id = target_order_id;

    FOR v_item IN
        SELECT id, shop_id, quantity, price_at_purchase_cents
        FROM public.order_items
        WHERE order_id = target_order_id
        ORDER BY id
    LOOP
        v_index := v_index + 1;

        IF v_ship_shop IS NULL THEN
            v_ship_shop := COALESCE(v_order.shipping_shop_id, v_item.shop_id);
        END IF;

        IF EXISTS (SELECT 1 FROM public.platform_admins WHERE id = v_item.shop_id) THEN
            v_rate := 0.00;
        ELSE
            SELECT COALESCE(commission_rate_percent, 10.00) INTO v_rate
            FROM public.vendor_profiles WHERE id = v_item.shop_id;
            v_rate := LEAST(100.00, GREATEST(0.00, COALESCE(v_rate, 10.00)));
        END IF;

        v_total := v_item.quantity * v_item.price_at_purchase_cents;

        -- Proportional share of the order discount; the last item absorbs rounding
        IF COALESCE(v_order.discount_cents, 0) > 0 AND COALESCE(v_order.items_subtotal_cents, 0) > 0 THEN
            IF v_index = v_item_count THEN
                v_share := v_order.discount_cents - v_allocated;
            ELSE
                v_share := FLOOR(v_order.discount_cents::NUMERIC * v_total / v_order.items_subtotal_cents)::INTEGER;
            END IF;
            v_share := LEAST(GREATEST(v_share, 0), v_total);
            v_allocated := v_allocated + v_share;
        ELSE
            v_share := 0;
        END IF;

        -- Vendor-funded discounts lower the effective sale price; platform-funded ones do not
        v_net := CASE WHEN v_order.discount_funded_by = 'vendor' THEN v_total - v_share ELSE v_total END;
        v_platform_cut := ROUND(v_net * (v_rate / 100.0))::INTEGER;
        v_vendor_cut := v_net - v_platform_cut;

        UPDATE public.order_items
        SET commission_percent = v_rate,
            vendor_net_cents = v_vendor_cut,
            discount_share_cents = v_share
        WHERE id = v_item.id;

        INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
        VALUES (v_item.shop_id, COALESCE(v_order.currency, 'USD'), 0, v_vendor_cut)
        ON CONFLICT (shop_id, currency)
        DO UPDATE SET
            escrow_balance_cents = public.vendor_balances.escrow_balance_cents + EXCLUDED.escrow_balance_cents,
            updated_at = timezone('utc'::text, now());

        IF v_platform_cut > 0 THEN
            INSERT INTO public.platform_earnings (
                order_id, order_item_id, source_shop_id, amount_cents, currency, commission_percent, status
            ) VALUES (
                target_order_id, v_item.id, v_item.shop_id, v_platform_cut,
                COALESCE(v_order.currency, 'USD'), v_rate, 'pending_escrow'
            );
        END IF;
    END LOOP;

    IF COALESCE(v_order.shipping_fee_cents, 0) > 0 AND v_ship_shop IS NOT NULL THEN
        UPDATE public.orders SET shipping_shop_id = v_ship_shop WHERE id = target_order_id;

        INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
        VALUES (v_ship_shop, COALESCE(v_order.currency, 'USD'), 0, v_order.shipping_fee_cents)
        ON CONFLICT (shop_id, currency)
        DO UPDATE SET
            escrow_balance_cents = public.vendor_balances.escrow_balance_cents + EXCLUDED.escrow_balance_cents,
            updated_at = timezone('utc'::text, now());
    END IF;

    PERFORM set_config('zimmarket.ledger_op', 'off', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfill_marketplace_order(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_marketplace_order(UUID, TEXT, INTEGER) TO service_role;
REVOKE EXECUTE ON FUNCTION public.recompute_order_totals(UUID) FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- 3. ITEM STATUS: 'refunded' NOW ALSO ONLY VIA THE LEDGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_order_item_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_status TEXT;
BEGIN
    IF public.ledger_op_active() THEN
        RETURN NEW;
    END IF;

    IF NEW.status IN ('delivered', 'refunded') AND OLD.status IS DISTINCT FROM NEW.status THEN
        RAISE EXCEPTION 'Use release_escrow() or admin_refund_order_item() to settle an item.';
    END IF;
    IF NEW.commission_percent IS DISTINCT FROM OLD.commission_percent
       OR NEW.vendor_net_cents IS DISTINCT FROM OLD.vendor_net_cents
       OR NEW.discount_share_cents IS DISTINCT FROM OLD.discount_share_cents THEN
        RAISE EXCEPTION 'Security Violation: commission snapshot is immutable.';
    END IF;

    IF public.is_platform_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.price_at_purchase_cents IS DISTINCT FROM OLD.price_at_purchase_cents
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.shop_id IS DISTINCT FROM OLD.shop_id
       OR NEW.order_id IS DISTINCT FROM OLD.order_id THEN
        RAISE EXCEPTION 'Security Violation: financial and identity fields of an order item are immutable.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status = 'pending' AND NEW.status = 'shipped' THEN
            IF auth.uid() IS NULL OR auth.uid() <> OLD.shop_id THEN
                RAISE EXCEPTION 'Unauthorized: Only the vendor can mark this item as shipped.';
            END IF;
            SELECT status INTO v_order_status FROM public.orders WHERE id = OLD.order_id;
            IF v_order_status IS DISTINCT FROM 'paid' THEN
                RAISE EXCEPTION 'Cannot ship an item from an unpaid order.';
            END IF;
        ELSE
            RAISE EXCEPTION 'Unauthorized status transition from % to %.', OLD.status, NEW.status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================================
-- 4. REFUNDS LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT NOT NULL,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE RESTRICT NOT NULL UNIQUE,
    buyer_id UUID NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending_payout' CHECK (status IN ('pending_payout', 'paid')),
    payout_reference TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_buyer ON public.refunds(buyer_id);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.refunds TO authenticated;

DROP POLICY IF EXISTS "Buyers and admins can view refunds" ON public.refunds;
CREATE POLICY "Buyers and admins can view refunds"
ON public.refunds FOR SELECT
TO authenticated
USING (buyer_id = auth.uid() OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.admin_refund_order_item(p_item_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item RECORD;
    v_total INTEGER;
    v_share INTEGER;
    v_refund INTEGER;
    v_vendor_cut INTEGER;
    v_rate NUMERIC(5, 2);
    v_refund_shipping BOOLEAN := false;
    v_refund_id UUID;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: caller is not a platform admin.';
    END IF;

    SELECT oi.id, oi.order_id, oi.product_id, oi.shop_id, oi.quantity, oi.price_at_purchase_cents,
           oi.status, oi.vendor_net_cents, oi.discount_share_cents,
           o.buyer_id, o.status AS order_status, COALESCE(o.currency, 'USD') AS currency,
           COALESCE(o.discount_cents, 0) AS discount_cents,
           COALESCE(o.items_subtotal_cents, 0) AS items_subtotal_cents,
           COALESCE(o.shipping_fee_cents, 0) AS shipping_fee_cents,
           COALESCE(o.shipping_fee_released, false) AS shipping_released,
           COALESCE(o.shipping_fee_refunded, false) AS shipping_refunded,
           o.shipping_shop_id
    INTO v_item
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = p_item_id
    FOR UPDATE OF oi, o;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;

    IF v_item.order_status IS DISTINCT FROM 'paid' THEN
        RAISE EXCEPTION 'Only items from paid orders can be refunded (order is %).', v_item.order_status;
    END IF;

    IF v_item.status NOT IN ('pending', 'shipped') THEN
        RAISE EXCEPTION 'Item is already %; only undelivered items can be refunded here.', v_item.status;
    END IF;

    v_total := v_item.price_at_purchase_cents * v_item.quantity;
    v_share := COALESCE(
        v_item.discount_share_cents,
        CASE WHEN v_item.items_subtotal_cents > 0
             THEN FLOOR(v_item.discount_cents::NUMERIC * v_total / v_item.items_subtotal_cents)::INTEGER
             ELSE 0 END
    );
    v_refund := GREATEST(0, v_total - v_share);

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
        v_vendor_cut := v_total - ROUND(v_total * (v_rate / 100.0))::INTEGER;
    END IF;

    PERFORM set_config('zimmarket.ledger_op', 'on', true);

    UPDATE public.order_items SET status = 'refunded' WHERE id = p_item_id;

    -- Take the vendor's share back out of escrow
    UPDATE public.vendor_balances
    SET escrow_balance_cents = GREATEST(0, escrow_balance_cents - v_vendor_cut),
        updated_at = timezone('utc'::text, now())
    WHERE shop_id = v_item.shop_id AND currency = v_item.currency;

    -- Reverse the platform commission
    UPDATE public.platform_earnings
    SET status = 'refunded'
    WHERE order_item_id = p_item_id AND status = 'pending_escrow';

    -- Put the stock back
    UPDATE public.products
    SET stock_quantity = stock_quantity + v_item.quantity
    WHERE id = v_item.product_id;

    -- Once every item in the order is refunded, refund the unreleased shipping fee too
    IF v_item.shipping_fee_cents > 0 AND NOT v_item.shipping_released AND NOT v_item.shipping_refunded
       AND NOT EXISTS (
           SELECT 1 FROM public.order_items
           WHERE order_id = v_item.order_id AND status <> 'refunded'
       ) THEN
        v_refund_shipping := true;
        v_refund := v_refund + v_item.shipping_fee_cents;

        UPDATE public.vendor_balances
        SET escrow_balance_cents = GREATEST(0, escrow_balance_cents - v_item.shipping_fee_cents),
            updated_at = timezone('utc'::text, now())
        WHERE shop_id = COALESCE(v_item.shipping_shop_id, v_item.shop_id) AND currency = v_item.currency;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.order_items WHERE order_id = v_item.order_id AND status <> 'refunded'
    ) THEN
        UPDATE public.orders
        SET status = 'refunded',
            shipping_fee_refunded = shipping_fee_refunded OR v_refund_shipping
        WHERE id = v_item.order_id;
    END IF;

    INSERT INTO public.refunds (order_id, order_item_id, buyer_id, amount_cents, currency, reason, created_by)
    VALUES (v_item.order_id, p_item_id, v_item.buyer_id, v_refund, v_item.currency, p_reason, auth.uid())
    RETURNING id INTO v_refund_id;

    PERFORM set_config('zimmarket.ledger_op', 'off', true);

    RETURN jsonb_build_object(
        'success', true,
        'refund_id', v_refund_id,
        'amount_cents', v_refund,
        'currency', v_item.currency,
        'includes_shipping', v_refund_shipping
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_refund_paid(p_refund_id UUID, p_reference TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: caller is not a platform admin.';
    END IF;

    IF COALESCE(TRIM(p_reference), '') = '' THEN
        RAISE EXCEPTION 'A payment reference (e.g. the EcoCash transaction ID) is required.';
    END IF;

    UPDATE public.refunds
    SET status = 'paid',
        payout_reference = TRIM(p_reference),
        paid_at = timezone('utc'::text, now())
    WHERE id = p_refund_id AND status = 'pending_payout';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Refund not found or already marked paid.';
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_refund_order_item(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_refund_paid(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_refund_order_item(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_refund_paid(UUID, TEXT) TO authenticated;
