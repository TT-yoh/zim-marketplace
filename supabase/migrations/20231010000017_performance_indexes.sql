-- 20231010000017_performance_indexes.sql
-- Performance indexes to speed up common filter, sorting, and join queries across ZimMarket

-- Index for product browsing & pagination (in-stock items ordered by creation date)
CREATE INDEX IF NOT EXISTS idx_products_stock_created 
ON public.products (stock_quantity, created_at DESC);

-- Index for vendor inventory lookup
CREATE INDEX IF NOT EXISTS idx_products_shop_id 
ON public.products (shop_id);

-- Index for buyer orders lookup
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id 
ON public.orders (buyer_id);

-- Index for vendor order items lookup & status filter
CREATE INDEX IF NOT EXISTS idx_order_items_shop_id_status 
ON public.order_items (shop_id, status);

-- Index for product & vendor review lookups
CREATE INDEX IF NOT EXISTS idx_reviews_vendor_product 
ON public.reviews (vendor_id, product_id);
