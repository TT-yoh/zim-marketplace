-- 20231010000032_escrow_ledger_and_reconciliation.sql
-- Escrow Integrity & Atomic Reconciliation:
-- 1. Adds escrow_balance_cents column to vendor_balances
-- 2. Hardens fulfill_marketplace_order: credits escrow_balance_cents, NOT available_balance_cents
-- 3. Hardens release_escrow: moves vendor_cut from escrow_balance_cents to available_balance_cents
-- 4. Prevents direct client updates to vendor_balances (enforces RLS)

ALTER TABLE public.vendor_balances 
ADD COLUMN IF NOT EXISTS escrow_balance_cents INTEGER DEFAULT 0 NOT NULL;

-- Ensure RLS on vendor_balances blocks non-admin client writes
ALTER TABLE public.vendor_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors can view own balance" ON public.vendor_balances;
CREATE POLICY "Vendors can view own balance" 
ON public.vendor_balances FOR SELECT 
TO authenticated 
USING (
    shop_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "No client direct insert on vendor_balances" ON public.vendor_balances;
DROP POLICY IF EXISTS "No client direct update on vendor_balances" ON public.vendor_balances;
DROP POLICY IF EXISTS "Admins only manage vendor_balances" ON public.vendor_balances;
CREATE POLICY "Admins only manage vendor_balances"
ON public.vendor_balances FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));

-- Fulfill Marketplace Order (Called when Paynow confirms payment)
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
    item_record RECORD;
    v_total_item_price INTEGER;
    v_platform_cut INTEGER;
    v_vendor_cut INTEGER;
BEGIN
    -- 1. Lock the order row and verify it is pending
    SELECT currency, status 
    INTO v_order_currency, v_order_status
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

    -- 3. Route each item's payout cut into ESCROW balance (NOT available balance)
    FOR item_record IN
        SELECT shop_id, quantity, price_at_purchase_cents
        FROM public.order_items
        WHERE order_id = target_order_id
    LOOP
        v_total_item_price := item_record.quantity * item_record.price_at_purchase_cents;
        v_platform_cut := ROUND(v_total_item_price * 0.10)::INTEGER;
        v_vendor_cut := v_total_item_price - v_platform_cut;

        -- Put vendor funds into escrow balance awaiting delivery confirmation
        INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
        VALUES (item_record.shop_id, COALESCE(v_order_currency, 'USD'), 0, v_vendor_cut)
        ON CONFLICT (shop_id, currency)
        DO UPDATE SET
            escrow_balance_cents = public.vendor_balances.escrow_balance_cents + EXCLUDED.escrow_balance_cents,
            updated_at = timezone('utc'::text, now());
    END LOOP;
END;
$$;

-- Release Escrow (Called when buyer confirms delivery)
CREATE OR REPLACE FUNCTION public.release_escrow(p_item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shop_id UUID;
    v_item_price INTEGER;
    v_item_quantity INTEGER;
    v_total_amount INTEGER;
    v_platform_cut INTEGER;
    v_vendor_cut INTEGER;
    v_status TEXT;
    v_buyer_id UUID;
    v_currency VARCHAR(3);
BEGIN
    -- 1. Fetch order item with row-level exclusive lock (FOR UPDATE OF oi)
    SELECT 
        oi.shop_id, 
        oi.price_at_purchase_cents, 
        oi.quantity, 
        oi.status, 
        o.buyer_id,
        COALESCE(o.currency, 'USD')
    INTO 
        v_shop_id, 
        v_item_price, 
        v_item_quantity, 
        v_status, 
        v_buyer_id,
        v_currency
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

    -- 5. Calculate vendor net cut (10% platform commission retained)
    v_total_amount := v_item_price * v_item_quantity;
    v_platform_cut := ROUND(v_total_amount * 0.10)::INTEGER;
    v_vendor_cut := v_total_amount - v_platform_cut;

    -- 6. Atomic transfer from escrow balance to available balance
    INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents, escrow_balance_cents)
    VALUES (v_shop_id, v_currency, v_vendor_cut, 0)
    ON CONFLICT (shop_id, currency)
    DO UPDATE SET
        available_balance_cents = public.vendor_balances.available_balance_cents + v_vendor_cut,
        escrow_balance_cents = GREATEST(0, public.vendor_balances.escrow_balance_cents - v_vendor_cut),
        updated_at = timezone('utc'::text, now());

END;
$$;
