// Data helpers for the vendor dashboard (moved verbatim from VendorInventory.jsx).
import { supabase } from '../supabaseClient.js';

// Persistent SWR cache for 0ms instant dashboard tab transitions
const getInitialVendorInventoryCache = () => {
    try {
        const saved = localStorage.getItem('zimmarket_vendor_inventory_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
                return parsed;
            }
        }
    } catch (e) {}
    return {
        products: null,
        salesStats: null,
        chartOrderItems: null,
        allVendors: null,
        vendorProfile: null,
        hasProfile: null,
        isAdmin: null,
        shopId: null,
        selectedShopId: null,
        timestamp: 0
    };
};

// Shared mutable SWR cache (was a module-level `let` in VendorInventory.jsx).
export const vendorInventoryCache = { current: getInitialVendorInventoryCache() };

export const PLATFORM_CATEGORIES = {
    'Electronics': ['Phones & Tablets', 'Laptops & Computers', 'Audio & Speakers', 'TV & Home Entertainment', 'Accessories'],
    'Fashion': ["Men's Wear", "Women's Wear", 'Footwear', 'Watches & Jewelry', 'Accessories'],
    'Auto Parts': ['Batteries & Electrical', 'Engine Parts', 'Tires & Wheels', 'Brakes & Suspension', 'Accessories'],
    'Solar & Energy': ['Solar Panels', 'Inverters & Batteries', 'Solar Geysers', 'Backup Lighting', 'Installation Kits'],
    'Agriculture': ['Seeds & Fertilizers', 'Irrigation & Pumps', 'Livestock Equipment', 'Farm Implements', 'Agro-Chemicals'],
    'Home & Hardware': ['Furniture', 'Kitchen & Appliances', 'Building Materials & Tools', 'Decor & Lighting', 'Garden & Outdoor'],
    'Vehicles': ['Cars & Sedans', 'Trucks & Commercial', 'Motorcycles', 'Bicycles & Scooters', 'Spare Vehicles'],
    'Beauty & Health': ['Skincare & Cosmetics', 'Hair Care', 'Fragrances & Body', 'Health & Wellness'],
    'Other': ['General Supplies', 'Services & Labor', 'Miscellaneous']
};

