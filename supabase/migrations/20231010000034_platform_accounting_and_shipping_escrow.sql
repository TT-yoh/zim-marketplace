-- 20231010000034_platform_accounting_and_shipping_escrow.sql
-- Financial & Multi-Vendor Clearinghouse Architecture:
-- 1. Adds commission_rate_percent to vendor_profiles (default 10%, 0% for platform owner stores).
-- 2. Adds shipping_fee_released to orders to track fulfillment fee settlement.
-- 3. Creates platform_earnings ledger table to track platform commissions explicitly.
-- 4. Upgrades fulfill_marketplace_order:
--    - 0% commission for owner's store (100% credited to owner).
--    - Allocates 100% of shipping fees to the delivering vendor's escrow (0% commission).
--    - Records platform commission in platform_earnings for third-party stores.
-- 5. Upgrades release_escrow:
--    - Releases item payment and shipping fee atomically.
--    - Marks platform_earnings as 'cleared'.
-- 6. Creates get_platform_financial_summary() RPC for real-time clearinghouse reconciliation in Admin Dashboard.

-- ============================================================================
-- 1. ADD COMMISSION RATE & SHIPPING SETTLEMENT FLAGS
-- ============================================================================
ALTER TABLE public.vendor_profiles 
ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(5, 2) DEFAULT 10.00;

-- Exempt platform administrators from paying platform commission on their own stores
UPDATE public.vendor_profiles
SET commission_rate_percent = 0.00
WHERE id IN (SELECT id FROM public.platform_admins);

-- Track whether shipping fee has been released for the order
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_fee_released BOOLEAN DEFAULT false;


