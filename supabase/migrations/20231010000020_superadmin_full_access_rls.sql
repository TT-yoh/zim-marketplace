-- 20231010000020_superadmin_full_access_rls.sql
-- Grants platform admins full CRUD control across all stores, products, orders, and profiles
-- while ensuring vendors retain secure isolated control over their own store.

-- 1. PRODUCTS TABLE
DROP POLICY IF EXISTS "Public Read Access Products" ON public.products;
CREATE POLICY "Public Read Access Products" ON public.products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendors can insert own products" ON public.products;
CREATE POLICY "Vendors can insert own products" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
        shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Vendors can update own products" ON public.products;
CREATE POLICY "Vendors can update own products" ON public.products
    FOR UPDATE TO authenticated
    USING (
        shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    )
    WITH CHECK (
        shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Vendors can delete own products" ON public.products;
CREATE POLICY "Vendors can delete own products" ON public.products
    FOR DELETE TO authenticated
    USING (
        shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

-- 2. ORDERS TABLE
DROP POLICY IF EXISTS "Buyers and Admins can view orders" ON public.orders;
CREATE POLICY "Buyers and Admins can view orders" ON public.orders
    FOR SELECT TO authenticated
    USING (
        buyer_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
        OR id IN (SELECT order_id FROM public.order_items WHERE shop_id = auth.uid())
    );

DROP POLICY IF EXISTS "Buyers and Admins can insert orders" ON public.orders;
CREATE POLICY "Buyers and Admins can insert orders" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (
        buyer_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Buyers and Admins can update orders" ON public.orders;
CREATE POLICY "Buyers and Admins can update orders" ON public.orders
    FOR UPDATE TO authenticated
    USING (
        buyer_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Buyers and Admins can delete orders" ON public.orders;
CREATE POLICY "Buyers and Admins can delete orders" ON public.orders
    FOR DELETE TO authenticated
    USING (
        buyer_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

-- 3. ORDER ITEMS TABLE
DROP POLICY IF EXISTS "Users and Admins can view order items" ON public.order_items;
CREATE POLICY "Users and Admins can view order items" ON public.order_items
    FOR SELECT TO authenticated
    USING (
        shop_id = auth.uid()
        OR order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users and Admins can insert order items" ON public.order_items;
CREATE POLICY "Users and Admins can insert order items" ON public.order_items
    FOR INSERT TO authenticated
    WITH CHECK (
        order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Vendors and Admins can update order items" ON public.order_items;
CREATE POLICY "Vendors and Admins can update order items" ON public.order_items
    FOR UPDATE TO authenticated
    USING (
        shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users and Admins can delete order items" ON public.order_items;
CREATE POLICY "Users and Admins can delete order items" ON public.order_items
    FOR DELETE TO authenticated
    USING (
        shop_id = auth.uid()
        OR order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

-- 4. VENDOR PROFILES TABLE
DROP POLICY IF EXISTS "Public Read Vendor Profiles" ON public.vendor_profiles;
CREATE POLICY "Public Read Vendor Profiles" ON public.vendor_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users and Admins can insert vendor profiles" ON public.vendor_profiles;
CREATE POLICY "Users and Admins can insert vendor profiles" ON public.vendor_profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users and Admins can update vendor profiles" ON public.vendor_profiles;
CREATE POLICY "Users and Admins can update vendor profiles" ON public.vendor_profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

-- 5. VENDOR BALANCES TABLE
DROP POLICY IF EXISTS "Vendors and Admins can view balances" ON public.vendor_balances;
CREATE POLICY "Vendors and Admins can view balances" ON public.vendor_balances
    FOR SELECT TO authenticated
    USING (
        shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Vendors and Admins can update balances" ON public.vendor_balances;
CREATE POLICY "Vendors and Admins can update balances" ON public.vendor_balances
    FOR UPDATE TO authenticated
    USING (
        shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );
