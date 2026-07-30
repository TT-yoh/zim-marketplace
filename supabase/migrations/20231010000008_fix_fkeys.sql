-- 20231010000008_fix_fkeys.sql

-- Fix foreign keys to reference auth.users instead of public.users

-- 1. Orders table
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_buyer_id_fkey 
  FOREIGN KEY (buyer_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 2. Shops table
ALTER TABLE public.shops 
  DROP CONSTRAINT IF EXISTS shops_owner_id_fkey;

ALTER TABLE public.shops 
  ADD CONSTRAINT shops_owner_id_fkey 
  FOREIGN KEY (owner_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
