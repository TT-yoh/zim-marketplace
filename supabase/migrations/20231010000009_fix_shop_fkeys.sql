-- 20231010000009_fix_shop_fkeys.sql

-- The app uses vendor_profiles.id (which is the user's ID) as the shop_id. 
-- We need to update the foreign keys to reference vendor_profiles instead of the old shops table.

ALTER TABLE public.order_items 
  DROP CONSTRAINT IF EXISTS order_items_shop_id_fkey;

ALTER TABLE public.order_items 
  ADD CONSTRAINT order_items_shop_id_fkey 
  FOREIGN KEY (shop_id) 
  REFERENCES public.vendor_profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.products 
  DROP CONSTRAINT IF EXISTS products_shop_id_fkey;

ALTER TABLE public.products 
  ADD CONSTRAINT products_shop_id_fkey 
  FOREIGN KEY (shop_id) 
  REFERENCES public.vendor_profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.vendor_balances 
  DROP CONSTRAINT IF EXISTS vendor_balances_shop_id_fkey;

ALTER TABLE public.vendor_balances 
  ADD CONSTRAINT vendor_balances_shop_id_fkey 
  FOREIGN KEY (shop_id) 
  REFERENCES public.vendor_profiles(id) 
  ON DELETE CASCADE;
