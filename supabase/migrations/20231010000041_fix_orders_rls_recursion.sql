-- 20231010000041_fix_orders_rls_recursion.sql
-- Checkout was broken: inserting an order (with RETURNING, as the app does) failed with
-- "infinite recursion detected in policy for relation orders".
--
-- Cause: the orders SELECT policy "Buyers and Admins can view orders" (migration 020) looked up
-- order_items, and the order_items policies look up orders, so each table's row security
-- re-entered the other's. Migrations 012/015 had removed this loop with the SECURITY DEFINER
-- helper is_vendor_for_order(); migration 020 reintroduced it.
--
-- Fix: every cross-table check goes through SECURITY DEFINER helpers, which read the other
-- table without applying its row security, so no policy can re-enter another.

CREATE OR REPLACE FUNCTION public.is_order_buyer(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND buyer_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_vendor_for_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id AND shop_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_order_buyer(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_vendor_for_order(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_order_buyer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_vendor_for_order(UUID) TO authenticated;

-- ORDERS: one SELECT policy, no direct reference to order_items
DROP POLICY IF EXISTS "Buyers and Admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can view orders for their items securely" ON public.orders;
CREATE POLICY "Buyers, vendors and admins can view orders" ON public.orders
    FOR SELECT TO authenticated
    USING (
        buyer_id = auth.uid()
        OR public.is_platform_admin()
        OR public.is_vendor_for_order(id)
    );

-- Duplicate INSERT policy (identical rule kept below)
DROP POLICY IF EXISTS "Buyers can insert their own orders" ON public.orders;

-- ORDER ITEMS: no direct reference to orders
DROP POLICY IF EXISTS "Buyers can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Users and Admins can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Vendors can view order items for their shop" ON public.order_items;
CREATE POLICY "Buyers, vendors and admins can view order items" ON public.order_items
    FOR SELECT TO authenticated
    USING (
        shop_id = auth.uid()
        OR public.is_order_buyer(order_id)
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "Buyers can insert their order items" ON public.order_items;
DROP POLICY IF EXISTS "Users and Admins can insert order items" ON public.order_items;
CREATE POLICY "Buyers can add items to their own orders" ON public.order_items
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_order_buyer(order_id)
        OR public.is_platform_admin()
    );

-- Duplicate UPDATE policy (the remaining one covers vendors and admins)
DROP POLICY IF EXISTS "Vendors can update order items for their shop" ON public.order_items;

-- Shipping addresses: vendors see addresses of orders they fulfil, via the helper
DROP POLICY IF EXISTS "Vendors can view shipping addresses securely" ON public.buyer_addresses;
CREATE POLICY "Vendors can view shipping addresses securely" ON public.buyer_addresses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.shipping_address_id = buyer_addresses.id
              AND public.is_vendor_for_order(o.id)
        )
    );
