-- 20231010000042_one_review_per_buyer_product.sql
-- A buyer could submit unlimited reviews for the same product, letting anyone inflate or sink
-- a store's rating. Allow one review per buyer per product; the app now updates the existing
-- review when the buyer reviews again.
--
-- If duplicates already exist, keep each buyer's most recent review for a product and remove
-- the older copies before adding the unique index.

DELETE FROM public.reviews r
USING public.reviews newer
WHERE r.buyer_id = newer.buyer_id
  AND r.product_id = newer.product_id
  AND (r.created_at, r.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_buyer_product
    ON public.reviews (buyer_id, product_id);
