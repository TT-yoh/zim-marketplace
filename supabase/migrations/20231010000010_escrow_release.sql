-- 20231010000010_escrow_release.sql

-- Create a secure function to release escrow funds when a buyer confirms delivery
CREATE OR REPLACE FUNCTION release_escrow(p_item_id UUID)
RETURNS void AS $$
DECLARE
    v_shop_id UUID;
    v_amount INTEGER;
    v_status TEXT;
    v_buyer_id UUID;
BEGIN
    -- Get the order item details and verify ownership
    SELECT oi.shop_id, (oi.price_at_purchase_cents * oi.quantity), oi.status, o.buyer_id
    INTO v_shop_id, v_amount, v_status, v_buyer_id
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = p_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;

    -- Security Check: Only the buyer who made the order can release the escrow
    IF v_buyer_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Only the buyer can confirm delivery';
    END IF;

    -- Prevent double-release
    IF v_status = 'delivered' THEN
        RAISE EXCEPTION 'Escrow already released for this item';
    END IF;

    -- 1. Mark the item as delivered
    UPDATE public.order_items
    SET status = 'delivered'
    WHERE id = p_item_id;

    -- 2. Move the funds to the vendor's available balance
    INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents)
    VALUES (v_shop_id, 'USD', v_amount)
    ON CONFLICT (shop_id, currency) 
    DO UPDATE SET 
        available_balance_cents = public.vendor_balances.available_balance_cents + EXCLUDED.available_balance_cents,
        updated_at = CURRENT_TIMESTAMP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
