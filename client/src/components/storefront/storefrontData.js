// Storefront catalog loading + SWR cache (moved verbatim from BuyerStorefront.jsx).
import { supabase } from '../supabaseClient.js';

// Synchronous persistent cache helper for 0ms instant cold-boot & tab switching
const getInitialStorefrontCache = () => {
    try {
        const saved = localStorage.getItem('zimmarket_storefront_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
    return {
        products: null,
        vendorProfiles: null,
        reviewsByProduct: null,
        dbCategories: null,
        timestamp: 0
    };
};

// Shared mutable SWR cache (was a module-level `let` in BuyerStorefront.jsx).
export const storefrontCache = { current: getInitialStorefrontCache() };

// Fetches products, vendor profiles, reviews and categories for the storefront.
export async function loadStorefront({ setProducts, setVendorProfiles, setReviewsByProduct, setDbCategories, setSelectedVendorShopId, setLoading }) {
    try {
        const PROMO_COLS = 'id, item_no, title, description, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit, is_promotion, promo_discount_percent, is_featured_hero';
        const BASE_COLS = 'id, item_no, title, description, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit';

        let activeColumns = PROMO_COLS;

        // Fetch Products, Vendor Profiles, Reviews, and Categories
        let [productsRes, vendorsRes, reviewsRes, categoriesRes] = await Promise.all([
            supabase
                .from('products')
                .select(activeColumns, { count: 'exact' })
                .gt('stock_quantity', 0)
                .order('price_cents', { ascending: false })
                .range(0, 999),
            supabase
                .from('vendor_profiles')
                .select('*'),
            supabase
                .from('reviews')
                .select('vendor_id, product_id, rating'),
            supabase
                .from('categories')
                .select('*')
                .order('display_order', { ascending: true })
        ]);

        // Gracefully fallback to base columns if promotion columns are not present in schema
        if (productsRes.error && (productsRes.error.code === '42703' || productsRes.error.message?.includes('does not exist'))) {
            console.warn("Notice: Promotion columns not found on products table, streaming base inventory:", productsRes.error.message);
            activeColumns = BASE_COLS;
            productsRes = await supabase
                .from('products')
                .select(activeColumns, { count: 'exact' })
                .gt('stock_quantity', 0)
                .order('price_cents', { ascending: false })
                .range(0, 999);
        }

        if (categoriesRes.data) {
            setDbCategories(categoriesRes.data);
        }

        if (productsRes.error) throw productsRes.error;

        const vendorMap = {};
        if (vendorsRes.data) {
            vendorsRes.data.forEach(v => vendorMap[v.id] = v);
        }

        let allStorefrontProducts = (productsRes.data || []).map(p => {
            const v = vendorMap[p.shop_id];
            return {
                ...p,
                shop_name: v?.store_name || 'Store in App',
                is_verified: v?.is_verified ?? false,
                is_promotion: p.is_promotion ?? false,
                promo_discount_percent: p.promo_discount_percent ?? 0,
                is_featured_hero: p.is_featured_hero ?? false
            };
        });
        const totalStorefrontCount = productsRes.count || allStorefrontProducts.length;

        let activeProducts = allStorefrontProducts.filter(p => {
            const v = vendorMap[p.shop_id];
            return !v || v.is_active !== false;
        });

        // Immediately display first batch
        setProducts(activeProducts);

        // If in-stock catalog exceeds 1,000 items, fetch remaining batches in parallel
        if (totalStorefrontCount > allStorefrontProducts.length) {
            const storefrontPromises = [];
            for (let offset = 1000; offset < totalStorefrontCount; offset += 1000) {
                storefrontPromises.push(
                    supabase
                        .from('products')
                        .select(activeColumns)
                        .gt('stock_quantity', 0)
                        .order('price_cents', { ascending: false })
                        .range(offset, offset + 999)
                );
            }

            try {
                const batchResults = await Promise.all(storefrontPromises);
                batchResults.forEach(res => {
                    if (res.data && res.data.length > 0) {
                        const enrichedBatch = res.data.map(p => {
                            const v = vendorMap[p.shop_id];
                            return {
                                ...p,
                                shop_name: v?.store_name || 'Store in App',
                                is_verified: v?.is_verified ?? false,
                                is_promotion: p.is_promotion ?? false,
                                promo_discount_percent: p.promo_discount_percent ?? 0,
                                is_featured_hero: p.is_featured_hero ?? false
                            };
                        });
                        allStorefrontProducts = allStorefrontProducts.concat(enrichedBatch);
                    }
                });

                // Update with complete inventory
                activeProducts = allStorefrontProducts.filter(p => {
                    const v = vendorMap[p.shop_id];
                    return !v || v.is_active !== false;
                });
                setProducts(activeProducts);
            } catch (batchErr) {
                console.warn("Storefront batch fetching notice:", batchErr);
            }
        }

        let prodReviews = {};
        if (reviewsRes.data) {
            const vendorRatings = {}; // { vendor_id: { sum, count } }

            reviewsRes.data.forEach(r => {
                if (!vendorRatings[r.vendor_id]) vendorRatings[r.vendor_id] = { sum: 0, count: 0 };
                vendorRatings[r.vendor_id].sum += r.rating;
                vendorRatings[r.vendor_id].count += 1;

                if (r.product_id) {
                    if (!prodReviews[r.product_id]) prodReviews[r.product_id] = [];
                    prodReviews[r.product_id].push(r);
                }
            });

            Object.keys(vendorRatings).forEach(vid => {
                if (vendorMap[vid]) {
                    vendorMap[vid].avgRating = (vendorRatings[vid].sum / vendorRatings[vid].count).toFixed(1);
                    vendorMap[vid].reviewCount = vendorRatings[vid].count;
                }
            });

            setReviewsByProduct(prodReviews);
        }

        setVendorProfiles(vendorMap);

        // Auto-detect vanity store slug or vendor id from URL (e.g. ?store=mms-autoparts)
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const storeSlugParam = urlParams.get('store');
            const vendorIdParam = urlParams.get('vendor');

            if (storeSlugParam || vendorIdParam) {
                const matched = Object.values(vendorMap).find(v => {
                    if (vendorIdParam && v.id === vendorIdParam) return true;
                    if (storeSlugParam) {
                        const cleanSlug = storeSlugParam.toLowerCase().trim();
                        if (v.store_slug && v.store_slug.toLowerCase() === cleanSlug) return true;
                        if (v.store_name && v.store_name.toLowerCase().replace(/[^a-z0-9]/g, '-') === cleanSlug) return true;
                    }
                    return false;
                });
                if (matched) {
                    setSelectedVendorShopId(matched.id);
                }
            }
        } catch (e) {
            console.warn("Could not parse store URL params:", e);
        }

        // Update global SWR and persistent cache for instant 0ms tab switching
        const updatedCache = {
            products: activeProducts,
            vendorProfiles: vendorMap,
            reviewsByProduct: reviewsRes.data ? prodReviews : (storefrontCache.current.reviewsByProduct || {}),
            dbCategories: categoriesRes.data || storefrontCache.current.dbCategories || [],
            timestamp: Date.now()
        };
        storefrontCache.current = updatedCache;
        try {
            // Save lightweight slice in localStorage to guarantee 0ms instant warm boots
            const lightweightCache = {
                products: activeProducts.slice(0, 150),
                vendorProfiles: vendorMap,
                reviewsByProduct: reviewsRes.data ? prodReviews : (storefrontCache.current.reviewsByProduct || {}),
                dbCategories: categoriesRes.data || storefrontCache.current.dbCategories || [],
                timestamp: Date.now()
            };
            localStorage.setItem('zimmarket_storefront_cache', JSON.stringify(lightweightCache));
        } catch (e) {
            console.warn('Could not save storefront cache to localStorage:', e);
        }
    } catch (err) {
        console.error("Failed loading buyer catalog:", err.message);
    } finally {
        setLoading(false);
    }
}
