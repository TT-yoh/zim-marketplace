-- 20231010000050_product_search.sql
-- Server-side product search, so search covers the whole catalogue without the browser having
-- to download every product first (the storefront still streams the catalogue for browsing).
-- Every word typed must appear in the title, item number, category or sub-category.
-- A trigram index makes the substring matching (ILIKE '%word%') fast on large catalogues.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm') THEN
        CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_search_trgm ON public.products
                 USING gin ((lower(coalesce(title, '''') || '' '' || coalesce(item_no, '''') || '' '' ||
                             coalesce(category, '''') || '' '' || coalesce(sub_category, ''''))) extensions.gin_trgm_ops)';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.search_products(
    p_query TEXT,
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    item_no TEXT,
    title TEXT,
    price_cents INTEGER,
    stock_quantity INTEGER,
    image_url TEXT,
    category TEXT,
    sub_category TEXT,
    condition TEXT,
    shop_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    unit TEXT,
    is_promotion BOOLEAN,
    promo_discount_percent NUMERIC,
    total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER  -- runs with the caller's rights, so products RLS still applies
SET search_path = public
AS $$
    WITH words AS (
        SELECT array_agg('%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%') AS pats
        FROM regexp_split_to_table(lower(trim(coalesce(p_query, ''))), '\s+') AS w
        WHERE length(w) > 0
    ),
    matches AS (
        SELECT p.*,
               lower(coalesce(p.title, '') || ' ' || coalesce(p.item_no, '') || ' ' ||
                     coalesce(p.category, '') || ' ' || coalesce(p.sub_category, '')) AS haystack
        FROM public.products p
        LEFT JOIN public.vendor_profiles v ON v.id = p.shop_id
        CROSS JOIN words
        WHERE words.pats IS NOT NULL
          AND p.stock_quantity > 0
          AND COALESCE(v.is_active, true)
          AND (p_category IS NULL OR p.category = p_category)
          AND lower(coalesce(p.title, '') || ' ' || coalesce(p.item_no, '') || ' ' ||
                    coalesce(p.category, '') || ' ' || coalesce(p.sub_category, '')) LIKE ALL (words.pats)
    )
    SELECT m.id, m.item_no::TEXT, m.title::TEXT, m.price_cents, m.stock_quantity, m.image_url::TEXT,
           m.category::TEXT, m.sub_category::TEXT, m.condition::TEXT, m.shop_id, m.created_at, m.unit::TEXT,
           COALESCE(m.is_promotion, false), COALESCE(m.promo_discount_percent, 0)::NUMERIC,
           count(*) OVER () AS total_count
    FROM matches m
    ORDER BY
        -- title starts with the query, then item number match, then title contains it
        (lower(m.title) LIKE lower(trim(p_query)) || '%') DESC,
        (lower(coalesce(m.item_no, '')) = lower(trim(p_query))) DESC,
        (position(lower(trim(p_query)) IN lower(coalesce(m.title, ''))) > 0) DESC,
        m.price_cents > 0 DESC,
        m.title
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE EXECUTE ON FUNCTION public.search_products(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_products(TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;
