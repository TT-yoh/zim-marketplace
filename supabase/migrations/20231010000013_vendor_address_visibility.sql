-- 20231010000013_vendor_address_visibility.sql

-- Create a secure function to check if the current user is a vendor for the given order_id
-- This SECURITY DEFINER function bypasses RLS, completely preventing the "infinite recursion" error
CREATE OR REPLACE FUNCTION is_vendor_for_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.order_items 
        WHERE order_id = p_order_id 
        AND shop_id = auth.uid()
    );
$$;

-- Allow vendors to read the parent orders securely
DROP POLICY IF EXISTS "Vendors can view orders for their items securely" ON public.orders;
CREATE POLICY "Vendors can view orders for their items securely" 
ON public.orders FOR SELECT TO authenticated 
USING (is_vendor_for_order(id));

-- Allow vendors to read shipping addresses securely
DROP POLICY IF EXISTS "Vendors can view shipping addresses securely" ON public.buyer_addresses;
CREATE POLICY "Vendors can view shipping addresses securely" 
ON public.buyer_addresses FOR SELECT TO authenticated 
USING (
    id IN (
        SELECT shipping_address_id FROM public.orders 
        WHERE is_vendor_for_order(id)
    )
);
