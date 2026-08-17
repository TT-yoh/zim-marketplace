-- 20231010000019_fix_delete_rls_and_purge_rpc.sql
-- Fix DELETE permissions, Foreign Key Cascades, and Stored Procedures for Catalog & Order Purging

-- 1. Ensure Foreign Key Cascades on order_items
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items 
    ADD CONSTRAINT order_items_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES public.orders(id) 
    ON DELETE CASCADE;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.order_items 
    ADD CONSTRAINT order_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) 
    ON DELETE CASCADE;

-- 2. Add DELETE RLS policies
DROP POLICY IF EXISTS "Vendors can delete own products" ON public.products;
CREATE POLICY "Vendors can delete own products" ON public.products
    FOR DELETE TO authenticated
    USING (
        shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Buyers and Admins can delete orders" ON public.orders;
CREATE POLICY "Buyers and Admins can delete orders" ON public.orders
    FOR DELETE TO authenticated
    USING (
        buyer_id = auth.uid() 
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

-- 3. Stored Procedure: Admin Purge All Products
CREATE OR REPLACE FUNCTION public.admin_purge_all_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: caller is not a platform admin.';
    END IF;

    DELETE FROM public.order_items;
    DELETE FROM public.products;
END;
$$;

-- 4. Stored Procedure: Admin Purge All Orders
CREATE OR REPLACE FUNCTION public.admin_purge_all_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: caller is not a platform admin.';
    END IF;

    DELETE FROM public.order_items;
    DELETE FROM public.orders;
END;
$$;

-- 5. Stored Procedure: Vendor Purge Inventory
CREATE OR REPLACE FUNCTION public.vendor_purge_inventory(target_shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.uid() != target_shop_id AND NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: you can only purge your own inventory.';
    END IF;

    DELETE FROM public.order_items WHERE shop_id = target_shop_id;
    DELETE FROM public.products WHERE shop_id = target_shop_id;
END;
$$;
