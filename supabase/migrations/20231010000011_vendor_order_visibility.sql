-- 20231010000011_vendor_order_visibility.sql

-- 1. Add created_at to order_items so the frontend query doesn't crash
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Allow vendors to read the orders that contain their products
DROP POLICY IF EXISTS "Vendors can view orders containing their items" ON public.orders;
CREATE POLICY "Vendors can view orders containing their items" ON public.orders FOR SELECT TO authenticated USING (
    id IN (SELECT order_id FROM public.order_items WHERE shop_id = auth.uid())
);

-- 3. Allow vendors to read the buyer's shipping address for those orders
DROP POLICY IF EXISTS "Vendors can view shipping addresses for their orders" ON public.buyer_addresses;
CREATE POLICY "Vendors can view shipping addresses for their orders" ON public.buyer_addresses FOR SELECT TO authenticated USING (
    id IN (
        SELECT shipping_address_id FROM public.orders 
        WHERE id IN (SELECT order_id FROM public.order_items WHERE shop_id = auth.uid())
    )
);
