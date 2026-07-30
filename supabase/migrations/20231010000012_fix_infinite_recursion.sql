-- 20231010000012_fix_infinite_recursion.sql

-- Drop the policies that caused infinite recursion between orders and order_items
DROP POLICY IF EXISTS "Vendors can view orders containing their items" ON public.orders;
DROP POLICY IF EXISTS "Vendors can view shipping addresses for their orders" ON public.buyer_addresses;
