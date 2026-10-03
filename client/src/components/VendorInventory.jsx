import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient.js';
import { ProductUploadForm } from './ProductUploadForm.jsx';
import { VendorProfileSetup } from './VendorProfileSetup.jsx';
import { BulkProductUpload } from './BulkProductUpload.jsx';
import { VendorWallet } from './VendorWallet.jsx';
import { SalesTrendChart } from './SalesTrendChart.jsx';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';
import { matchProductImage } from '../utils/productImageMatcher.js';
import { useToast } from './ToastContext.jsx';
import { useModal } from './ModalContext.jsx';

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

let globalVendorInventoryCache = getInitialVendorInventoryCache();

const PLATFORM_CATEGORIES = {
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

export function VendorInventory({ shopId, setCurrentView, currency = 'USD', formatPrice }) {
    const { showToast } = useToast();
    const { showConfirm, showPrompt } = useModal();
    const getFormattedPrice = (cents) => {
        if (!cents || isNaN(cents) || cents <= 0) return 'Price on Request';
        if (formatPrice) return formatPrice(cents, currency);
        return `$${(cents / 100).toFixed(2)}`;
    };

    // Superadmin Multi-Store Support
    const [isAdmin, setIsAdmin] = useState(() => globalVendorInventoryCache.isAdmin ?? false);
    const [allVendors, setAllVendors] = useState(() => globalVendorInventoryCache.allVendors || []);
    const [selectedShopId, setSelectedShopId] = useState(() => globalVendorInventoryCache.selectedShopId || 'ALL');

    const [products, setProducts] = useState(() => globalVendorInventoryCache.products || []);
    const [chartOrderItems, setChartOrderItems] = useState(() => globalVendorInventoryCache.chartOrderItems || []);
    const [hasProfile, setHasProfile] = useState(() => globalVendorInventoryCache.hasProfile ?? null);
    const [vendorProfile, setVendorProfile] = useState(() => globalVendorInventoryCache.vendorProfile || null);
    const [loading, setLoading] = useState(() => !globalVendorInventoryCache.products || globalVendorInventoryCache.products.length === 0);
    const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'bulk'
    const [showUploadModal, setShowUploadModal] = useState(false);
    
    // Pagination & Search States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [inventorySearch, setInventorySearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [stockFilter, setStockFilter] = useState('all');
    const [isMatchingImages, setIsMatchingImages] = useState(false);
    
    // Bulk Multi-Select State
    const [selectedProductIds, setSelectedProductIds] = useState(() => new Set());
    
    const [salesStats, setSalesStats] = useState(() => globalVendorInventoryCache.salesStats || {
        totalRevenue: 0,
        completedOrdersCount: 0,
        totalUnitsSold: 0,
        averageOrderValueCents: 0,
        topProducts: []
    });

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        category: 'Electronics',
        subCategory: '',
        condition: 'New',
        itemNo: '',
        description: '',
        priceIncl: '',
        stockQuantity: 1,
        colors: '',
        sizes: '',
        unit: 'EA',
        imageUrl: ''
    });
    const [savingEdit, setSavingEdit] = useState(false);

    // Bulk Price Adjustment Variables State
    const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
    const [bulkPriceMode, setBulkPriceMode] = useState('percent_increase'); // percent_increase, percent_discount, fixed_increase, fixed_decrease, set_fixed
    const [bulkPriceValue, setBulkPriceValue] = useState('10');
    const [applyingBulkPrice, setApplyingBulkPrice] = useState(false);

    const handleStartEdit = (product) => {
        setEditingId(product.id);
        setEditForm({
            title: product.title || '',
            brand: product.brand || '',
            category: product.category || 'Electronics',
            subCategory: product.sub_category || '',
            condition: product.condition || 'New',
            itemNo: product.item_no || '',
            description: product.description || '',
            priceIncl: (product.price_cents / 100).toFixed(2),
            stockQuantity: product.stock_quantity ?? 1,
            colors: Array.isArray(product.colors) ? product.colors.join(', ') : '',
            sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
            unit: product.unit || 'EA',
            imageUrl: product.image_url || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleEditFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            try {
                const uploadedUrl = await uploadImageToStorage(file, 'product-images', shopId);
                if (uploadedUrl) {
                    setEditForm(prev => ({ ...prev, imageUrl: uploadedUrl }));
                }
            } catch (err) {
                console.error('File edit upload failed:', err);
            }
        }
    };

    const handleSaveEdit = async (productId) => {
        setSavingEdit(true);
        try {
            const priceInclCents = Math.round(parseFloat(editForm.priceIncl) * 100);
            if (isNaN(priceInclCents)) throw new Error('Invalid price format');

            const parsedColors = editForm.colors.split(',').map(c => c.trim()).filter(Boolean);
            const parsedSizes = editForm.sizes.split(',').map(s => s.trim()).filter(Boolean);

            const priceExclCents = Math.round(priceInclCents / 1.15);
            const updatePayload = {
                title: editForm.title.trim(),
                brand: editForm.brand ? editForm.brand.trim() : '',
                category: editForm.category,
                sub_category: editForm.subCategory ? editForm.subCategory.trim() : null,
                condition: editForm.condition,
                item_no: editForm.itemNo ? editForm.itemNo.trim() : null,
                description: editForm.description ? editForm.description.trim() : null,
                price_cents: priceInclCents,
                price_incl_vat_cents: priceInclCents,
                price_excl_vat_cents: priceExclCents,
                stock_quantity: parseInt(editForm.stockQuantity, 10) || 0,
                colors: parsedColors,
                sizes: parsedSizes,
                unit: editForm.unit || 'EA',
                image_url: editForm.imageUrl || null
            };

            let { error } = await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', productId);

            if (error && error.message && error.message.toLowerCase().includes('brand')) {
                const { brand: _b, ...fallbackPayload } = updatePayload;
                const { error: retryError } = await supabase
                    .from('products')
                    .update(fallbackPayload)
                    .eq('id', productId);
                if (retryError) throw retryError;
            } else if (error) {
                throw error;
            }

            setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                    return {
                        ...p,
                        ...updatePayload
                    };
                }
                return p;
            }));

            setEditingId(null);
            showToast('✓ Product variables updated successfully!', 'success');
        } catch (err) {
            showToast(`Failed saving edit: ${err.message}`, 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleApplyBulkPriceAdjustment = async () => {
        const val = parseFloat(bulkPriceValue);
        if (isNaN(val) || val <= 0) {
            showToast("Please enter a valid positive number for adjustment.", "warning");
            return;
        }

        const selectedCount = selectedProductIds.size;
        if (selectedCount === 0) return;

        setApplyingBulkPrice(true);
        try {
            const idsToUpdate = Array.from(selectedProductIds);
            const updatedPriceMap = {};

            setProducts(prev => prev.map(p => {
                if (selectedProductIds.has(p.id)) {
                    let currentCents = p.price_cents || 0;
                    let newCents = currentCents;

                    if (bulkPriceMode === 'percent_increase') {
                        newCents = Math.round(currentCents * (1 + val / 100));
                    } else if (bulkPriceMode === 'percent_discount') {
                        newCents = Math.max(10, Math.round(currentCents * (1 - val / 100)));
                    } else if (bulkPriceMode === 'fixed_increase') {
                        newCents = currentCents + Math.round(val * 100);
                    } else if (bulkPriceMode === 'fixed_decrease') {
                        newCents = Math.max(10, currentCents - Math.round(val * 100));
                    } else if (bulkPriceMode === 'set_fixed') {
                        newCents = Math.round(val * 100);
                    }

                    updatedPriceMap[p.id] = newCents;
                    return {
                        ...p,
                        price_cents: newCents,
                        price_incl_vat_cents: newCents
                    };
                }
                return p;
            }));

            // Push updates in parallel batches of 50
            for (let i = 0; i < idsToUpdate.length; i += 50) {
                const batch = idsToUpdate.slice(i, i + 50);
                await Promise.all(batch.map(id =>
                    supabase.from('products').update({
                        price_cents: updatedPriceMap[id],
                        price_incl_vat_cents: updatedPriceMap[id]
                    }).eq('id', id)
                ));
            }

            showToast(`✓ Successfully updated prices for ${selectedCount} selected products!`, "success");
            setShowBulkPriceModal(false);
            setSelectedProductIds(new Set());
        } catch (err) {
            showToast(`Bulk price adjustment failed: ${err.message}`, "error");
            loadInventoryAndProfile();
        } finally {
            setApplyingBulkPrice(false);
        }
    };

    const loadInventoryAndProfile = async () => {
        try {
            const activeTargetShopId = selectedShopId;
            if (!globalVendorInventoryCache.products || globalVendorInventoryCache.products.length === 0) {
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
                .select('id, item_no, title, description, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit', { count: 'exact' })
                .order('price_cents', { ascending: false })
                .range(0, 249);

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

            if (profileRes.data) {
                setHasProfile(true);
                setVendorProfile(profileRes.data);
            } else {
                setHasProfile(true);
                setVendorProfile({ store_name: 'My Store' });
            }

            const initialItems = productsFirstRes.data || [];
            setProducts(initialItems);

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
                        const matched = initialItems.find(p => p.id === sp.productId);
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
                products: initialItems,
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
            globalVendorInventoryCache = updatedCache;

            try {
                // Save lightweight slice in localStorage for instant 0ms tab switching
                const lightweightVendorCache = {
                    ...updatedCache,
                    products: initialItems.slice(0, 100)
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
    };

    useEffect(() => {
        loadInventoryAndProfile();
    }, [shopId, selectedShopId]);

    const handleDelete = async (productId) => {
        showConfirm({
            title: "Delete Product",
            message: "Are you sure you want to delete this product listing from your store?",
            type: "warning",
            confirmText: "Delete Item",
            onConfirm: async () => {
                try {
                    // Delete any referencing order_items first just in case
                    await supabase.from('order_items').delete().eq('product_id', productId);
                    const { error } = await supabase
                        .from('products')
                        .delete()
                        .eq('id', productId);
                    
                    if (error) throw error;
                    setProducts(prev => prev.filter(p => p.id !== productId));
                    showToast("Product deleted successfully", "success");
                } catch (err) {
                    showToast(`Delete failed: ${err.message}`, "error");
                }
            }
        });
    };

    const handleToggleSelectProduct = (productId) => {
        setSelectedProductIds(prev => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    const handleSelectAllOnPage = (pageProducts) => {
        const pageIds = pageProducts.map(p => p.id);
        const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedProductIds.has(id));
        setSelectedProductIds(prev => {
            const next = new Set(prev);
            if (allPageSelected) {
                pageIds.forEach(id => next.delete(id));
            } else {
                pageIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const handleSelectAllFiltered = (matchingProducts) => {
        const allFilteredIds = matchingProducts.map(p => p.id);
        setSelectedProductIds(new Set(allFilteredIds));
        showToast(`Selected all ${allFilteredIds.length} matching products`, 'info');
    };

    const handleClearSelection = () => {
        setSelectedProductIds(new Set());
    };

    const handleDeleteSelected = async () => {
        const count = selectedProductIds.size;
        if (count === 0) return;

        showConfirm({
            title: `🗑️ Delete ${count} Selected Product${count === 1 ? '' : 's'}`,
            message: `Are you sure you want to permanently delete the ${count} selected product listing${count === 1 ? '' : 's'} from your catalog? This action cannot be undone.`,
            type: "danger",
            confirmText: `Delete ${count} Items`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    const idsToDelete = Array.from(selectedProductIds);
                    
                    // Delete in chunks of 100 to prevent PostgREST URI length limits
                    for (let i = 0; i < idsToDelete.length; i += 100) {
                        const chunk = idsToDelete.slice(i, i + 100);
                        await supabase.from('order_items').delete().in('product_id', chunk);
                        const { error } = await supabase.from('products').delete().in('id', chunk);
                        if (error) throw error;
                    }

                    setProducts(prev => {
                        const updated = prev.filter(p => !selectedProductIds.has(p.id));
                        globalVendorInventoryCache.products = updated;
                        return updated;
                    });
                    setSelectedProductIds(new Set());
                    showToast(`✓ Successfully deleted ${count} selected products!`, "success");
                } catch (err) {
                    showToast(`Bulk delete failed: ${err.message}`, "error");
                    loadInventoryAndProfile();
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleBulkRestock = async (delta = 5) => {
        const count = selectedProductIds.size;
        if (count === 0) return;

        showConfirm({
            title: `⚡ Bulk Restock +${delta} to ${count} Products`,
            message: `Add +${delta} units to all ${count} selected products?`,
            type: "info",
            confirmText: `Add +${delta} Stock`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    const idsToUpdate = Array.from(selectedProductIds);
                    const updatedProductsMap = {};

                    setProducts(prev => prev.map(p => {
                        if (selectedProductIds.has(p.id)) {
                            const newQty = (p.stock_quantity || 0) + delta;
                            updatedProductsMap[p.id] = newQty;
                            return { ...p, stock_quantity: newQty };
                        }
                        return p;
                    }));

                    // Update in parallel batches
                    for (let i = 0; i < idsToUpdate.length; i += 50) {
                        const batch = idsToUpdate.slice(i, i + 50);
                        await Promise.all(batch.map(id => 
                            supabase.from('products').update({ stock_quantity: updatedProductsMap[id] }).eq('id', id)
                        ));
                    }

                    showToast(`✓ Added +${delta} stock to ${count} selected products!`, "success");
                } catch (err) {
                    showToast(`Bulk restock failed: ${err.message}`, "error");
                    loadInventoryAndProfile();
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleDeleteAllProducts = async () => {
        if (!products || products.length === 0) {
            showToast("No products found in this store to delete.", "info");
            return;
        }

        const isGlobalAll = selectedShopId === 'ALL';
        const targetShopName = isGlobalAll 
            ? 'ALL STORES (Entire Marketplace Catalog)' 
            : (vendorProfile?.store_name || 'this store');

        showPrompt({
            title: `⚠️ Delete All Products for ${targetShopName}`,
            message: `Are you sure you want to permanently delete all ${products.length} products belonging to ${targetShopName}? This will purge these listings completely.`,
            type: "danger",
            expectedText: isGlobalAll ? "PURGE ALL" : "DELETE ALL",
            placeholder: isGlobalAll ? 'Type "PURGE ALL" to confirm' : 'Type "DELETE ALL" to confirm',
            confirmText: `Permanently Delete Products`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    if (isGlobalAll) {
                        // Purge all marketplace products
                        await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        const { error: deleteError } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        if (deleteError) throw deleteError;
                        showToast("✓ All marketplace catalog products have been deleted.", "success");
                    } else {
                        const targetShop = selectedShopId;
                        const { error: rpcError } = await supabase.rpc('vendor_purge_inventory', { target_shop_id: targetShop });
                        if (rpcError) {
                            await supabase.from('order_items').delete().eq('shop_id', targetShop);
                            const { error: deleteError } = await supabase.from('products').delete().eq('shop_id', targetShop);
                            if (deleteError) throw deleteError;
                        }
                        showToast(`✓ All products for ${targetShopName} have been deleted.`, "success");
                    }

                    setProducts([]);
                    setSelectedProductIds(new Set());
                    globalVendorInventoryCache.products = [];
                    await loadInventoryAndProfile();
                } catch (err) {
                    showToast(`Delete failed: ${err.message}`, "error");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // Low Stock Alert Engine & Quick Restock
    const [customLowStockThreshold, setCustomLowStockThreshold] = useState(null);
    const lowStockThreshold = customLowStockThreshold ?? (
        vendorProfile?.low_stock_threshold || 
        vendorProfile?.shipping_settings?.low_stock_threshold || 
        3
    );
    const outOfStockProducts = useMemo(() => {
        return products.filter(p => (p.stock_quantity ?? 0) <= 0);
    }, [products]);

    const lowStockProducts = useMemo(() => {
        return products.filter(p => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= lowStockThreshold);
    }, [products]);

    const handleQuickRestock = async (productId, delta = 5) => {
        try {
            const product = products.find(p => p.id === productId);
            if (!product) return;
            const newStock = Math.max(0, (product.stock_quantity || 0) + delta);

            // Optimistic UI update
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_quantity: newStock } : p));

            const { error } = await supabase
                .from('products')
                .update({ stock_quantity: newStock })
                .eq('id', productId);

            if (error) throw error;
            showToast(`✓ Added +${delta} stock to "${product.title}" (${newStock} total in stock)`, 'success');
        } catch (err) {
            showToast(`Restock failed: ${err.message}`, 'error');
            loadInventoryAndProfile();
        }
    };

    // Filter & Paginate 10,250 Products (hooks must always run unconditionally at top level)
    const uniqueCategories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);

    const filteredInventory = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = !inventorySearch || 
                (p.title && p.title.toLowerCase().includes(inventorySearch.toLowerCase())) ||
                (p.item_no && p.item_no.toLowerCase().includes(inventorySearch.toLowerCase()));
            const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
            const stockQty = p.stock_quantity ?? 0;
            const matchesStock = stockFilter === 'all' || 
                (stockFilter === 'in_stock' && stockQty > lowStockThreshold) ||
                (stockFilter === 'out_of_stock' && stockQty <= 0) ||
                (stockFilter === 'low_stock' && stockQty > 0 && stockQty <= lowStockThreshold);
            return matchesSearch && matchesCat && matchesStock;
        });
    }, [products, inventorySearch, categoryFilter, stockFilter, lowStockThreshold]);

    const totalPages = Math.max(1, Math.ceil(filteredInventory.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedProducts = useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize;
        return filteredInventory.slice(start, start + pageSize);
    }, [filteredInventory, safeCurrentPage, pageSize]);

    const totalProducts = products.length;
    const filteredCount = filteredInventory.length;
    const outOfStock = products.filter(p => p.stock_quantity <= 0).length;
    const totalInventoryValueCents = filteredInventory.reduce((sum, p) => sum + (p.price_cents * (p.stock_quantity || 0)), 0);

    const exportToCSV = () => {
        if (!products || products.length === 0) {
            showToast("No products available to export.", "info");
            return;
        }

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
    };

    // Smart Batch Image Matcher
    const handleAutoMatchImages = async () => {
        const missingImages = products.filter(p => !p.image_url);
        if (missingImages.length === 0) {
            showToast("All items already have product images!", "info");
            return;
        }

        showConfirm({
            title: "⚡ Smart Image Matcher",
            message: `Scan and automatically attach realistic high-resolution category images to ${missingImages.length} products currently missing photos?`,
            type: "info",
            confirmText: `Auto-Assign ${missingImages.length} Images`,
            onConfirm: async () => {
                setIsMatchingImages(true);
                try {
                    let updatedCount = 0;
                    // Batch updates
                    for (let i = 0; i < missingImages.length; i += 50) {
                        const batch = missingImages.slice(i, i + 50);
                        await Promise.all(batch.map(item => {
                            const matchedUrl = matchProductImage(item.title, item.category);
                            return supabase.from('products').update({ image_url: matchedUrl }).eq('id', item.id);
                        }));
                        updatedCount += batch.length;
                    }

                    // Update local React state
                    setProducts(prev => prev.map(p => {
                        if (!p.image_url) {
                            return { ...p, image_url: matchProductImage(p.title, p.category) };
                        }
                        return p;
                    }));

                    showToast(`✓ Successfully matched & assigned images to ${updatedCount} products!`, "success");
                } catch (err) {
                    showToast(`Failed matching images: ${err.message}`, "error");
                } finally {
                    setIsMatchingImages(false);
                }
            }
        });
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading Dashboard...</div>;

    if (hasProfile === false) {
        return <VendorProfileSetup userId={shopId} onProfileCreated={loadInventoryAndProfile} />;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            
            {/* Multi-Store & Catalog Management Switcher Banner */}
            <div className="glass-panel animate-fade-in" style={{
                padding: '16px 24px',
                marginBottom: '28px',
                border: '1px solid var(--accent-primary)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                borderRadius: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>{isAdmin ? '👑' : '🏪'}</span>
                    <div>
                        <div style={{ fontWeight: '800', color: 'var(--accent-primary)', fontSize: '16px' }}>
                            {isAdmin ? 'Superadmin Global Store Manager' : 'Store & Catalog Switcher'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Select a store to view its inventory, edit prices, or switch to Global Catalog (10,250 items).
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Active Store:</label>
                    <select
                        value={selectedShopId}
                        onChange={(e) => setSelectedShopId(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontWeight: '700',
                            minWidth: '240px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">🌐 All Stores (10,250 Global Items)</option>
                        <option value={shopId}>👤 My Store (Self)</option>
                        <optgroup label="Registered Stores">
                            {allVendors.map(v => (
                                <option key={v.id} value={v.id}>
                                    🏪 {v.store_name} {v.id === 'a223a428-0469-49df-a49f-f4528bd0d6de' ? '(10,250 products)' : ''}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '32px', color: 'var(--text-primary)', margin: 0 }}>
                    {selectedShopId === 'ALL' ? 'Global Catalog Manager' : (vendorProfile?.store_name ? `${vendorProfile.store_name} Dashboard` : 'Vendor Dashboard')}
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleAutoMatchImages}
                        disabled={isMatchingImages}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                        title="Automatically assign realistic product images to catalog items missing photos"
                    >
                        {isMatchingImages ? '⏳ Matching Photos...' : '⚡ Auto-Match Photos'}
                    </button>
                    <button
                        onClick={() => { setUploadMode('single'); setShowUploadModal(true); }}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px' }}
                    >
                        ➕ Add New Product
                    </button>
                    <button
                        onClick={() => { setUploadMode('bulk'); setShowUploadModal(true); }}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px' }}
                    >
                        📁 Bulk CSV Import
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px' }}
                    >
                        📥 Export CSV Report
                    </button>
                    {products.length > 0 && (
                        <button
                            onClick={handleDeleteAllProducts}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            title={selectedShopId === 'ALL' ? "Purge all products across entire marketplace" : "Delete all products in this specific vendor store"}
                        >
                            🗑️ {selectedShopId === 'ALL' ? 'Purge All Products' : `Clear ${vendorProfile?.store_name ? `${vendorProfile.store_name}` : 'Store'} Products`}
                        </button>
                    )}
                </div>
            </div>

            {vendorProfile && !vendorProfile.is_verified && (
                <div style={{ backgroundColor: 'var(--warning-bg, rgba(241, 196, 15, 0.2))', color: 'var(--warning, #f1c40f)', padding: '16px', borderRadius: '8px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong>Your account is unverified.</strong> Buyers trust verified sellers more.
                    </div>
                    <button 
                        className="btn-primary" 
                        onClick={() => setCurrentView('vendor-verification')} 
                        style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'var(--warning)', color: '#000', border: 'none' }}
                    >
                        Get Verified
                    </button>
                </div>
            )}

            {/* Metrics Row */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Catalog Inventory</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>{totalProducts}</div>
                    <div style={{ fontSize: '12px', color: (outOfStockProducts.length > 0 || lowStockProducts.length > 0) ? '#f59e0b' : 'var(--success)', marginTop: '4px', fontWeight: '600' }}>
                        {outOfStockProducts.length > 0 
                            ? `⚠️ ${outOfStockProducts.length} out of stock` 
                            : (lowStockProducts.length > 0 ? `🟡 ${lowStockProducts.length} low stock` : '✓ 100% In Stock')}
                    </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Delivered Earnings</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--success)' }}>
                        {getFormattedPrice(salesStats.totalRevenue * 100)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {salesStats.completedOrdersCount} delivered order{salesStats.completedOrdersCount === 1 ? '' : 's'}
                    </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Units Sold & Avg Order Value</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                        {salesStats.totalUnitsSold} <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>units</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        AOV: <strong style={{ color: 'var(--text-primary)' }}>{getFormattedPrice(salesStats.averageOrderValueCents)}</strong>
                    </div>
                </div>

                <VendorWallet shopId={shopId} />
            </div>

            {/* Store Revenue & Order Trajectory Chart */}
            <SalesTrendChart 
                orders={chartOrderItems} 
                title={selectedShopId === 'ALL' ? "Global Marketplace Trajectory" : `${vendorProfile?.store_name || 'Store'} Sales Trajectory`}
                currency={currency}
                formatPrice={formatPrice}
            />

            {/* Analytics Performance & Low Stock Row */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                
                {/* Top Best-Selling Products */}
                <div className="glass-panel" style={{ flex: 1.2, minWidth: '320px', padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🏆 Top 5 Best-Selling Products
                        </h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>By Delivered GMV</span>
                    </div>

                    {salesStats.topProducts.length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            📦 No delivered sales recorded yet. Share your store link to start receiving orders!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {salesStats.topProducts.map((item, idx) => {
                                const medals = ['🥇', '🥈', '🥉', '#4', '#5'];
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{medals[idx] || `#${idx + 1}`}</span>
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.title} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📦</div>
                                            )}
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.title}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {item.category || 'Product'} • Stock: <span style={{ color: item.stock_quantity <= 3 ? '#f59e0b' : 'var(--success)', fontWeight: '600' }}>{item.stock_quantity} left</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontWeight: '700', color: 'var(--success)', fontSize: '14px' }}>
                                                {getFormattedPrice(item.revenueCents)}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {item.unitsSold} unit{item.unitsSold === 1 ? '' : 's'} sold
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Low Stock Warning Panel with 1-Click Restock */}
                <div className="glass-panel" style={{ flex: 1, minWidth: '320px', padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', color: (lowStockProducts.length > 0 || outOfStockProducts.length > 0) ? '#f59e0b' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ⚠️ Inventory Health & Restock
                        </h4>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: (lowStockProducts.length > 0 || outOfStockProducts.length > 0) ? '#f59e0b' : 'var(--success)' }}>
                            {lowStockProducts.length + outOfStockProducts.length} items needing refill
                        </span>
                    </div>

                    {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--success)', padding: '24px', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid var(--success)' }}>
                            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🎉</div>
                            <strong>All products have healthy stock levels!</strong>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Every item in your store has $\ge 4$ units available.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                            {[...outOfStockProducts, ...lowStockProducts].slice(0, 10).map(p => {
                                const isOut = (p.stock_quantity ?? 0) <= 0;
                                return (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', padding: '8px 12px', borderRadius: '8px', backgroundColor: isOut ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: isOut ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)', gap: '10px' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {p.title}
                                            </div>
                                            <div style={{ fontSize: '11px', color: isOut ? 'var(--danger)' : '#f59e0b', fontWeight: '700' }}>
                                                {isOut ? '🔴 Out of Stock (0)' : `🟡 Low Stock (${p.stock_quantity} left)`}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => handleQuickRestock(p.id, 5)}
                                                className="btn-secondary"
                                                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                                                title="Quickly add +5 units"
                                            >
                                                ⚡ +5
                                            </button>
                                            <button
                                                onClick={() => handleQuickRestock(p.id, 10)}
                                                className="btn-secondary"
                                                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                                                title="Quickly add +10 units"
                                            >
                                                ⚡ +10
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

            {/* High Visibility Low Inventory Alert Banner */}
            {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                <div className="glass-panel animate-fade-in-up" style={{
                    padding: '16px 20px',
                    marginBottom: '20px',
                    backgroundColor: outOfStockProducts.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: outOfStockProducts.length > 0 ? '1px solid var(--danger)' : '1px solid var(--warning)',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>
                            {outOfStockProducts.length > 0 ? '🚨' : '⚠️'}
                        </span>
                        <div>
                            <strong style={{ color: outOfStockProducts.length > 0 ? 'var(--danger)' : '#f59e0b', fontSize: '15px' }}>
                                Inventory Alert: Low Stock & Restock Required
                            </strong>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {outOfStockProducts.length > 0 && (
                                    <span style={{ color: 'var(--danger)', fontWeight: '600', marginRight: '10px' }}>
                                        • {outOfStockProducts.length} product{outOfStockProducts.length === 1 ? '' : 's'} completely Out of Stock
                                    </span>
                                )}
                                {lowStockProducts.length > 0 && (
                                    <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                                        • {lowStockProducts.length} product{lowStockProducts.length === 1 ? '' : 's'} Running Low (≤ {lowStockThreshold} units left)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <span>Alert Variable:</span>
                            {[2, 3, 5, 10, 20].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setCustomLowStockThreshold(val)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: lowStockThreshold === val ? '700' : '500',
                                        backgroundColor: lowStockThreshold === val ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                                        color: lowStockThreshold === val ? '#fff' : 'var(--text-secondary)',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer'
                                    }}
                                    title={`Set low stock alert sensitivity to ≤ ${val} units`}
                                >
                                    ≤ {val}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                setStockFilter(outOfStockProducts.length > 0 ? 'out_of_stock' : 'low_stock');
                                setCurrentPage(1);
                            }}
                            className="btn-secondary"
                            style={{
                                padding: '8px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderColor: outOfStockProducts.length > 0 ? 'var(--danger)' : 'var(--warning)',
                                color: outOfStockProducts.length > 0 ? 'var(--danger)' : '#f59e0b'
                            }}
                        >
                            🔍 Filter Depleted Items ({outOfStockProducts.length + lowStockProducts.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Full Width Inventory Products Table with Live Filters and Pagination */}
            <div style={{ marginTop: '20px' }}>
                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    
                    {/* Table Header & Search Filter Bar */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
                                    Your Listed Inventory ({filteredCount} of {totalProducts})
                                </h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Showing page {safeCurrentPage} of {totalPages} ({pageSize} per page)
                                </div>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Est. Filtered Value: <strong style={{ color: 'var(--accent-primary)', fontSize: '15px' }}>{getFormattedPrice(totalInventoryValueCents)}</strong>
                            </div>
                        </div>

                        {/* Search, Category, Stock Filters */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: '1 1 240px', position: 'relative' }}>
                                <input
                                    type="text"
                                    value={inventorySearch}
                                    onChange={(e) => { setInventorySearch(e.target.value); setCurrentPage(1); }}
                                    placeholder="🔍 Search SKU or Product Name (e.g. Battery, Drill)..."
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px'
                                    }}
                                />
                                {inventorySearch && (
                                    <button
                                        onClick={() => { setInventorySearch(''); setCurrentPage(1); }}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <select
                                value={categoryFilter}
                                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    minWidth: '160px'
                                }}
                            >
                                <option value="All">🏷️ All Categories</option>
                                {uniqueCategories.filter(c => c !== 'All').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            <select
                                value={stockFilter}
                                onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    minWidth: '150px'
                                }}
                            >
                                <option value="all">📦 All Stock ({totalProducts})</option>
                                <option value="in_stock">🟢 Healthy Stock (&gt;3)</option>
                                <option value="low_stock">🟡 Low Stock ({lowStockProducts.length})</option>
                                <option value="out_of_stock">🔴 Out of Stock ({outOfStockProducts.length})</option>
                            </select>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Rows:</label>
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={250}>250</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {/* Bulk Selection Actions Toolbar */}
                    {selectedProductIds.size > 0 && (
                        <div className="glass-panel animate-fade-in" style={{
                            padding: '14px 20px',
                            marginBottom: '16px',
                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--accent-primary)', fontSize: '14px' }}>
                                    ✓ {selectedProductIds.size} product{selectedProductIds.size === 1 ? '' : 's'} selected
                                </span>
                                {selectedProductIds.size < filteredProducts.length && (
                                    <button
                                        onClick={() => handleSelectAllFiltered(filteredProducts)}
                                        className="btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                                    >
                                        Select all {filteredProducts.length} matching products
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => handleBulkRestock(5)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}
                                    title="Add +5 stock to all selected products"
                                >
                                    ⚡ +5 Restock Selected
                                </button>
                                <button
                                    onClick={() => handleBulkRestock(10)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}
                                    title="Add +10 stock to all selected products"
                                >
                                    ⚡ +10 Restock Selected
                                </button>
                                <button
                                    onClick={() => setShowBulkPriceModal(true)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--success)', borderColor: 'var(--success)' }}
                                    title="Bulk adjust prices for all selected products"
                                >
                                    💰 Adjust Prices (% / $)
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '700', backgroundColor: 'var(--danger)', color: '#fff', border: 'none' }}
                                >
                                    🗑️ Delete Selected ({selectedProductIds.size})
                                </button>
                                <button
                                    onClick={handleClearSelection}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-muted)' }}
                                >
                                    ✕ Deselect
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <th style={{ padding: '14px 16px', width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProductIds.has(p.id))}
                                            onChange={() => handleSelectAllOnPage(paginatedProducts)}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                                            title="Select / deselect all products on this page"
                                        />
                                    </th>
                                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Item No</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Product</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Unit</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Excl VAT</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Incl VAT</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Stock</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No matching products found. Try adjusting your search or category filter.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProducts.map(product => {
                                        const isEditing = editingId === product.id;
                                        const isSelected = selectedProductIds.has(product.id);

                                        if (isEditing) {
                                            const subCats = PLATFORM_CATEGORIES[editForm.category] || ['General'];
                                            return (
                                                <tr key={`edit-${product.id}`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', borderBottom: '2px solid var(--accent-primary)' }}>
                                                    <td colSpan="8" style={{ padding: '20px 24px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '18px' }}>✏️</span>
                                                                    <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                                                                        Editing Product Variables & Specifications
                                                                    </strong>
                                                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {product.id.slice(0, 8)}...</span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleSaveEdit(product.id)}
                                                                        disabled={savingEdit}
                                                                        className="btn-primary"
                                                                        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700' }}
                                                                    >
                                                                        {savingEdit ? 'Saving...' : '💾 Save Product Variables'}
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={handleCancelEdit}
                                                                        disabled={savingEdit}
                                                                        className="btn-secondary"
                                                                        style={{ padding: '8px 14px', fontSize: '13px' }}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Grid of Product Variable Inputs */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                                                <label style={{ gridColumn: 'span 2' }}>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Product Title *</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.title} 
                                                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })} 
                                                                        placeholder="e.g. 5KVA Growatt Hybrid Solar Inverter"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Category *</span>
                                                                    <select 
                                                                        value={editForm.category} 
                                                                        onChange={e => {
                                                                            const newCat = e.target.value;
                                                                            const subs = PLATFORM_CATEGORIES[newCat] || [];
                                                                            setEditForm({ ...editForm, category: newCat, subCategory: subs[0] || '' });
                                                                        }}
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    >
                                                                        {Object.keys(PLATFORM_CATEGORIES).map(cat => (
                                                                            <option key={cat} value={cat}>{cat}</option>
                                                                        ))}
                                                                    </select>
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Sub-Category</span>
                                                                    <input 
                                                                        type="text" 
                                                                        list={`subcats-${product.id}`}
                                                                        value={editForm.subCategory} 
                                                                        onChange={e => setEditForm({ ...editForm, subCategory: e.target.value })} 
                                                                        placeholder="e.g. Inverters & Batteries"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    />
                                                                    <datalist id={`subcats-${product.id}`}>
                                                                        {subCats.map(sc => <option key={sc} value={sc} />)}
                                                                    </datalist>
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Brand / Manufacturer</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.brand} 
                                                                        onChange={e => setEditForm({ ...editForm, brand: e.target.value })} 
                                                                        placeholder="e.g. Growatt, Exide, Apple"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Condition *</span>
                                                                    <select 
                                                                        value={editForm.condition} 
                                                                        onChange={e => setEditForm({ ...editForm, condition: e.target.value })}
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    >
                                                                        <option value="New">Brand New</option>
                                                                        <option value="Refurbished">Refurbished</option>
                                                                        <option value="Used - Like New">Used - Like New</option>
                                                                        <option value="Used - Good">Used - Good</option>
                                                                        <option value="Open Box">Open Box</option>
                                                                    </select>
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Custom SKU / Item No</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.itemNo} 
                                                                        onChange={e => setEditForm({ ...editForm, itemNo: e.target.value })} 
                                                                        placeholder="e.g. SOL-INV-001"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Selling Price ($ USD) *</span>
                                                                    <input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        min="0" 
                                                                        value={editForm.priceIncl} 
                                                                        onChange={e => setEditForm({ ...editForm, priceIncl: e.target.value })} 
                                                                        placeholder="25.00"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontWeight: '700', color: 'var(--success)' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Stock Quantity *</span>
                                                                    <input 
                                                                        type="number" 
                                                                        min="0" 
                                                                        value={editForm.stockQuantity} 
                                                                        onChange={e => setEditForm({ ...editForm, stockQuantity: e.target.value })} 
                                                                        placeholder="10"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Unit</span>
                                                                    <select 
                                                                        value={editForm.unit} 
                                                                        onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    >
                                                                        <option value="EA">EA (Each)</option>
                                                                        <option value="KG">KG (Kilogram)</option>
                                                                        <option value="L">L (Litre)</option>
                                                                        <option value="M">M (Metre)</option>
                                                                        <option value="BOX">BOX (Box)</option>
                                                                        <option value="PACK">PACK (Pack)</option>
                                                                        <option value="PAIR">PAIR (Pair)</option>
                                                                        <option value="SET">SET (Set)</option>
                                                                    </select>
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Colors (comma-separated)</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.colors} 
                                                                        onChange={e => setEditForm({ ...editForm, colors: e.target.value })} 
                                                                        placeholder="e.g. Black, Silver, White"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Sizes (comma-separated)</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.sizes} 
                                                                        onChange={e => setEditForm({ ...editForm, sizes: e.target.value })} 
                                                                        placeholder="e.g. 5KVA, 3KVA or S, M, L"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} 
                                                                    />
                                                                </label>

                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Product Photo</span>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        {editForm.imageUrl ? (
                                                                            <img src={editForm.imageUrl} alt="Preview" style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                                                        ) : (
                                                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No Photo</span>
                                                                        )}
                                                                        <input 
                                                                            type="file" 
                                                                            accept="image/*" 
                                                                            onChange={handleEditFileChange} 
                                                                            style={{ fontSize: '12px', flex: 1 }} 
                                                                        />
                                                                        <input 
                                                                            type="url" 
                                                                            placeholder="Or Image URL" 
                                                                            value={editForm.imageUrl} 
                                                                            onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })} 
                                                                            style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }} 
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <label style={{ gridColumn: '1 / -1' }}>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Product Specifications & Description</span>
                                                                    <textarea 
                                                                        rows="3" 
                                                                        value={editForm.description} 
                                                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                                                                        placeholder="Enter item specifications, warranty coverage, compatibility, package contents, dimensions, or special handling notes..."
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', resize: 'vertical' }} 
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent', transition: 'background-color 0.2s' }}>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectProduct(product.id)}
                                                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '13px' }}>
                                                    {product.item_no || 'N/A'}
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {product.image_url ? (
                                                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                                                                <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                                                📦
                                                            </div>
                                                        )}
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{product.title}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                {product.brand && (
                                                                    <span style={{ color: 'var(--accent-primary)', fontWeight: '600', marginRight: '6px' }}>
                                                                        [{product.brand}]
                                                                    </span>
                                                                )}
                                                                {product.category || 'Uncategorized'} {product.sub_category ? `› ${product.sub_category}` : ''}
                                                            </div>
                                                            {(product.colors?.length > 0 || product.sizes?.length > 0) && (
                                                                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                                                                    {product.colors?.length > 0 && `Colors: ${product.colors.join(', ')}`}
                                                                    {product.colors?.length > 0 && product.sizes?.length > 0 && ' | '}
                                                                    {product.sizes?.length > 0 && `Sizes: ${product.sizes.join(', ')}`}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                                                    {product.unit || 'EA'}
                                                </td>
                                                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                                                    {(product.price_excl_vat_cents || 0) > 0 
                                                        ? `$${(product.price_excl_vat_cents / 100).toFixed(2)}`
                                                        : <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>—</span>
                                                    }
                                                </td>
                                                <td style={{ padding: '14px 20px', color: (product.price_cents || 0) > 0 ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
                                                    {(product.price_cents || 0) > 0 
                                                        ? `$${(product.price_cents / 100).toFixed(2)}`
                                                        : <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--warning)' }}>Set Price</span>
                                                    }
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            backgroundColor: product.stock_quantity <= 0 
                                                                ? 'rgba(239, 68, 68, 0.15)' 
                                                                : (product.stock_quantity <= lowStockThreshold ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                                                            color: product.stock_quantity <= 0 
                                                                ? 'var(--danger)' 
                                                                : (product.stock_quantity <= lowStockThreshold ? '#f59e0b' : 'var(--success)'),
                                                            border: product.stock_quantity <= 0 
                                                                ? '1px solid var(--danger)' 
                                                                : (product.stock_quantity <= lowStockThreshold ? '1px solid #f59e0b' : '1px solid var(--success)'),
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {product.stock_quantity <= 0 
                                                                ? '🔴 Out of Stock' 
                                                                : (product.stock_quantity <= lowStockThreshold ? `🟡 Low (${product.stock_quantity})` : `🟢 ${product.stock_quantity} in stock`)}
                                                        </span>
                                                        
                                                        {product.stock_quantity <= lowStockThreshold && (
                                                            <button
                                                                onClick={() => handleQuickRestock(product.id, 5)}
                                                                className="btn-secondary"
                                                                style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', whiteSpace: 'nowrap' }}
                                                                title="Quickly add +5 units to stock"
                                                            >
                                                                ⚡ +5
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button 
                                                            onClick={() => handleStartEdit(product)}
                                                            className="btn-secondary"
                                                            style={{ padding: '6px 12px', fontSize: '13px' }}
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(product.id)}
                                                            className="btn-secondary"
                                                            style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Numbered Pagination Controls Footer Bar */}
                    {totalPages > 1 && (
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                            backgroundColor: 'rgba(255,255,255,0.01)'
                        }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Showing <strong>{(safeCurrentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(safeCurrentPage * pageSize, filteredCount)}</strong> of <strong>{filteredCount}</strong> items
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={safeCurrentPage === 1}
                                    className="btn-secondary"
                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                    title="First Page"
                                >
                                    « First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={safeCurrentPage === 1}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                    ‹ Prev
                                </button>

                                {/* Page Number Pills */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (safeCurrentPage <= 3) pageNum = i + 1;
                                    else if (safeCurrentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = safeCurrentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                borderRadius: '6px',
                                                border: safeCurrentPage === pageNum ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                backgroundColor: safeCurrentPage === pageNum ? 'var(--accent-primary)' : 'transparent',
                                                color: safeCurrentPage === pageNum ? '#fff' : 'var(--text-primary)',
                                                fontWeight: safeCurrentPage === pageNum ? '700' : '400',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={safeCurrentPage === totalPages}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                    Next ›
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={safeCurrentPage === totalPages}
                                    className="btn-secondary"
                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                    title="Last Page"
                                >
                                    Last »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Product / Bulk CSV Import Modal Window */}
            {showUploadModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100,
                        padding: '20px'
                    }}
                    onClick={() => setShowUploadModal(false)}
                >
                    <div 
                        style={{
                            width: '100%',
                            maxWidth: '720px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            position: 'relative'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    className={uploadMode === 'single' ? 'btn-primary' : 'btn-secondary'} 
                                    style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px' }}
                                    onClick={() => setUploadMode('single')}
                                >
                                    ➕ Add Single Product
                                </button>
                                <button 
                                    className={uploadMode === 'bulk' ? 'btn-primary' : 'btn-secondary'} 
                                    style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px' }}
                                    onClick={() => setUploadMode('bulk')}
                                >
                                    📁 Bulk CSV Import
                                </button>
                            </div>
                            <button 
                                onClick={() => setShowUploadModal(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', padding: '4px' }}
                                title="Close Modal"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        {uploadMode === 'single' ? (
                            <ProductUploadForm 
                                shopId={selectedShopId === 'ALL' ? shopId : selectedShopId} 
                                onUploadSuccess={() => {
                                    loadInventoryAndProfile();
                                    setShowUploadModal(false);
                                }} 
                            />
                        ) : (
                            <BulkProductUpload 
                                shopId={selectedShopId === 'ALL' ? shopId : selectedShopId} 
                                onUploadSuccess={() => {
                                    loadInventoryAndProfile();
                                    setShowUploadModal(false);
                                }} 
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Bulk Price Adjustment Modal */}
            {showBulkPriceModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '20px'
                    }}
                    onClick={() => !applyingBulkPrice && setShowBulkPriceModal(false)}
                >
                    <div 
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '28px',
                            maxWidth: '540px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            position: 'relative'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>💰</span> Bulk Price Adjustment
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Update selling prices for <strong>{selectedProductIds.size}</strong> selected items
                                </p>
                            </div>
                            <button 
                                onClick={() => !applyingBulkPrice && setShowBulkPriceModal(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', padding: '4px' }}
                                title="Close Modal"
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                    Adjustment Action
                                </label>
                                <select 
                                    value={bulkPriceMode} 
                                    onChange={e => setBulkPriceMode(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                                >
                                    <option value="percent_increase">📈 Markup by Percentage (+ %)</option>
                                    <option value="percent_discount">🏷️ Discount by Percentage (- %)</option>
                                    <option value="fixed_increase">💵 Increase by Fixed USD (+ $)</option>
                                    <option value="fixed_decrease">📉 Decrease by Fixed USD (- $)</option>
                                    <option value="set_fixed">🎯 Set Exact Fixed Price (= $)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                    {bulkPriceMode.startsWith('percent') ? 'Percentage Value (%)' : 'Amount in USD ($)'}
                                </label>
                                <input 
                                    type="number" 
                                    min="0.01" 
                                    step="0.01" 
                                    value={bulkPriceValue} 
                                    onChange={e => setBulkPriceValue(e.target.value)}
                                    placeholder={bulkPriceMode.startsWith('percent') ? "e.g. 15 for 15%" : "e.g. 5.00 for $5.00"}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                                />
                            </div>

                            {/* Live calculation preview */}
                            <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <div style={{ fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '4px' }}>💡 Live Preview:</div>
                                {bulkPriceMode === 'percent_increase' && (
                                    <span>A $20.00 product will become <strong>${(20 * (1 + (parseFloat(bulkPriceValue) || 0) / 100)).toFixed(2)}</strong> (+{bulkPriceValue || 0}%)</span>
                                )}
                                {bulkPriceMode === 'percent_discount' && (
                                    <span>A $20.00 product will become <strong>${Math.max(0.10, 20 * (1 - (parseFloat(bulkPriceValue) || 0) / 100)).toFixed(2)}</strong> (-{bulkPriceValue || 0}%)</span>
                                )}
                                {bulkPriceMode === 'fixed_increase' && (
                                    <span>A $20.00 product will become <strong>${(20 + (parseFloat(bulkPriceValue) || 0)).toFixed(2)}</strong> (+${parseFloat(bulkPriceValue) || 0})</span>
                                )}
                                {bulkPriceMode === 'fixed_decrease' && (
                                    <span>A $20.00 product will become <strong>${Math.max(0.10, 20 - (parseFloat(bulkPriceValue) || 0)).toFixed(2)}</strong> (-${parseFloat(bulkPriceValue) || 0})</span>
                                )}
                                {bulkPriceMode === 'set_fixed' && (
                                    <span>All selected products will be set to exactly <strong>${(parseFloat(bulkPriceValue) || 0).toFixed(2)}</strong></span>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button 
                                    type="button"
                                    onClick={() => setShowBulkPriceModal(false)}
                                    disabled={applyingBulkPrice}
                                    className="btn-secondary"
                                    style={{ padding: '10px 18px', fontSize: '13px' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleApplyBulkPriceAdjustment}
                                    disabled={applyingBulkPrice || !bulkPriceValue || parseFloat(bulkPriceValue) <= 0}
                                    className="btn-primary"
                                    style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '700' }}
                                >
                                    {applyingBulkPrice ? 'Applying Updates...' : `Apply to ${selectedProductIds.size} Products`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}