// Loads vendor list, admin flag, store profile, full product catalog and sales stats.
export async function loadVendorInventory({
    shopId, selectedShopId, setLoading, setAllVendors, setIsAdmin, setSelectedShopId,
    setHasProfile, setVendorProfile, setProducts, setChartOrderItems, setSalesStats
}) {
    try {
        const activeTargetShopId = selectedShopId;
        if (!vendorInventoryCache.current.products || vendorInventoryCache.current.products.length === 0) {
            setLoading(true);
        }

        // 1. Build queries to execute in parallel
        const vendorsPromise = supabase
            .from('vendor_profiles')
            .select('id, store_name, whatsapp_number, is_verified')
            .order('store_name', { ascending: true });

        const adminPromise = supabase
            .from('platform_admins')
            .select('*')
            .eq('id', shopId)
            .maybeSingle();

        const profilePromise = activeTargetShopId === 'ALL'
            ? Promise.resolve({ data: { store_name: 'All Stores (Global Superadmin)' } })
            : supabase.from('vendor_profiles').select('*').eq('id', activeTargetShopId).maybeSingle();

        let productQuery = supabase
            .from('products')
            .select('id, item_no, title, description, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit, is_promotion, promo_discount_percent, is_featured_hero', { count: 'exact' })
            .order('price_cents', { ascending: false })
            .range(0, 999);

        if (activeTargetShopId !== 'ALL') {
            productQuery = productQuery.eq('shop_id', activeTargetShopId);
        }

        let salesQuery = supabase
            .from('order_items')
            .select('product_id, quantity, price_at_purchase_cents, status, created_at')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (activeTargetShopId !== 'ALL') {
            salesQuery = salesQuery.eq('shop_id', activeTargetShopId);
        }

        // Execute all queries simultaneously
        const [vListRes, adminCheckRes, profileRes, productsFirstRes, salesRes] = await Promise.all([
            vendorsPromise,
            adminPromise,
            profilePromise,
            productQuery,
            salesQuery
        ]);

        if (vListRes.data) setAllVendors(vListRes.data);
        if (adminCheckRes.data) setIsAdmin(true);

        // Non-admins can only view their own store (e.g. a stale cached 'ALL' selection)
        if (!adminCheckRes.data && shopId && activeTargetShopId !== shopId) {
            setSelectedShopId(shopId);
            return;
        }

        if (profileRes.data) {
            setHasProfile(true);
            setVendorProfile(profileRes.data);
        } else if (shopId && shopId !== 'ALL' && typeof shopId === 'string' && shopId.length === 36) {
            supabase.from('vendor_profiles').upsert({
                id: shopId,
                store_name: 'My Store',
                whatsapp_number: '263770000000',
                is_active: true
            }, { onConflict: 'id' }).then(({ error: upErr }) => {
                if (!upErr) {
                    setHasProfile(true);
                    setVendorProfile({ id: shopId, store_name: 'My Store', whatsapp_number: '263770000000' });
                }
            });
        } else {
            setHasProfile(true);
            setVendorProfile({ store_name: 'My Store' });
        }

        let safeProductsRes = productsFirstRes;
        const baseCols = 'id, item_no, title, description, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit';
        let usedPromoCols = true;

        if (safeProductsRes.error && (safeProductsRes.error.code === '42703' || safeProductsRes.error.message?.includes('does not exist'))) {
            usedPromoCols = false;
            let fallbackQuery = supabase
                .from('products')
                .select(baseCols, { count: 'exact' })
                .order('price_cents', { ascending: false })
                .range(0, 999);
            if (activeTargetShopId !== 'ALL') fallbackQuery = fallbackQuery.eq('shop_id', activeTargetShopId);
            safeProductsRes = await fallbackQuery;
            if (safeProductsRes.data) {
                safeProductsRes.data = safeProductsRes.data.map(p => ({
                    ...p,
                    is_promotion: false,
                    promo_discount_percent: 0,
                    is_featured_hero: false
                }));
            }
        }

        let allProductsList = safeProductsRes.data || [];
        const totalCatalogCount = safeProductsRes.count || allProductsList.length;

        // Immediately display the first batch of up to 1,000 items
        setProducts(allProductsList);
        setLoading(false);

        // If catalog has more than 1,000 items (e.g. 4,306 products), stream in remaining batches in parallel
        if (totalCatalogCount > allProductsList.length) {
            const chunkPromises = [];
            const activeCols = usedPromoCols 
                ? 'id, item_no, title, description, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit, is_promotion, promo_discount_percent, is_featured_hero'
                : baseCols;

            for (let offset = 1000; offset < totalCatalogCount; offset += 1000) {
                let pageQuery = supabase
                    .from('products')
                    .select(activeCols)
                    .order('price_cents', { ascending: false })
                    .range(offset, offset + 999);

                if (activeTargetShopId !== 'ALL') {
                    pageQuery = pageQuery.eq('shop_id', activeTargetShopId);
                }
                chunkPromises.push(pageQuery);
            }

            try {
                const chunkResults = await Promise.all(chunkPromises);
                chunkResults.forEach(res => {
                    if (res.data && res.data.length > 0) {
                        const enriched = usedPromoCols ? res.data : res.data.map(p => ({
                            ...p,
                            is_promotion: false,
                            promo_discount_percent: 0,
                            is_featured_hero: false
                        }));
                        allProductsList = allProductsList.concat(enriched);
                    }
                });

                // Update state with complete catalog (e.g. all 4,305+ items)
                setProducts(allProductsList);
            } catch (chunkErr) {
                console.warn("Failed fetching remaining product batches:", chunkErr);
            }
        }

        // Compute sales stats
        const salesData = salesRes.data || [];
        setChartOrderItems(salesData);

        let computedStats = {
            totalRevenue: 0,
            completedOrdersCount: 0,
            totalUnitsSold: 0,
            averageOrderValueCents: 0,
            topProducts: []
        };

        if (salesData.length > 0) {
            const productSalesMap = {};
            let totalRevenueCents = 0;
            let totalUnitsSold = 0;
            let completedOrdersCount = 0;

            salesData.forEach(item => {
                if (item.status === 'delivered') {
                    const qty = item.quantity || 1;
                    const itemRevenue = (item.price_at_purchase_cents || 0) * qty;
                    totalRevenueCents += itemRevenue;
                    totalUnitsSold += qty;
                    completedOrdersCount++;

                    if (item.product_id) {
                        if (!productSalesMap[item.product_id]) {
                            productSalesMap[item.product_id] = {
                                productId: item.product_id,
                                unitsSold: 0,
                                revenueCents: 0
                            };
                        }
                        productSalesMap[item.product_id].unitsSold += qty;
                        productSalesMap[item.product_id].revenueCents += itemRevenue;
                    }
                }
            });

            const topProducts = Object.values(productSalesMap)
                .sort((a, b) => b.revenueCents - a.revenueCents)
                .slice(0, 5)
                .map(sp => {
                    const matched = allProductsList.find(p => p.id === sp.productId);
                    return {
                        ...sp,
                        title: matched?.title || 'Catalog Item',
                        image_url: matched?.image_url,
                        category: matched?.category,
                        stock_quantity: matched?.stock_quantity ?? 0,
                        price_cents: matched?.price_cents ?? 0
                    };
                });

            const totalRevenue = totalRevenueCents / 100;
            const averageOrderValueCents = completedOrdersCount > 0 ? Math.round(totalRevenueCents / completedOrdersCount) : 0;

            computedStats = {
                totalRevenue,
                completedOrdersCount,
                totalUnitsSold,
                averageOrderValueCents,
                topProducts
            };
        }

        setSalesStats(computedStats);

        // Update SWR cache immediately so subsequent visits render in 0ms
        const updatedCache = {
            products: allProductsList,
            salesStats: computedStats,
            chartOrderItems: salesData,
            allVendors: vListRes.data || [],
            vendorProfile: profileRes.data || { store_name: 'My Store' },
            hasProfile: true,
            isAdmin: !!adminCheckRes.data,
            shopId,
            selectedShopId: activeTargetShopId,
            timestamp: Date.now()
        };
        vendorInventoryCache.current = updatedCache;

        try {
            // Save lightweight slice in localStorage for instant 0ms tab switching
            const lightweightVendorCache = {
                ...updatedCache,
                products: allProductsList.slice(0, 100)
            };
            localStorage.setItem('zimmarket_vendor_inventory_cache', JSON.stringify(lightweightVendorCache));
        } catch (cacheErr) {
            console.warn("Could not save vendor inventory cache to localStorage:", cacheErr);
        }

        setLoading(false);

    } catch (err) {
        console.error("Failed loading inventory or profile:", err.message);
        setLoading(false);
    }
}

export function downloadInventoryCsv(products, getFormattedPrice) {
    const headers = ["Item SKU", "Title", "Brand", "Category", "Sub-Category", "Condition", "Stock Qty", "Unit Price (Incl VAT)", "Est. Total Value", "Created Date"];
    const rows = products.map(p => {
        const title = `"${(p.title || '').replace(/"/g, '""')}"`;
        const brand = `"${(p.brand || '').replace(/"/g, '""')}"`;
        const cat = `"${(p.category || '').replace(/"/g, '""')}"`;
        const subCat = `"${(p.sub_category || '').replace(/"/g, '""')}"`;
        const priceFormatted = getFormattedPrice(p.price_cents);
        const estValueFormatted = getFormattedPrice(p.price_cents * (p.stock_quantity || 0));
        const date = new Date(p.created_at || Date.now()).toLocaleDateString();

        return [
            p.item_no || p.id.split('-')[0],
            title,
            brand,
            cat,
            subCat,
            p.condition || 'New',
            p.stock_quantity || 0,
            `"${priceFormatted}"`,
            `"${estValueFormatted}"`,
            date
        ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ZimMarket_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
