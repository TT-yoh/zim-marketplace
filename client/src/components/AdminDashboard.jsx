// client/src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';
import { useModal } from './ModalContext.jsx';
import { getEffectiveZigRate, getZigRateMetadata, setAdminZigOverride } from '../utils/exchangeRateService.js';
import { getSecureDocumentUrl } from '../utils/imageUploadHelper.js';
import { AdminTabsBar } from './admin/AdminTabsBar.jsx';
import { OverviewTab } from './admin/OverviewTab.jsx';
import { VendorsTab } from './admin/VendorsTab.jsx';
import { CategoriesTab } from './admin/CategoriesTab.jsx';
import { OrdersTab } from './admin/OrdersTab.jsx';
import { DisputesTab } from './admin/DisputesTab.jsx';
import { PayoutsTab } from './admin/PayoutsTab.jsx';
import { HeroTab } from './admin/HeroTab.jsx';
import { adminCache } from './admin/adminCache.js';

export function AdminDashboard({ currency = 'USD', formatPrice }) {
    const { showToast } = useToast();
    const { showConfirm, showPrompt } = useModal();
    const [stats, setStats] = useState(() => adminCache.current.stats || { users: 0, products: 0, orders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState(() => adminCache.current.recentOrders || []);
    const [chartOrders, setChartOrders] = useState(() => adminCache.current.chartOrders || []);
    const [chartProducts, setChartProducts] = useState(() => adminCache.current.chartProducts || []);
    const [pendingVendors, setPendingVendors] = useState(() => adminCache.current.pendingVendors || []);
    const [pendingBuyers, setPendingBuyers] = useState([]);
    const [allVendors, setAllVendors] = useState(() => adminCache.current.allVendors || []);
    const [categoriesList, setCategoriesList] = useState(() => adminCache.current.categoriesList || []);
    const [escrowItems, setEscrowItems] = useState(() => adminCache.current.escrowItems || []);
    const [payoutRequests, setPayoutRequests] = useState(() => adminCache.current.payoutRequests || []);
    const [disputeFilter, setDisputeFilter] = useState('all'); // 'all' | 'held' | 'delivered' | 'refunded'
    const [processingEscrowId, setProcessingEscrowId] = useState(null);
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(() => !adminCache.current.stats);
    const [isAdmin, setIsAdmin] = useState(() => adminCache.current.isAdmin ?? false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'vendors' | 'categories' | 'orders' | 'disputes' | 'payouts'

    // Custodial Clearinghouse & Financial Reconciliation Summary
    const [financialSummary, setFinancialSummary] = useState({
        platformClearedCents: 0,
        platformPendingCents: 0,
        vendorEscrowFloatCents: 0,
        vendorPayableCents: 0,
        ownerStoreSalesCents: 0,
        pendingPayoutsCents: 0
    });

    // Live ZiG Exchange Rate State
    const [adminZigRate, setAdminZigRate] = useState(() => getEffectiveZigRate());
    const [adminRateMeta, setAdminRateMeta] = useState(() => getZigRateMetadata());

    const handlePromptRateOverride = () => {
        showPrompt({
            title: "🇿🇼 Update Official ZiG Exchange Rate",
            message: `Current Effective Rate: 1 USD = ${adminZigRate.toFixed(2)} ZiG (${adminRateMeta.source}). Enter the new official RBZ / Interbank conversion rate (e.g. 26.85):`,
            type: "info",
            defaultValue: adminZigRate.toFixed(2),
            placeholder: "e.g. 26.85",
            confirmText: "Apply New Rate",
            onConfirm: async (inputVal) => {
                const newRate = parseFloat(inputVal);
                if (isNaN(newRate) || newRate <= 0) {
                    showToast("Please enter a valid numeric exchange rate.", "warning");
                    return;
                }
                const success = setAdminZigOverride(newRate);
                if (success) {
                    setAdminZigRate(newRate);
                    setAdminRateMeta(getZigRateMetadata());
                    showToast(`✓ Official ZiG rate updated to ${newRate.toFixed(2)} ZiG / USD!`, "success");
                }
            }
        });
    };

    // Category Management Form State
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', icon: '🏷️', subCategoriesText: '' });
    const [savingCategory, setSavingCategory] = useState(false);

    // Hero Spotlight & Promotions Management State
    const [heroProducts, setHeroProducts] = useState([]);
    const [heroSearchTerm, setHeroSearchTerm] = useState('');
    const [heroFilter, setHeroFilter] = useState('all'); // 'all' | 'spotlight' | 'promotions'
    const [loadingHeroProducts, setLoadingHeroProducts] = useState(false);
    const [updatingHeroId, setUpdatingHeroId] = useState(null);

    const loadHeroProducts = async () => {
        setLoadingHeroProducts(true);
        try {
            let { data, error } = await supabase
                .from('products')
                .select('id, title, item_no, price_cents, stock_quantity, image_url, category, sub_category, shop_id, is_promotion, promo_discount_percent, is_featured_hero, created_at')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
                const fallback = await supabase
                    .from('products')
                    .select('id, title, item_no, price_cents, stock_quantity, image_url, category, sub_category, shop_id, created_at')
                    .order('created_at', { ascending: false })
                    .limit(500);
                data = (fallback.data || []).map(p => ({
                    ...p,
                    is_promotion: false,
                    promo_discount_percent: 0,
                    is_featured_hero: false
                }));
                error = fallback.error;
            }

            if (error) throw error;
            setHeroProducts(data || []);
        } catch (err) {
            console.error("Failed to load products for hero manager:", err);
            showToast(`Error loading products: ${err.message}`, 'error');
        } finally {
            setLoadingHeroProducts(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'hero' && heroProducts.length === 0) {
            loadHeroProducts();
        }
    }, [activeTab]);

    const handleToggleHeroSpotlight = async (product) => {
        setUpdatingHeroId(product.id);
        const nextFeatured = !product.is_featured_hero;
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_featured_hero: nextFeatured })
                .eq('id', product.id);
            if (error) throw error;
            setHeroProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured_hero: nextFeatured } : p));
            showToast(nextFeatured ? `⭐ Pinned "${product.title}" to Hero Spotlight!` : `✓ Unpinned "${product.title}" from Hero Spotlight.`, 'success');
        } catch (err) {
            showToast(`Update failed: ${err.message}`, 'error');
        } finally {
            setUpdatingHeroId(null);
        }
    };

    const handleToggleHeroPromo = async (product) => {
        setUpdatingHeroId(product.id);
        const nextPromo = !product.is_promotion;
        const discount = nextPromo ? (product.promo_discount_percent || 15) : 0;
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_promotion: nextPromo, promo_discount_percent: discount })
                .eq('id', product.id);
            if (error) throw error;
            setHeroProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_promotion: nextPromo, promo_discount_percent: discount } : p));
            showToast(nextPromo ? `🔥 Put "${product.title}" on promotion (${discount}% off)!` : `✓ Promotion turned off for "${product.title}".`, 'success');
        } catch (err) {
            showToast(`Update failed: ${err.message}`, 'error');
        } finally {
            setUpdatingHeroId(null);
        }
    };

    const handleSetHeroDiscount = async (product, percent) => {
        setUpdatingHeroId(product.id);
        const parsed = Math.max(1, Math.min(90, parseInt(percent, 10) || 15));
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_promotion: true, promo_discount_percent: parsed })
                .eq('id', product.id);
            if (error) throw error;
            setHeroProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_promotion: true, promo_discount_percent: parsed } : p));
            showToast(`🔥 Set promotion discount for "${product.title}" to ${parsed}% off!`, 'success');
        } catch (err) {
            showToast(`Update failed: ${err.message}`, 'error');
        } finally {
            setUpdatingHeroId(null);
        }
    };

    const loadAdminData = async () => {
        try {
            // Check if current user is admin
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: adminData } = await supabase
                .from('platform_admins')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (!adminData) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }
            
            setIsAdmin(true);

            // Fetch Stats, Orders, Products, Pending Vendors, All Stores, Categories, Escrow Items, and Payout Requests concurrently in parallel
            const [usersRes, productsCountRes, ordersCountRes, ordersDataRes, productsListRes, recentRes, pendingRes, allVendorsRes, categoriesRes, escrowItemsRes, payoutRequestsRes] = await Promise.all([
                supabase.from('vendor_profiles').select('*', { count: 'exact', head: true }),
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('id, total_amount_cents, created_at, status').neq('currency', 'XTS').order('created_at', { ascending: true }).limit(500),
                supabase.from('products').select('id, category, sub_category').limit(500),
                supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(25),
                supabase.from('vendor_profiles').select('*').eq('is_verified', false).not('id_document_url', 'is', null),
                supabase.from('vendor_profiles').select('id, store_name, whatsapp_number, vendor_type, is_verified, is_active, created_at').order('created_at', { ascending: false }).limit(100),
                supabase.from('categories').select('*').order('display_order', { ascending: true }),
                supabase.from('order_items').select('*, product:products(title, item_no, image_url), vendor:vendor_profiles(store_name, whatsapp_number), order:orders(buyer_id, created_at, status, total_amount_cents)').order('created_at', { ascending: false }).limit(50),
                supabase.from('payout_requests').select('*, vendor:vendor_profiles(store_name, whatsapp_number)').order('created_at', { ascending: false }).limit(50)
            ]);

            const usersCount = usersRes?.count || 0;
            const productsCount = productsCountRes?.count || 0;
            const ordersCount = ordersCountRes?.count || 0;
            const totalRev = ordersDataRes?.data ? ordersDataRes.data.reduce((sum, o) => sum + (o.total_amount_cents || 0), 0) : 0;

            const newStats = {
                users: usersCount,
                products: productsCount,
                orders: ordersCount,
                revenue: totalRev / 100
            };

            setStats(newStats);

            const payoutsData = payoutRequestsRes?.data || [];
            if (ordersDataRes?.data) setChartOrders(ordersDataRes.data);
            if (productsListRes?.data) setChartProducts(productsListRes.data);
            if (recentRes?.data) setRecentOrders(recentRes.data);
            if (pendingRes?.data) setPendingVendors(pendingRes.data);
            if (allVendorsRes?.data) setAllVendors(allVendorsRes.data);
            if (categoriesRes?.data) setCategoriesList(categoriesRes.data);
            if (escrowItemsRes?.data) setEscrowItems(escrowItemsRes.data);
            setPayoutRequests(payoutsData);

            // Fetch pending buyer verifications safely
            try {
                const { data: bData } = await supabase.from('buyer_verifications').select('*').eq('status', 'pending');
                if (bData) setPendingBuyers(bData);
            } catch (bErr) {
                console.warn('Pending buyers fetch notice:', bErr);
            }

            // Fetch platform financial summary from secure clearinghouse RPC
            try {
                const { data: finData, error: finError } = await supabase.rpc('get_platform_financial_summary');
                if (finData && finData.success) {
                    setFinancialSummary({
                        platformClearedCents: Number(finData.platform_cleared_commission_cents) || 0,
                        platformPendingCents: Number(finData.platform_pending_commission_cents) || 0,
                        vendorEscrowFloatCents: Number(finData.vendor_escrow_float_cents) || 0,
                        vendorPayableCents: Number(finData.vendor_payable_cents) || 0,
                        ownerStoreSalesCents: Number(finData.owner_store_sales_cents) || 0,
                        pendingPayoutsCents: Number(finData.pending_payouts_cents) || 0
                    });
                } else if (finError) {
                    // Fallback calculation from existing datasets if migration is pending execution
                    const fallbackEscrowFloat = (escrowItemsRes?.data || [])
                        .filter(it => it.status !== 'delivered' && it.status !== 'refunded')
                        .reduce((sum, it) => sum + Math.round((it.price_at_purchase_cents * it.quantity) * 0.90), 0);
                    const fallbackPendingComms = (escrowItemsRes?.data || [])
                        .filter(it => it.status !== 'delivered' && it.status !== 'refunded')
                        .reduce((sum, it) => sum + Math.round((it.price_at_purchase_cents * it.quantity) * 0.10), 0);
                    const fallbackClearedComms = (escrowItemsRes?.data || [])
                        .filter(it => it.status === 'delivered')
                        .reduce((sum, it) => sum + Math.round((it.price_at_purchase_cents * it.quantity) * 0.10), 0);
                    const fallbackPendingPayouts = payoutsData
                        .filter(p => p.status === 'pending')
                        .reduce((sum, p) => sum + (p.amount_cents || 0), 0);

                    setFinancialSummary(prev => ({
                        ...prev,
                        platformClearedCents: fallbackClearedComms,
                        platformPendingCents: fallbackPendingComms,
                        vendorEscrowFloatCents: fallbackEscrowFloat,
                        pendingPayoutsCents: fallbackPendingPayouts
                    }));
                }
            } catch (finErr) {
                console.warn('Financial summary RPC notice:', finErr);
            }

            // Update SWR cache and persist in localStorage for instant 0ms subsequent tab visits
            const updatedAdminCache = {
                stats: newStats,
                recentOrders: recentRes?.data || [],
                chartOrders: ordersDataRes?.data || [],
                chartProducts: productsListRes?.data || [],
                pendingVendors: pendingRes?.data || [],
                allVendors: allVendorsRes?.data || [],
                categoriesList: categoriesRes?.data || [],
                escrowItems: escrowItemsRes?.data || [],
                payoutRequests: payoutsData,
                isAdmin: true,
                timestamp: Date.now()
            };
            adminCache.current = updatedAdminCache;

            try {
                localStorage.setItem('zimmarket_admin_cache', JSON.stringify(updatedAdminCache));
            } catch (cacheErr) {
                console.warn("Could not save admin cache to localStorage:", cacheErr);
            }

        } catch (err) {
            console.error("Failed loading admin dashboard", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdminData();
    }, []);

    const handleApproveVendor = async (vendorId) => {
        try {
            const { error } = await supabase
                .from('vendor_profiles')
                .update({ is_verified: true })
                .eq('id', vendorId);
                
            if (error) throw error;
            
            setPendingVendors(prev => prev.filter(v => v.id !== vendorId));
            setAllVendors(prev => prev.map(v => v.id === vendorId ? { ...v, is_verified: true } : v));
            showToast("Vendor profile approved successfully!", "success");
        } catch (err) {
            showToast(`Failed to approve vendor: ${err.message}`, "error");
        }
    };

    const handleApproveBuyer = async (buyerVerificationId) => {
        try {
            const { error } = await supabase
                .from('buyer_verifications')
                .update({ status: 'verified', updated_at: new Date().toISOString() })
                .eq('id', buyerVerificationId);
                
            if (error) throw error;
            
            setPendingBuyers(prev => prev.filter(b => b.id !== buyerVerificationId));
            showToast("✓ Buyer identity verified successfully!", "success");
        } catch (err) {
            showToast(`Failed to approve buyer: ${err.message}`, "error");
        }
    };

    const handleToggleStoreStatus = async (vendorId, currentActive) => {
        const newStatus = currentActive === false ? true : false;
        try {
            const { error } = await supabase
                .from('vendor_profiles')
                .update({ is_active: newStatus })
                .eq('id', vendorId);

            if (error) throw error;

            setAllVendors(prev => prev.map(v => v.id === vendorId ? { ...v, is_active: newStatus } : v));
            showToast(`Store has been ${newStatus ? 'activated' : 'suspended/deactivated'}.`, "success");
        } catch (err) {
            showToast(`Failed to change status: ${err.message}`, "error");
        }
    };

    const handleDeleteVendorStore = async (vendorId, storeName) => {
        showPrompt({
            title: `🗑️ Delete Store: ${storeName}`,
            message: `Are you sure you want to permanently remove "${storeName}" and all its listed products? This action cannot be undone.`,
            type: "danger",
            expectedText: "DELETE STORE",
            placeholder: 'Type "DELETE STORE" to confirm',
            confirmText: "Delete Store Permanently",
            onConfirm: async () => {
                setLoading(true);
                try {
                    // Try secure RPC first
                    const { error: rpcError } = await supabase.rpc('admin_delete_vendor_store', { target_vendor_id: vendorId });

                    if (rpcError) {
                        console.warn("admin_delete_vendor_store RPC fallback:", rpcError.message);
                        await supabase.from('order_items').delete().eq('shop_id', vendorId);
                        await supabase.from('products').delete().eq('shop_id', vendorId);
                        await supabase.from('vendor_balances').delete().eq('shop_id', vendorId);
                        const { error: deleteError } = await supabase.from('vendor_profiles').delete().eq('id', vendorId);
                        if (deleteError) throw deleteError;
                    }

                    showToast(`✓ Store "${storeName}" and its products have been permanently deleted.`, "success");
                    await loadAdminData();
                } catch (err) {
                    showToast(`Delete failed: ${err.message}`, "error");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleViewSecureDocument = async (docUrl) => {
        if (!docUrl) {
            showToast("No document file attached.", "warning");
            return;
        }
        try {
            showToast("Opening secure document...", "info");
            const signedUrl = await getSecureDocumentUrl('kyc-documents', docUrl, 3600);
            window.open(signedUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
            showToast("Failed to open document: " + err.message, "error");
        }
    };

    const handleProcessPayout = (payoutId, newStatus) => {
        const isReject = newStatus === 'rejected';
        const actionLabel = isReject ? 'Reject & Refund' : (newStatus === 'paid' ? 'Mark as Paid' : 'Approve');

        showPrompt({
            title: `${actionLabel} Payout Request`,
            message: isReject 
                ? "Provide the rejection reason (this will be logged and the funds automatically refunded to the vendor's wallet):" 
                : "Enter optional payment reference or approval notes (e.g. EcoCash Reference #):",
            placeholder: isReject ? "e.g. Invalid EcoCash number provided" : "e.g. EC-77894125",
            type: isReject ? "danger" : "info",
            confirmText: actionLabel,
            onConfirm: async (notes) => {
                setLoading(true);
                try {
                    const { data, error } = await supabase.rpc('admin_process_payout', {
                        p_payout_id: payoutId,
                        p_new_status: newStatus,
                        p_admin_notes: notes || ''
                    });

                    if (error) {
                        // Fallback if RPC pending
                        if (error.message.includes('Could not find the function')) {
                            throw new Error("Payout RPC is pending database migration. Please execute migration 25 in Supabase SQL editor.");
                        }
                        throw error;
                    }

                    showToast(`✓ Payout marked as ${newStatus}!`, "success");
                    await loadAdminData();
                } catch (err) {
                    showToast(`Failed: ${err.message}`, "error");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleAdminForceReleaseEscrow = async (item) => {
        showConfirm({
            title: `🟢 Release Escrow to Vendor`,
            message: `Are you sure you want to release $${(((item.price_cents || item.product?.price_cents || 0) * item.quantity) / 100).toFixed(2)} to vendor "${item.vendor?.store_name || 'Vendor'}"? This confirms item acceptance and credits their payout balance.`,
            type: "info",
            confirmText: "Release Escrow Funds",
            onConfirm: async () => {
                setProcessingEscrowId(item.id);
                try {
                    // The ledger RPC marks the item delivered and moves escrow -> available atomically
                    const { error } = await supabase.rpc('release_escrow', { p_item_id: item.id });
                    if (error) throw error;

                    showToast(`✓ Escrow released to vendor "${item.vendor?.store_name || 'Vendor'}".`, "success");
                    setEscrowItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'delivered' } : i));
                } catch (err) {
                    showToast(`Release failed: ${err.message}`, "error");
                } finally {
                    setProcessingEscrowId(null);
                }
            }
        });
    };

    const handleAdminForceRefundBuyer = async (item) => {
        showPrompt({
            title: `🔴 Issue Escrow Refund to Buyer`,
            message: `Are you sure you want to refund $${(((item.price_cents || item.product?.price_cents || 0) * item.quantity) / 100).toFixed(2)} to buyer (${item.order?.buyer_id ? item.order.buyer_id.slice(0, 8) : 'Customer'})?`,
            type: "danger",
            expectedText: "REFUND",
            placeholder: 'Type "REFUND" to confirm',
            confirmText: "Execute Refund",
            onConfirm: async () => {
                setProcessingEscrowId(item.id);
                try {
                    // Reverses vendor escrow + commission, restores stock and records what the buyer is owed
                    const { data, error } = await supabase.rpc('admin_refund_order_item', {
                        p_item_id: item.id,
                        p_reason: 'Admin dispute refund'
                    });
                    if (error) throw error;

                    const owed = `$${((data?.amount_cents || 0) / 100).toFixed(2)}${data?.currency === 'XTS' ? ' (test)' : ''}`;
                    showToast(`✓ Refund recorded: pay ${owed} to the buyer, then mark it paid under Refunds Owed.`, "success");
                    setEscrowItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'refunded' } : i));
                    loadRefunds();
                } catch (err) {
                    showToast(`Refund failed: ${err.message}`, "error");
                } finally {
                    setProcessingEscrowId(null);
                }
            }
        });
    };

    const loadRefunds = async () => {
        try {
            const { data, error } = await supabase
                .from('refunds')
                .select('id, order_id, buyer_id, amount_cents, currency, reason, status, payout_reference, created_at, paid_at')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            setRefunds(data || []);
        } catch (err) {
            console.warn('Could not load refunds:', err.message);
        }
    };

    const handleMarkRefundPaid = (refund) => {
        showPrompt({
            title: 'Mark Buyer Refund as Paid',
            message: `Enter the EcoCash / OneMoney transaction reference for the $${(refund.amount_cents / 100).toFixed(2)} refund to buyer ${refund.buyer_id.slice(0, 8)}.`,
            type: 'info',
            placeholder: 'e.g. MP261110.1234.A56789',
            confirmText: 'Mark Paid',
            onConfirm: async (reference) => {
                try {
                    const { error } = await supabase.rpc('admin_mark_refund_paid', {
                        p_refund_id: refund.id,
                        p_reference: reference
                    });
                    if (error) throw error;
                    showToast('✓ Refund marked as paid.', 'success');
                    loadRefunds();
                } catch (err) {
                    showToast(`Could not mark refund paid: ${err.message}`, 'error');
                }
            }
        });
    };

    useEffect(() => {
        if (activeTab === 'disputes') loadRefunds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Category Management CRUD Handlers
    const handleStartAddCategory = () => {
        setEditingCategoryId(null);
        setCategoryForm({ name: '', icon: '🏷️', subCategoriesText: '' });
        setIsEditingCategory(true);
    };

    const handleStartEditCategory = (cat) => {
        setEditingCategoryId(cat.id);
        setCategoryForm({
            name: cat.name || '',
            icon: cat.icon || '🏷️',
            subCategoriesText: Array.isArray(cat.sub_categories) ? cat.sub_categories.join(', ') : ''
        });
        setIsEditingCategory(true);
    };

    const handleCancelCategoryForm = () => {
        setIsEditingCategory(false);
        setEditingCategoryId(null);
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!categoryForm.name.trim()) {
            showToast('Please enter a category name.', 'warning');
            return;
        }

        setSavingCategory(true);
        try {
            const subCats = categoryForm.subCategoriesText
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            if (editingCategoryId) {
                // Update existing category
                const { error } = await supabase
                    .from('categories')
                    .update({
                        name: categoryForm.name.trim(),
                        icon: categoryForm.icon.trim() || '🏷️',
                        sub_categories: subCats
                    })
                    .eq('id', editingCategoryId);

                if (error) throw error;
                showToast(`Category "${categoryForm.name}" updated successfully!`, 'success');
            } else {
                // Insert new category
                const maxOrder = categoriesList.length ? Math.max(...categoriesList.map(c => c.display_order || 0)) : 0;
                const { error } = await supabase
                    .from('categories')
                    .insert({
                        name: categoryForm.name.trim(),
                        icon: categoryForm.icon.trim() || '🏷️',
                        sub_categories: subCats,
                        display_order: maxOrder + 1
                    });

                if (error) throw error;
                showToast(`Category "${categoryForm.name}" created successfully!`, 'success');
            }

            setIsEditingCategory(false);
            setEditingCategoryId(null);
            await loadAdminData();

        } catch (err) {
            showToast(`Failed to save category: ${err.message}`, 'error');
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = (catId, catName) => {
        showConfirm({
            title: `Delete Category: ${catName}`,
            message: `Are you sure you want to delete the "${catName}" category? Products already in this category will not be deleted, but it will be removed from marketplace filters.`,
            type: "danger",
            confirmText: "Delete Category",
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('categories')
                        .delete()
                        .eq('id', catId);

                    if (error) throw error;
                    showToast(`Category "${catName}" deleted.`, 'success');
                    await loadAdminData();
                } catch (err) {
                    showToast(`Delete failed: ${err.message}`, 'error');
                }
            }
        });
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading Admin...</div>;

    if (!isAdmin) return (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--danger)' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Access Denied</h2>
            <p>You do not have superadmin privileges.</p>
        </div>
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '32px', color: 'var(--text-primary)', margin: 0 }}>👑 Platform Admin</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontSize: '14px' }}>
                        Executive management suite for marketplace metrics, vendor stores, taxonomy, and transactions.
                    </p>
                </div>
            </div>

            {/* Sub-Tab Navigation Bar */}
            <AdminTabsBar
                activeTab={activeTab}
                allVendors={allVendors}
                categoriesList={categoriesList}
                escrowItems={escrowItems}
                heroProducts={heroProducts}
                payoutRequests={payoutRequests}
                pendingVendors={pendingVendors}
                setActiveTab={setActiveTab}
                stats={stats}
            />
            
            {/* TAB 1: OVERVIEW & ANALYTICS */}
            {activeTab === 'overview' && (
                <OverviewTab
                    adminRateMeta={adminRateMeta}
                    adminZigRate={adminZigRate}
                    chartOrders={chartOrders}
                    chartProducts={chartProducts}
                    currency={currency}
                    financialSummary={financialSummary}
                    formatPrice={formatPrice}
                    handlePromptRateOverride={handlePromptRateOverride}
                    pendingBuyers={pendingBuyers}
                    pendingVendors={pendingVendors}
                    setActiveTab={setActiveTab}
                    stats={stats}
                />
            )}

            {/* TAB 2: VENDORS & STORES */}
            {activeTab === 'vendors' && (
                <VendorsTab
                    allVendors={allVendors}
                    handleApproveBuyer={handleApproveBuyer}
                    handleApproveVendor={handleApproveVendor}
                    handleDeleteVendorStore={handleDeleteVendorStore}
                    handleToggleStoreStatus={handleToggleStoreStatus}
                    handleViewSecureDocument={handleViewSecureDocument}
                    pendingBuyers={pendingBuyers}
                    pendingVendors={pendingVendors}
                />
            )}

            {/* TAB 3: CATEGORIES & TAXONOMY */}
            {activeTab === 'categories' && (
                <CategoriesTab
                    categoriesList={categoriesList}
                    categoryForm={categoryForm}
                    editingCategoryId={editingCategoryId}
                    handleCancelCategoryForm={handleCancelCategoryForm}
                    handleDeleteCategory={handleDeleteCategory}
                    handleSaveCategory={handleSaveCategory}
                    handleStartAddCategory={handleStartAddCategory}
                    handleStartEditCategory={handleStartEditCategory}
                    isEditingCategory={isEditingCategory}
                    savingCategory={savingCategory}
                    setCategoryForm={setCategoryForm}
                />
            )}

            {/* TAB 4: ORDERS & TRANSACTIONS */}
            {activeTab === 'orders' && (
                <OrdersTab currency={currency} formatPrice={formatPrice} recentOrders={recentOrders} />
            )}

            {/* TAB 5: ESCROW DISPUTES & MEDIATION */}
            {activeTab === 'disputes' && (
                <DisputesTab
                    adminZigRate={adminZigRate}
                    disputeFilter={disputeFilter}
                    escrowItems={escrowItems}
                    handleAdminForceRefundBuyer={handleAdminForceRefundBuyer}
                    handleAdminForceReleaseEscrow={handleAdminForceReleaseEscrow}
                    handleMarkRefundPaid={handleMarkRefundPaid}
                    processingEscrowId={processingEscrowId}
                    refunds={refunds}
                    setDisputeFilter={setDisputeFilter}
                />
            )}

            {/* TAB 6: PAYOUT REQUESTS & SETTLEMENT */}
            {activeTab === 'payouts' && (
                <PayoutsTab handleProcessPayout={handleProcessPayout} loadAdminData={loadAdminData} payoutRequests={payoutRequests} />
            )}

            {/* TAB 7: HERO SPOTLIGHT & PROMOTIONS */}
            {activeTab === 'hero' && (
                <HeroTab
                    adminZigRate={adminZigRate}
                    handleSetHeroDiscount={handleSetHeroDiscount}
                    handleToggleHeroPromo={handleToggleHeroPromo}
                    handleToggleHeroSpotlight={handleToggleHeroSpotlight}
                    heroFilter={heroFilter}
                    heroProducts={heroProducts}
                    heroSearchTerm={heroSearchTerm}
                    loadHeroProducts={loadHeroProducts}
                    loadingHeroProducts={loadingHeroProducts}
                    setHeroFilter={setHeroFilter}
                    setHeroSearchTerm={setHeroSearchTerm}
                    updatingHeroId={updatingHeroId}
                />
            )}
        </div>
    );
}
