-- 20231010000044_protect_sold_products.sql
-- order_items.product_id referenced products ON DELETE CASCADE, so when a vendor deleted a
-- product that had already sold, the database silently deleted the buyers' order lines too,
-- including paid and shipped ones. The money stayed in escrow with no item left to deliver,
-- confirm or refund. (Row-level security doesn't apply to cascades, so the
-- "admins only can delete order items" policy didn't stop it.)
--
-- Sold products can no longer be deleted; the app offers to mark them out of stock instead,
-- which hides them from the shop while keeping every order intact.

ALTER TABLE public.order_items
    DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
