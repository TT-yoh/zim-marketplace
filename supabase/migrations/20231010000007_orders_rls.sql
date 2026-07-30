-- 20231010000007_orders_rls.sql

-- Enable RLS just in case
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders policies
DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.orders;
CREATE POLICY "Buyers can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can insert their own orders" ON public.orders;
CREATE POLICY "Buyers can insert their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can update their own orders" ON public.orders;
CREATE POLICY "Buyers can update their own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

-- Order Items policies
DROP POLICY IF EXISTS "Buyers can view their order items" ON public.order_items;
CREATE POLICY "Buyers can view their order items" ON public.order_items FOR SELECT TO authenticated USING (
    order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);

DROP POLICY IF EXISTS "Buyers can insert their order items" ON public.order_items;
CREATE POLICY "Buyers can insert their order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendors can view order items for their shop" ON public.order_items;
CREATE POLICY "Vendors can view order items for their shop" ON public.order_items FOR SELECT TO authenticated USING (
    shop_id = auth.uid()
);

DROP POLICY IF EXISTS "Vendors can update order items for their shop" ON public.order_items;
CREATE POLICY "Vendors can update order items for their shop" ON public.order_items FOR UPDATE TO authenticated USING (
    shop_id = auth.uid()
);
