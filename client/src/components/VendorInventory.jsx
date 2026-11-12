import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient.js';
import { VendorProfileSetup } from './VendorProfileSetup.jsx';
import { VendorOnboardingChecklist } from './VendorOnboardingChecklist.jsx';
import { matchProductImage } from '../utils/productImageMatcher.js';
import { useToast } from './ToastContext.jsx';
import { useModal } from './ModalContext.jsx';
import { VendorDashboardHeader } from './vendor/VendorDashboardHeader.jsx';
import { InventoryTab } from './vendor/InventoryTab.jsx';
import { AnalyticsTab } from './vendor/AnalyticsTab.jsx';
import { StockAlertsTab } from './vendor/StockAlertsTab.jsx';
import { PricingTab } from './vendor/PricingTab.jsx';
import { UploadModal } from './vendor/UploadModal.jsx';
import { BulkPriceModal } from './vendor/BulkPriceModal.jsx';
import { useProductEditor } from './vendor/useProductEditor.js';
import { vendorInventoryCache, PLATFORM_CATEGORIES, loadVendorInventory, downloadInventoryCsv } from './vendor/inventoryData.js';
import { VendorTabsBar } from './vendor/VendorTabsBar.jsx';
import { 
    getEffectiveZigRate, 
    getZigRateMetadata, 
    fetchLiveZigRate, 
    getStoreEffectiveZigRate, 
    updateVendorZigRate 
} from '../utils/exchangeRateService.js';