-- ============================================================================
-- 2. PLATFORM EARNINGS LEDGER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    source_shop_id UUID REFERENCES public.vendor_profiles(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    commission_percent NUMERIC(5, 2) DEFAULT 10.00 NOT NULL,
    status TEXT DEFAULT 'pending_escrow' NOT NULL CHECK (status IN ('pending_escrow', 'cleared', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    cleared_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_platform_earnings_order ON public.platform_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_shop ON public.platform_earnings(source_shop_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_status ON public.platform_earnings(status);

ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and manage platform earnings" ON public.platform_earnings;
CREATE POLICY "Admins can view and manage platform earnings"
ON public.platform_earnings FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));


-- ============================================================================
-- 3. UPGRADED FULFILL_MARKETPLACE_ORDER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fulfill_marketplace_order(
    target_order_id UUID,
    gateway_ref TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_currency VARCHAR(3);
    v_order_status VARCHAR;
    v_shipping_fee INTEGER;
    item_record RECORD;
    v_total_item_price INTEGER;
    v_commission_rate NUMERIC(5, 2);
    v_platform_cut INTEGER;
    v_vendor_cut INTEGER;
    v_is_owner_store BOOLEAN;
    v_first_shop_id UUID := NULL;
    v_shop_count INTEGER := 0;
BEGIN
    -- 1. Lock the order row and verify it is pending
    SELECT currency, status, COALESCE(shipping_fee_cents, 0)
    INTO v_order_currency, v_order_status, v_shipping_fee
    FROM public.orders 
    WHERE id = target_order_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', target_order_id;
    END IF;

    IF v_order_status != 'pending' THEN
        RAISE EXCEPTION 'Order % has status "%", cannot fulfill.', target_order_id, v_order_status;
    END IF;

    -- 2. Mark order as paid with gateway transaction reference
    UPDATE public.orders
    SET status = 'paid', 
        payment_intent_id = gateway_ref
    WHERE id = target_order_id;

    -- 3. Route each item's payout cut into ESCROW balance
    FOR item_record IN
        SELECT id, shop_id, quantity, price_at_purchase_cents
        FROM public.order_items
        WHERE order_id = target_order_id
    LOOP
        -- Keep track of primary fulfilling shop
        IF v_first_shop_id IS NULL THEN
            v_first_shop_id := item_record.shop_id;
        END IF;

        -- Check if this is the platform owner's own store
        v_is_owner_store := EXISTS (
            SELECT 1 FROM public.platform_admins WHERE id = item_record.shop_id
        );

        -- Determine commission rate (0% for owner store, custom rate or 10% for other vendors)
        IF v_is_owner_store THEN
            v_commission_rate := 0.00;
        ELSE
            SELECT COALESCE(commission_rate_percent, 10.00)
            INTO v_commission_rate
            FROM public.vendor_profiles
            WHERE id = item_record.shop_id;

            IF v_commission_rate IS NULL THEN
                v_commission_rate := 10.00;
            END IF;
        END IF;

        v_total_item_price := item_record.quantity * item_record.price_at_purchase_cents;
        v_platform_cut := ROUND(v_total_item_price * (v_commission_rate / 100.0))::INTEGER;
        v_vendor_cut := v_total_item_price - v_platform_cut;

        -- Put vendor cut into escrow balance
        INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
        VALUES (item_record.shop_id, COALESCE(v_order_currency, 'USD'), 0, v_vendor_cut)
        ON CONFLICT (shop_id, currency)
        DO UPDATE SET
            escrow_balance_cents = public.vendor_balances.escrow_balance_cents + EXCLUDED.escrow_balance_cents,
            updated_at = timezone('utc'::text, now());

        -- If platform commission earned, record in platform_earnings
        IF v_platform_cut > 0 THEN
            INSERT INTO public.platform_earnings (
                order_id,
                order_item_id,
                source_shop_id,
                amount_cents,
                currency,
                commission_percent,
                status,
                created_at
            ) VALUES (
                target_order_id,
                item_record.id,
                item_record.shop_id,
                v_platform_cut,
                COALESCE(v_order_currency, 'USD'),
                v_commission_rate,
                'pending_escrow',
                timezone('utc'::text, now())
            );
        END IF;
    END LOOP;

    -- 4. Route Shipping Fee 100% to Fulfilling Vendor (0% Platform Commission on Shipping)
    IF v_shipping_fee > 0 AND v_first_shop_id IS NOT NULL THEN
        -- Add shipping fee into the fulfilling shop's escrow balance
        INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
        VALUES (v_first_shop_id, COALESCE(v_order_currency, 'USD'), 0, v_shipping_fee)
        ON CONFLICT (shop_id, currency)
        DO UPDATE SET
            escrow_balance_cents = public.vendor_balances.escrow_balance_cents + EXCLUDED.escrow_balance_cents,
            updated_at = timezone('utc'::text, now());
    END IF;
END;
$$;


-- ============================================================================
-- 4. UPGRADED RELEASE_ESCROW
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_escrow(p_item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_shop_id UUID;
    v_item_price INTEGER;
    v_item_quantity INTEGER;
    v_total_amount INTEGER;
    v_commission_rate NUMERIC(5, 2);
    v_platform_cut INTEGER;
    v_vendor_cut INTEGER;
    v_status TEXT;
    v_buyer_id UUID;
    v_currency VARCHAR(3);
    v_is_owner_store BOOLEAN;
    v_order_shipping_fee INTEGER;
    v_shipping_already_released BOOLEAN;
    v_all_items_delivered BOOLEAN;
BEGIN
    -- 1. Fetch order item with row-level exclusive lock (FOR UPDATE OF oi)
    SELECT 
        oi.order_id,
        oi.shop_id, 
        oi.price_at_purchase_cents, 
        oi.quantity, 
        oi.status, 
        o.buyer_id,
        COALESCE(o.currency, 'USD'),
        COALESCE(o.shipping_fee_cents, 0),
        COALESCE(o.shipping_fee_released, false)
    INTO 
        v_order_id,
        v_shop_id, 
        v_item_price, 
        v_item_quantity, 
        v_status, 
        v_buyer_id,
        v_currency,
        v_order_shipping_fee,
        v_shipping_already_released
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = p_item_id
    FOR UPDATE OF oi;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;

    -- 2. Authorization check: Only the buyer who placed the order OR a platform admin can release escrow
    IF v_buyer_id != auth.uid() AND NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only the buyer can confirm delivery';
    END IF;

    -- 3. Prevent double-release and refund release
    IF v_status = 'delivered' THEN
        RAISE EXCEPTION 'Escrow already released for this item';
    END IF;

    IF v_status = 'refunded' THEN
        RAISE EXCEPTION 'Cannot release escrow: item has been refunded';
    END IF;

    -- 4. Mark item as delivered
    UPDATE public.order_items
    SET status = 'delivered'
    WHERE id = p_item_id;

    -- 5. Calculate vendor net cut (0% for owner store, custom or 10% for other vendors)
    v_is_owner_store := EXISTS (
        SELECT 1 FROM public.platform_admins WHERE id = v_shop_id
    );

    IF v_is_owner_store THEN
        v_commission_rate := 0.00;
    ELSE
        SELECT COALESCE(commission_rate_percent, 10.00)
        INTO v_commission_rate
        FROM public.vendor_profiles
        WHERE id = v_shop_id;

        IF v_commission_rate IS NULL THEN
            v_commission_rate := 10.00;
        END IF;
    END IF;

    v_total_amount := v_item_price * v_item_quantity;
    v_platform_cut := ROUND(v_total_amount * (v_commission_rate / 100.0))::INTEGER;
    v_vendor_cut := v_total_amount - v_platform_cut;

    -- 6. Atomic transfer from escrow balance to available balance for item
    INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
    VALUES (v_shop_id, v_currency, v_vendor_cut, 0)
    ON CONFLICT (shop_id, currency)
    DO UPDATE SET
        available_balance_cents = public.vendor_balances.available_balance_cents + v_vendor_cut,
        escrow_balance_cents = GREATEST(0, public.vendor_balances.escrow_balance_cents - v_vendor_cut),
        updated_at = timezone('utc'::text, now());

    -- 7. If platform commission was logged, mark it as 'cleared'
    UPDATE public.platform_earnings
    SET status = 'cleared',
        cleared_at = timezone('utc'::text, now())
    WHERE order_item_id = p_item_id AND status = 'pending_escrow';

    -- 8. Release Shipping Fee to Delivering Shop when all items in this order are delivered
    IF v_order_shipping_fee > 0 AND NOT v_shipping_already_released THEN
        -- Check if all items in this order are now delivered
        SELECT NOT EXISTS (
            SELECT 1 FROM public.order_items 
            WHERE order_id = v_order_id AND status != 'delivered'
        ) INTO v_all_items_delivered;

        IF v_all_items_delivered THEN
            -- Move shipping fee from escrow to available balance for this shop
            UPDATE public.vendor_balances
            SET available_balance_cents = available_balance_cents + v_order_shipping_fee,
                escrow_balance_cents = GREATEST(0, escrow_balance_cents - v_order_shipping_fee),
                updated_at = timezone('utc'::text, now())
            WHERE shop_id = v_shop_id AND currency = v_currency;

            -- Mark shipping as released on the order
            UPDATE public.orders
            SET shipping_fee_released = true
            WHERE id = v_order_id;
        END IF;
    END IF;

END;
$$;


-- ============================================================================
-- 5. RPC: GET PLATFORM FINANCIAL SUMMARY (CLEARINGHOUSE DASHBOARD)
-- ============================================================================
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
    v_admin_ids UUID[];
BEGIN
    -- Check admin authorization
    IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: platform admin only.';
    END IF;

    -- Get list of platform admin IDs
    SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::UUID[]) INTO v_admin_ids FROM public.platform_admins;

    -- 1. Platform Facilitation Commission Earnings
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'cleared' THEN amount_cents ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'pending_escrow' THEN amount_cents ELSE 0 END), 0)
    INTO 
        v_platform_cleared_cents,
        v_platform_pending_cents
    FROM public.platform_earnings;

    -- 2. Third-Party Vendor Custodial Escrow Float and Payable Balances (excluding owner's store)
    SELECT 
        COALESCE(SUM(escrow_balance_cents), 0),
        COALESCE(SUM(available_balance_cents), 0)
    INTO 
        v_vendor_escrow_float_cents,
        v_vendor_payable_cents
    FROM public.vendor_balances
    WHERE shop_id != ALL(v_admin_ids);

    -- 3. Owner Store Total Sales (sum of owner's store items on paid orders)
    SELECT COALESCE(SUM(oi.price_at_purchase_cents * oi.quantity), 0)
    INTO v_owner_sales_cents
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.status = 'paid'
      AND oi.shop_id = ANY(v_admin_ids);

    -- 4. Pending Vendor Payout Requests
    SELECT COALESCE(SUM(amount_cents), 0)
    INTO v_pending_payouts_cents
    FROM public.payout_requests
    WHERE status = 'pending';

    RETURN jsonb_build_object(
        'success', true,
        'platform_cleared_commission_cents', v_platform_cleared_cents,
        'platform_pending_commission_cents', v_platform_pending_cents,
        'vendor_escrow_float_cents', v_vendor_escrow_float_cents,
        'vendor_payable_cents', v_vendor_payable_cents,
        'owner_store_sales_cents', v_owner_sales_cents,
        'pending_payouts_cents', v_pending_payouts_cents
    );
END;
$$;