export function VendorInventory({ shopId, setCurrentView, currency = 'USD', formatPrice }) {
    const { showToast } = useToast();
    const { showConfirm, showPrompt } = useModal();
    // Revenue and totals show $0.00 rather than "Price on Request"
    const getFormattedPrice = (cents) => {
        const safe = Number.isFinite(Number(cents)) && Number(cents) > 0 ? Number(cents) : 0;
        if (formatPrice) return formatPrice(safe, currency);
        return `$${(safe / 100).toFixed(2)}`;
    };

    // Superadmin Multi-Store Support
    const [isAdmin, setIsAdmin] = useState(() => vendorInventoryCache.current.isAdmin ?? false);
    const [allVendors, setAllVendors] = useState(() => vendorInventoryCache.current.allVendors || []);
    // Vendors always manage their own store; admins can switch to another store or 'ALL'
    const [selectedShopId, setSelectedShopId] = useState(() => vendorInventoryCache.current.selectedShopId || shopId || 'ALL');

    const [products, setProducts] = useState(() => vendorInventoryCache.current.products || []);
    const [chartOrderItems, setChartOrderItems] = useState(() => vendorInventoryCache.current.chartOrderItems || []);
    const [hasProfile, setHasProfile] = useState(() => vendorInventoryCache.current.hasProfile ?? null);
    const [vendorProfile, setVendorProfile] = useState(() => vendorInventoryCache.current.vendorProfile || null);
    const [loading, setLoading] = useState(() => !vendorInventoryCache.current.products || vendorInventoryCache.current.products.length === 0);
    const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'bulk'
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Store ZiG Exchange Rate State
    const [officialRateMeta, setOfficialRateMeta] = useState(() => getZigRateMetadata());
    const [fetchingOfficialRate, setFetchingOfficialRate] = useState(false);
    const [savingStoreRate, setSavingStoreRate] = useState(false);
    const [isEditingStoreRate, setIsEditingStoreRate] = useState(false);
    const [storeRateMode, setStoreRateMode] = useState(() => {
        return (vendorInventoryCache.current.vendorProfile?.use_custom_rate === true || 
                vendorInventoryCache.current.vendorProfile?.shipping_settings?.zig_rate_settings?.mode === 'custom') ? 'custom' : 'official';
    });
    const [storeCustomRateInput, setStoreCustomRateInput] = useState(() => {
        const val = vendorInventoryCache.current.vendorProfile?.custom_zig_rate ?? 
                    vendorInventoryCache.current.vendorProfile?.shipping_settings?.zig_rate_settings?.custom_rate;
        return val !== undefined && val !== null ? String(val) : String(getEffectiveZigRate());
    });

    // Sync when vendorProfile changes
    useEffect(() => {
        if (vendorProfile) {
            const hasCustom = vendorProfile.use_custom_rate === true || 
                              vendorProfile.shipping_settings?.zig_rate_settings?.mode === 'custom';
            const customVal = vendorProfile.custom_zig_rate ?? 
                              vendorProfile.shipping_settings?.zig_rate_settings?.custom_rate;
            setStoreRateMode(hasCustom ? 'custom' : 'official');
            if (customVal !== undefined && customVal !== null) {
                setStoreCustomRateInput(String(customVal));
            }
        }
    }, [vendorProfile]);

    // Live background rate updates listener
    useEffect(() => {
        const handleRateUpdated = () => {
            setOfficialRateMeta(getZigRateMetadata());
        };
        window.addEventListener('zimmarket_rate_updated', handleRateUpdated);
        return () => window.removeEventListener('zimmarket_rate_updated', handleRateUpdated);
    }, []);

    const storeEffectiveRate = useMemo(() => {
        return getStoreEffectiveZigRate(vendorProfile, officialRateMeta.rate);
    }, [vendorProfile, officialRateMeta.rate]);

    const handleFetchLiveRate = async () => {
        setFetchingOfficialRate(true);
        try {
            const fresh = await fetchLiveZigRate(true);
            setOfficialRateMeta(fresh);
            showToast(`✓ Official live rate updated: 1 USD = ${fresh.rate.toFixed(2)} ZiG`, 'success');
        } catch (e) {
            showToast(`Failed to fetch official live rate: ${e.message}`, 'error');
        } finally {
            setFetchingOfficialRate(false);
        }
    };

    const handleSaveStoreRate = async () => {
        if (!shopId) return;
        setSavingStoreRate(true);
        try {
            const useCustom = storeRateMode === 'custom';
            const parsed = parseFloat(storeCustomRateInput);
            const validRate = (!isNaN(parsed) && parsed > 0) ? parseFloat(parsed.toFixed(2)) : null;

            const updatedVendor = await updateVendorZigRate(supabase, shopId, {
                useCustomRate: useCustom,
                customRate: validRate,
                currentShippingSettings: vendorProfile?.shipping_settings || {}
            });

            setVendorProfile(prev => ({
                ...prev,
                ...updatedVendor,
                use_custom_rate: useCustom,
                custom_zig_rate: validRate
            }));

            setIsEditingStoreRate(false);
            showToast(useCustom 
                ? `✓ Custom Store Rate saved: 1 USD = ${validRate} ZiG` 
                : `✓ Store set to follow official RBZ rate: 1 USD = ${officialRateMeta.rate.toFixed(2)} ZiG`, 
                'success'
            );
        } catch (e) {
            showToast(`Failed to save rate: ${e.message}`, 'error');
        } finally {
            setSavingStoreRate(false);
        }
    };
    
    // Pagination & Search States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [inventorySearch, setInventorySearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [stockFilter, setStockFilter] = useState('all');
    const [isMatchingImages, setIsMatchingImages] = useState(false);
    
    // Dashboard Tabs Navigation: 'inventory' | 'analytics' | 'stock_alerts' | 'pricing'
    const [activeTab, setActiveTab] = useState('inventory');
    
    // Bulk Multi-Select State
    const [selectedProductIds, setSelectedProductIds] = useState(() => new Set());
    
    const [salesStats, setSalesStats] = useState(() => vendorInventoryCache.current.salesStats || {
        totalRevenue: 0,
        completedOrdersCount: 0,
        totalUnitsSold: 0,
        averageOrderValueCents: 0,
        topProducts: []
    });

    const {
        editingId, setEditingId, editForm, setEditForm, savingEdit,
        handleStartEdit, handleCancelEdit, handleEditFileChange, handleSaveEdit
    } = useProductEditor({ shopId, setProducts, showToast });

    // Bulk Price Adjustment Variables State
    const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
    const [bulkPriceMode, setBulkPriceMode] = useState('percent_increase'); // percent_increase, percent_discount, fixed_increase, fixed_decrease, set_fixed
    const [bulkPriceValue, setBulkPriceValue] = useState('10');
    const [applyingBulkPrice, setApplyingBulkPrice] = useState(false);


    const handleToggleQuickPromo = async (product) => {
        const nextState = !product.is_promotion;
        const discount = nextState ? (product.promo_discount_percent || 15) : 0;
        try {
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_promotion: nextState, promo_discount_percent: discount } : p));
            const { error } = await supabase.from('products').update({
                is_promotion: nextState,
                promo_discount_percent: discount
            }).eq('id', product.id);
            if (error) throw error;
            showToast(nextState ? `🔥 "${product.title}" is now on promotion (${discount}% off)!` : `✓ Promotion removed from "${product.title}".`, 'success');
        } catch (err) {
            showToast(`Failed updating promotion: ${err.message}`, 'error');
            loadInventoryAndProfile();
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
        await loadVendorInventory({
            shopId, selectedShopId, setLoading, setAllVendors, setIsAdmin, setSelectedShopId,
            setHasProfile, setVendorProfile, setProducts, setChartOrderItems, setSalesStats
        });
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
                        vendorInventoryCache.current.products = updated;
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
                    vendorInventoryCache.current.products = [];
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

        downloadInventoryCsv(products, getFormattedPrice);
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
            <VendorDashboardHeader
                allVendors={allVendors}
                isAdmin={isAdmin}
                products={products}
                selectedShopId={selectedShopId}
                setSelectedShopId={setSelectedShopId}
                setShowUploadModal={setShowUploadModal}
                setUploadMode={setUploadMode}
                shopId={shopId}
                vendorProfile={vendorProfile}
            />

            {vendorProfile && selectedShopId === shopId && (
                <VendorOnboardingChecklist
                    profile={vendorProfile}
                    productCount={totalProducts}
                    onNavigate={(view) => setCurrentView(view)}
                    onAddProduct={() => { setUploadMode('single'); setShowUploadModal(true); }}
                />
            )}

            {/* Dashboard Main Tabs Bar */}
            <VendorTabsBar activeTab={activeTab} lowStockProducts={lowStockProducts} outOfStockProducts={outOfStockProducts} salesStats={salesStats} setActiveTab={setActiveTab} totalProducts={totalProducts} />

            {/* TAB 1: PRODUCTS & CATALOG */}
            {activeTab === 'inventory' && (
                <InventoryTab
                    PLATFORM_CATEGORIES={PLATFORM_CATEGORIES}
                    categoryFilter={categoryFilter}
                    editForm={editForm}
                    editingId={editingId}
                    exportToCSV={exportToCSV}
                    filteredCount={filteredCount}
                    filteredInventory={filteredInventory}
                    getFormattedPrice={getFormattedPrice}
                    handleAutoMatchImages={handleAutoMatchImages}
                    handleBulkRestock={handleBulkRestock}
                    handleCancelEdit={handleCancelEdit}
                    handleClearSelection={handleClearSelection}
                    handleDelete={handleDelete}
                    handleDeleteAllProducts={handleDeleteAllProducts}
                    handleDeleteSelected={handleDeleteSelected}
                    handleEditFileChange={handleEditFileChange}
                    handleQuickRestock={handleQuickRestock}
                    handleSaveEdit={handleSaveEdit}
                    handleSelectAllFiltered={handleSelectAllFiltered}
                    handleSelectAllOnPage={handleSelectAllOnPage}
                    handleStartEdit={handleStartEdit}
                    handleToggleQuickPromo={handleToggleQuickPromo}
                    handleToggleSelectProduct={handleToggleSelectProduct}
                    inventorySearch={inventorySearch}
                    isMatchingImages={isMatchingImages}
                    lowStockProducts={lowStockProducts}
                    lowStockThreshold={lowStockThreshold}
                    outOfStockProducts={outOfStockProducts}
                    pageSize={pageSize}
                    paginatedProducts={paginatedProducts}
                    products={products}
                    safeCurrentPage={safeCurrentPage}
                    savingEdit={savingEdit}
                    selectedProductIds={selectedProductIds}
                    selectedShopId={selectedShopId}
                    setCategoryFilter={setCategoryFilter}
                    setCurrentPage={setCurrentPage}
                    setEditForm={setEditForm}
                    setInventorySearch={setInventorySearch}
                    setPageSize={setPageSize}
                    setShowBulkPriceModal={setShowBulkPriceModal}
                    setStockFilter={setStockFilter}
                    stockFilter={stockFilter}
                    totalInventoryValueCents={totalInventoryValueCents}
                    totalPages={totalPages}
                    totalProducts={totalProducts}
                    uniqueCategories={uniqueCategories}
                />
    )}

    {/* TAB 2: SALES & ANALYTICS */}
    {activeTab === 'analytics' && (
        <AnalyticsTab
            chartOrderItems={chartOrderItems}
            currency={currency}
            formatPrice={formatPrice}
            getFormattedPrice={getFormattedPrice}
            salesStats={salesStats}
            selectedShopId={selectedShopId}
            vendorProfile={vendorProfile}
        />
    )}

    {/* TAB 3: STOCK HEALTH & RESTOCK ALERTS */}
    {activeTab === 'stock_alerts' && (
        <StockAlertsTab
            handleQuickRestock={handleQuickRestock}
            lowStockProducts={lowStockProducts}
            lowStockThreshold={lowStockThreshold}
            outOfStockProducts={outOfStockProducts}
            products={products}
            setActiveTab={setActiveTab}
            setCurrentPage={setCurrentPage}
            setCustomLowStockThreshold={setCustomLowStockThreshold}
            setStockFilter={setStockFilter}
            totalProducts={totalProducts}
        />
    )}

    {/* TAB 4: PRICING, TAX & WALLET */}
    {activeTab === 'pricing' && (
        <PricingTab
            currency={currency}
            fetchingOfficialRate={fetchingOfficialRate}
            getFormattedPrice={getFormattedPrice}
            handleFetchLiveRate={handleFetchLiveRate}
            handleSaveStoreRate={handleSaveStoreRate}
            isEditingStoreRate={isEditingStoreRate}
            officialRateMeta={officialRateMeta}
            savingStoreRate={savingStoreRate}
            setIsEditingStoreRate={setIsEditingStoreRate}
            setShowBulkPriceModal={setShowBulkPriceModal}
            setStoreCustomRateInput={setStoreCustomRateInput}
            setStoreRateMode={setStoreRateMode}
            shopId={shopId}
            storeCustomRateInput={storeCustomRateInput}
            storeEffectiveRate={storeEffectiveRate}
            storeRateMode={storeRateMode}
            totalInventoryValueCents={totalInventoryValueCents}
            totalProducts={totalProducts}
            vendorProfile={vendorProfile}
        />
    )}

            {/* Add Product / Bulk CSV Import Modal Window */}
            {showUploadModal && (
                <UploadModal
                    allVendors={allVendors}
                    loadInventoryAndProfile={loadInventoryAndProfile}
                    selectedShopId={selectedShopId}
                    setShowUploadModal={setShowUploadModal}
                    setUploadMode={setUploadMode}
                    shopId={shopId}
                    uploadMode={uploadMode}
                />
            )}

            {/* Bulk Price Adjustment Modal */}
            {showBulkPriceModal && (
                <BulkPriceModal
                    applyingBulkPrice={applyingBulkPrice}
                    bulkPriceMode={bulkPriceMode}
                    bulkPriceValue={bulkPriceValue}
                    handleApplyBulkPriceAdjustment={handleApplyBulkPriceAdjustment}
                    products={products}
                    selectedProductIds={selectedProductIds}
                    setBulkPriceMode={setBulkPriceMode}
                    setBulkPriceValue={setBulkPriceValue}
                    setShowBulkPriceModal={setShowBulkPriceModal}
                />
            )}
        </div>
    );
}