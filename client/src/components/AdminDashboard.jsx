// client/src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';
import { useModal } from './ModalContext.jsx';
import { SalesTrendChart } from './SalesTrendChart.jsx';
import { CategoryBreakdownChart } from './CategoryBreakdownChart.jsx';

// Module-level in-memory SWR cache for 0ms admin dashboard rendering
let globalAdminCache = {
    stats: null,
    recentOrders: null,
    chartOrders: null,
    chartProducts: null,
    pendingVendors: null,
    allVendors: null,
    categoriesList: null,
    isAdmin: null,
    timestamp: 0
};

export function AdminDashboard({ currency = 'USD', formatPrice }) {
    const { showToast } = useToast();
    const { showConfirm, showPrompt } = useModal();
    const [stats, setStats] = useState(() => globalAdminCache.stats || { users: 0, products: 0, orders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState(() => globalAdminCache.recentOrders || []);
    const [chartOrders, setChartOrders] = useState(() => globalAdminCache.chartOrders || []);
    const [chartProducts, setChartProducts] = useState(() => globalAdminCache.chartProducts || []);
    const [pendingVendors, setPendingVendors] = useState(() => globalAdminCache.pendingVendors || []);
    const [allVendors, setAllVendors] = useState(() => globalAdminCache.allVendors || []);
    const [categoriesList, setCategoriesList] = useState(() => globalAdminCache.categoriesList || []);
    const [escrowItems, setEscrowItems] = useState(() => globalAdminCache.escrowItems || []);
    const [disputeFilter, setDisputeFilter] = useState('all'); // 'all' | 'held' | 'delivered' | 'refunded'
    const [processingEscrowId, setProcessingEscrowId] = useState(null);
    const [loading, setLoading] = useState(() => !globalAdminCache.stats);
    const [isAdmin, setIsAdmin] = useState(() => globalAdminCache.isAdmin ?? false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'vendors' | 'categories' | 'orders' | 'disputes'

    // Category Management Form State
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', icon: '🏷️', subCategoriesText: '' });
    const [savingCategory, setSavingCategory] = useState(false);

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

            // Fetch Stats, Orders, Products, Pending Vendors, All Stores, Categories, and Escrow Items in parallel
            const [usersRes, productsCountRes, ordersCountRes, ordersDataRes, productsListRes, recentRes, pendingRes, allVendorsRes, categoriesRes, escrowItemsRes] = await Promise.all([
                supabase.from('vendor_profiles').select('*', { count: 'exact', head: true }),
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('id, total_amount_cents, created_at, status').order('created_at', { ascending: true }),
                supabase.from('products').select('id, category, sub_category'),
                supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
                supabase.from('vendor_profiles').select('*').eq('is_verified', false).not('id_document_url', 'is', null),
                supabase.from('vendor_profiles').select('id, store_name, whatsapp_number, vendor_type, is_verified, is_active, created_at').order('created_at', { ascending: false }),
                supabase.from('categories').select('*').order('display_order', { ascending: true }),
                supabase.from('order_items').select('*, product:products(title, item_no, image_url), vendor:vendor_profiles(store_name, whatsapp_number), order:orders(buyer_id, created_at, status, total_amount_cents)').order('created_at', { ascending: false }).limit(50)
            ]);

            const usersCount = usersRes.count || 0;
            const productsCount = productsCountRes.count || 0;
            const ordersCount = ordersCountRes.count || 0;
            const totalRev = ordersDataRes.data ? ordersDataRes.data.reduce((sum, o) => sum + (o.total_amount_cents || 0), 0) : 0;

            const newStats = {
                users: usersCount,
                products: productsCount,
                orders: ordersCount,
                revenue: totalRev / 100
            };

            setStats(newStats);

            if (ordersDataRes.data) setChartOrders(ordersDataRes.data);
            if (productsListRes.data) setChartProducts(productsListRes.data);
            if (recentRes.data) setRecentOrders(recentRes.data);
            if (pendingRes.data) setPendingVendors(pendingRes.data);
            if (allVendorsRes.data) setAllVendors(allVendorsRes.data);
            if (categoriesRes.data) setCategoriesList(categoriesRes.data);
            if (escrowItemsRes.data) setEscrowItems(escrowItemsRes.data);

            // Update SWR cache
            globalAdminCache = {
                stats: newStats,
                recentOrders: recentRes.data || [],
                chartOrders: ordersDataRes.data || [],
                chartProducts: productsListRes.data || [],
                pendingVendors: pendingRes.data || [],
                allVendors: allVendorsRes.data || [],
                categoriesList: categoriesRes.data || [],
                escrowItems: escrowItemsRes.data || [],
                isAdmin: true,
                timestamp: Date.now()
            };

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

    const handleAdminForceReleaseEscrow = async (item) => {
        showConfirm({
            title: `🟢 Release Escrow to Vendor`,
            message: `Are you sure you want to release $${(((item.price_cents || item.product?.price_cents || 0) * item.quantity) / 100).toFixed(2)} to vendor "${item.vendor?.store_name || 'Vendor'}"? This confirms item acceptance and credits their payout balance.`,
            type: "info",
            confirmText: "Release Escrow Funds",
            onConfirm: async () => {
                setProcessingEscrowId(item.id);
                try {
                    const { error } = await supabase
                        .from('order_items')
                        .update({ status: 'delivered' })
                        .eq('id', item.id);
                    if (error) throw error;

                    const amountCents = (item.price_cents || item.product?.price_cents || 0) * item.quantity;
                    if (item.shop_id) {
                        try {
                            await supabase
                                .from('vendor_balances')
                                .upsert({
                                    shop_id: item.shop_id,
                                    currency: 'USD',
                                    available_balance_cents: amountCents,
                                    updated_at: new Date().toISOString()
                                }, { onConflict: 'shop_id,currency' });
                        } catch (e) {
                            console.warn("balance upsert warning:", e);
                        }
                    }

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
                    const { error } = await supabase
                        .from('order_items')
                        .update({ status: 'refunded' })
                        .eq('id', item.id);
                    if (error) throw error;

                    showToast(`✓ Refund processed. Escrow status set to Refunded.`, "success");
                    setEscrowItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'refunded' } : i));
                } catch (err) {
                    showToast(`Refund failed: ${err.message}`, "error");
                } finally {
                    setProcessingEscrowId(null);
                }
            }
        });
    };

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
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '32px', 
                overflowX: 'auto', 
                paddingBottom: '6px', 
                borderBottom: '1px solid var(--border)' 
            }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '10px 18px', 
                        borderRadius: '12px', 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                    }}
                >
                    <span>📊</span>
                    <span>Overview & Analytics</span>
                </button>
                
                <button
                    type="button"
                    onClick={() => setActiveTab('vendors')}
                    className={activeTab === 'vendors' ? 'btn-primary' : 'btn-secondary'}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '10px 18px', 
                        borderRadius: '12px', 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                    }}
                >
                    <span>🏪</span>
                    <span>Vendors & Stores ({allVendors.length})</span>
                    {pendingVendors.length > 0 && (
                        <span style={{ 
                            backgroundColor: 'var(--warning, #f59e0b)', 
                            color: '#000', 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            padding: '2px 7px', 
                            borderRadius: '10px' 
                        }}>
                            {pendingVendors.length} KYC
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('categories')}
                    className={activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '10px 18px', 
                        borderRadius: '12px', 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                    }}
                >
                    <span>🏷️</span>
                    <span>Categories ({categoriesList.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '10px 18px', 
                        borderRadius: '12px', 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                    }}
                >
                    <span>📦</span>
                    <span>Orders & Transactions ({stats.orders})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('disputes')}
                    className={activeTab === 'disputes' ? 'btn-primary' : 'btn-secondary'}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '10px 18px', 
                        borderRadius: '12px', 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                    }}
                >
                    <span>⚖️</span>
                    <span>Escrow Disputes & Mediation</span>
                    {escrowItems.filter(i => i.status !== 'delivered' && i.status !== 'refunded').length > 0 && (
                        <span style={{ 
                            backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                            color: 'var(--accent-primary)', 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            padding: '2px 7px', 
                            borderRadius: '10px',
                            border: '1px solid var(--accent-primary)'
                        }}>
                            {escrowItems.filter(i => i.status !== 'delivered' && i.status !== 'refunded').length} Held
                        </span>
                    )}
                </button>
            </div>
            
            {/* TAB 1: OVERVIEW & ANALYTICS */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    {/* Top KPI Metric Cards */}
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Total Vendors</div>
                            <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-primary)' }}>{stats.users}</div>
                        </div>
                        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Live Products</div>
                            <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-primary)' }}>{stats.products}</div>
                        </div>
                        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Total Orders</div>
                            <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-primary)' }}>{stats.orders}</div>
                        </div>
                        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Total GMV</div>
                            <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--success)' }}>
                                {formatPrice ? formatPrice(Math.round(stats.revenue * 100), currency) : `$${stats.revenue.toFixed(2)}`}
                            </div>
                        </div>
                    </div>

                    {/* Pending KYC Notice Banner */}
                    {pendingVendors.length > 0 && (
                        <div 
                            className="glass-panel" 
                            style={{ 
                                padding: '16px 24px', 
                                marginBottom: '32px', 
                                border: '1px solid var(--warning)', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                flexWrap: 'wrap', 
                                gap: '12px' 
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>⚠️</span>
                                <div>
                                    <strong style={{ color: 'var(--warning)', fontSize: '15px' }}>
                                        {pendingVendors.length} Vendor KYC Verification{pendingVendors.length > 1 ? 's' : ''} Pending
                                    </strong>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        New merchants have submitted National ID / Company registration documents.
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveTab('vendors')}
                                className="btn-primary"
                                style={{ backgroundColor: 'var(--warning)', color: '#000', fontWeight: '700', padding: '8px 16px', fontSize: '13px' }}
                            >
                                Review KYC Submissions →
                            </button>
                        </div>
                    )}

                    {/* Interactive Analytics & Trajectory Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                        <div style={{ minWidth: 0 }}>
                            <SalesTrendChart 
                                orders={chartOrders} 
                                title="Platform GMV & Order Trajectory" 
                                currency={currency}
                                formatPrice={formatPrice}
                            />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <CategoryBreakdownChart 
                                products={chartProducts} 
                                title="Marketplace Category Share" 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: VENDORS & STORES */}
            {activeTab === 'vendors' && (
                <div className="animate-fade-in">
                    {/* Pending Vendor KYC Verifications */}
                    {pendingVendors.length > 0 && (
                        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', border: '1px solid var(--warning)' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', color: 'var(--warning)' }}>
                                ⚠️ Pending KYC Verifications ({pendingVendors.length})
                            </h3>
                            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Review identity and company documents to grant verified status.
                            </p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                                            <th style={{ padding: '14px', fontWeight: '600' }}>Store Name</th>
                                            <th style={{ padding: '14px', fontWeight: '600' }}>WhatsApp</th>
                                            <th style={{ padding: '14px', fontWeight: '600' }}>Documents</th>
                                            <th style={{ padding: '14px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingVendors.map(vendor => (
                                            <tr key={vendor.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>{vendor.store_name}</td>
                                                <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>+{vendor.whatsapp_number}</td>
                                                <td style={{ padding: '14px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                                            {vendor.vendor_type || 'individual'} Seller
                                                        </span>
                                                        <a href={vendor.id_document_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline', fontSize: '13px' }}>National ID</a>
                                                        {vendor.selfie_with_id_url && (
                                                            <a href={vendor.selfie_with_id_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline', fontSize: '13px' }}>Selfie w/ ID</a>
                                                        )}
                                                        {vendor.company_registration_url && (
                                                            <a href={vendor.company_registration_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline', fontSize: '13px' }}>Company Docs</a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px', textAlign: 'right' }}>
                                                    <button 
                                                        onClick={() => handleApproveVendor(vendor.id)}
                                                        className="btn-primary"
                                                        style={{ backgroundColor: 'var(--success)', fontSize: '13px', padding: '8px 16px' }}
                                                    >
                                                        Approve ✔️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Registered Vendor Stores Directory */}
                    <div className="glass-panel" style={{ padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>
                                    🏪 Registered Vendor Stores ({allVendors.length})
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Manage active status, suspend non-operational stores, or permanently remove merchant profiles.
                                </p>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '14px', fontWeight: '600' }}>Store Name</th>
                                        <th style={{ padding: '14px', fontWeight: '600' }}>WhatsApp</th>
                                        <th style={{ padding: '14px', fontWeight: '600' }}>Type</th>
                                        <th style={{ padding: '14px', fontWeight: '600' }}>Status</th>
                                        <th style={{ padding: '14px', fontWeight: '600', textAlign: 'right' }}>Store Controls</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allVendors.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No stores registered yet.</td>
                                        </tr>
                                    ) : (
                                        allVendors.map(vendor => {
                                            const isActive = vendor.is_active !== false;
                                            return (
                                                <tr key={vendor.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span>{vendor.store_name}</span>
                                                            {vendor.is_verified && (
                                                                <span style={{ fontSize: '11px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                                    ✓ Verified
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>+{vendor.whatsapp_number}</td>
                                                    <td style={{ padding: '14px', color: 'var(--text-muted)', textTransform: 'capitalize', fontSize: '13px' }}>
                                                        {vendor.vendor_type || 'individual'}
                                                    </td>
                                                    <td style={{ padding: '14px' }}>
                                                        <span style={{
                                                            fontSize: '12px',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontWeight: '700',
                                                            backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: isActive ? 'var(--success)' : 'var(--danger)'
                                                        }}>
                                                            {isActive ? '● Active' : '○ Suspended'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => handleToggleStoreStatus(vendor.id, vendor.is_active)}
                                                                className="btn-secondary"
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    color: isActive ? 'var(--warning, #f59e0b)' : 'var(--success)',
                                                                    borderColor: isActive ? 'var(--warning, #f59e0b)' : 'var(--success)'
                                                                }}
                                                                title={isActive ? "Hide products from storefront" : "Restore store and products"}
                                                            >
                                                                {isActive ? '⏸️ Suspend' : '▶️ Activate'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteVendorStore(vendor.id, vendor.store_name)}
                                                                className="btn-secondary"
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    color: 'var(--danger)',
                                                                    borderColor: 'var(--danger)'
                                                                }}
                                                                title="Permanently remove this store and its catalog"
                                                            >
                                                                🗑️ Delete
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
                    </div>
                </div>
            )}

            {/* TAB 3: CATEGORIES & TAXONOMY */}
            {activeTab === 'categories' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>
                                🏷️ Categories & Subcategories ({categoriesList.length})
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Configure official marketplace categories, subcategory tags, and custom emoji icons.
                            </p>
                        </div>

                        {!isEditingCategory && (
                            <button
                                onClick={handleStartAddCategory}
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
                            >
                                ➕ Add New Category
                            </button>
                        )}
                    </div>

                    {/* Add / Edit Category Form */}
                    {isEditingCategory && (
                        <form 
                            onSubmit={handleSaveCategory} 
                            className="glass-panel animate-fade-in" 
                            style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--accent-primary)' }}
                        >
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                                {editingCategoryId ? '✏️ Edit Marketplace Category' : '➕ Create New Marketplace Category'}
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                        Category Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Solar & Energy, Agriculture"
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                        Icon Emoji
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 📱, 🚗, ⚡, 🌾, 🏡"
                                        value={categoryForm.icon}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Subcategories (comma-separated list)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Solar Panels, Inverters, Backup Batteries, Solar Geysers"
                                    value={categoryForm.subCategoriesText}
                                    onChange={(e) => setCategoryForm(prev => ({ ...prev, subCategoriesText: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px'
                                    }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Separate each subcategory with a comma. Vendors and buyers will see these in filter dropdowns.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={handleCancelCategoryForm}
                                    className="btn-secondary"
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingCategory}
                                    className="btn-primary"
                                    style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '700' }}
                                >
                                    {savingCategory ? 'Saving...' : editingCategoryId ? 'Save Changes' : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Categories Grid Table */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {categoriesList.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No categories configured yet. Click "Add New Category" above to create one.
                            </div>
                        ) : (
                            categoriesList.map(cat => (
                                <div 
                                    key={cat.id} 
                                    className="glass-panel" 
                                    style={{ 
                                        padding: '18px', 
                                        borderRadius: '12px', 
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        backgroundColor: 'var(--bg-secondary)'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '24px' }}>{cat.icon || '🏷️'}</span>
                                                <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{cat.name}</strong>
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    onClick={() => handleStartEditCategory(cat)}
                                                    className="btn-secondary"
                                                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600' }}
                                                    title="Edit category and subcategories"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                    className="btn-secondary"
                                                    style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                                    title="Delete category"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        {/* Subcategories Tags */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                                            {Array.isArray(cat.sub_categories) && cat.sub_categories.length > 0 ? (
                                                cat.sub_categories.map((sub, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        style={{ 
                                                            fontSize: '11px', 
                                                            backgroundColor: 'var(--bg-primary)', 
                                                            color: 'var(--text-secondary)', 
                                                            padding: '3px 8px', 
                                                            borderRadius: '6px', 
                                                            border: '1px solid var(--border)' 
                                                        }}
                                                    >
                                                        {sub}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No subcategories defined</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: ORDERS & TRANSACTIONS */}
            {activeTab === 'orders' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>
                                📦 Marketplace Transactions ({recentOrders.length})
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Real-time operational feed of customer orders, values, and fulfillment status.
                            </p>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Order ID</th>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Date & Time</th>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Buyer ID</th>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Status</th>
                                    <th style={{ padding: '14px', fontWeight: '600', textAlign: 'right' }}>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No orders placed yet.</td>
                                    </tr>
                                ) : (
                                    recentOrders.map(order => (
                                        <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '14px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: '600' }}>
                                                #{order.id.split('-')[0]}
                                            </td>
                                            <td style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                {new Date(order.created_at).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '14px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                {order.buyer_id ? `${order.buyer_id.split('-')[0]}...` : 'Guest'}
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    backgroundColor: order.status === 'completed' || order.status === 'delivered'
                                                        ? 'rgba(16, 185, 129, 0.15)'
                                                        : order.status === 'cancelled'
                                                        ? 'rgba(239, 68, 68, 0.15)'
                                                        : 'rgba(59, 130, 246, 0.15)',
                                                    color: order.status === 'completed' || order.status === 'delivered'
                                                        ? 'var(--success)'
                                                        : order.status === 'cancelled'
                                                        ? 'var(--danger)'
                                                        : 'var(--accent-primary)'
                                                }}>
                                                    {order.status || 'paid'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px', fontWeight: '700', color: 'var(--success)', textAlign: 'right', fontSize: '15px' }}>
                                                {formatPrice ? formatPrice(order.total_amount_cents || 0, currency) : `$${((order.total_amount_cents || 0) / 100).toFixed(2)}`}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 5: ESCROW DISPUTES & MEDIATION */}
            {activeTab === 'disputes' && (
                <div className="animate-fade-in">
                    {/* Escrow KPI Metric Cards */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
                        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>🔒 Escrow Held in Trust</div>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                                ${((escrowItems.filter(i => i.status !== 'delivered' && i.status !== 'refunded').reduce((s, i) => s + ((i.price_cents || i.product?.price_cents || 0) * i.quantity), 0)) / 100).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {escrowItems.filter(i => i.status !== 'delivered' && i.status !== 'refunded').length} active transactions
                            </div>
                        </div>

                        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>🟢 Released to Vendors</div>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>
                                ${((escrowItems.filter(i => i.status === 'delivered').reduce((s, i) => s + ((i.price_cents || i.product?.price_cents || 0) * i.quantity), 0)) / 100).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {escrowItems.filter(i => i.status === 'delivered').length} completed orders
                            </div>
                        </div>

                        <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>🔴 Refunded to Buyers</div>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--danger)' }}>
                                ${((escrowItems.filter(i => i.status === 'refunded').reduce((s, i) => s + ((i.price_cents || i.product?.price_cents || 0) * i.quantity), 0)) / 100).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {escrowItems.filter(i => i.status === 'refunded').length} refunded orders
                            </div>
                        </div>
                    </div>

                    {/* Escrow Console Table Panel */}
                    <div className="glass-panel" style={{ padding: '28px', backgroundColor: 'var(--bg-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚖️ Escrow Protection & Dispute Mediation Console</span>
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Superadmin overrides for buyer-vendor escrow disputes, parcel tracking delays, and emergency fund releases.
                                </p>
                            </div>

                            {/* Filter Chips */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[
                                    { key: 'all', label: 'All Items' },
                                    { key: 'held', label: '🔒 Held in Escrow' },
                                    { key: 'delivered', label: '✓ Released' },
                                    { key: 'refunded', label: '✕ Refunded' }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setDisputeFilter(tab.key)}
                                        className={disputeFilter === tab.key ? 'btn-primary' : 'btn-secondary'}
                                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', fontWeight: '600' }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px' }}>
                                        <th style={{ padding: '12px 14px', fontWeight: '700' }}>Item & SKU</th>
                                        <th style={{ padding: '12px 14px', fontWeight: '700' }}>Vendor Store</th>
                                        <th style={{ padding: '12px 14px', fontWeight: '700' }}>Buyer ID</th>
                                        <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'right' }}>Escrow Amount</th>
                                        <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>Escrow State</th>
                                        <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'right' }}>Admin Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {escrowItems
                                        .filter(item => {
                                            if (disputeFilter === 'held') return item.status !== 'delivered' && item.status !== 'refunded';
                                            if (disputeFilter === 'delivered') return item.status === 'delivered';
                                            if (disputeFilter === 'refunded') return item.status === 'refunded';
                                            return true;
                                        })
                                        .length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No escrow transactions match the selected filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        escrowItems
                                            .filter(item => {
                                                if (disputeFilter === 'held') return item.status !== 'delivered' && item.status !== 'refunded';
                                                if (disputeFilter === 'delivered') return item.status === 'delivered';
                                                if (disputeFilter === 'refunded') return item.status === 'refunded';
                                                return true;
                                            })
                                            .map(item => {
                                                const itemTotalCents = (item.price_cents || item.product?.price_cents || 0) * item.quantity;
                                                const isHeld = item.status !== 'delivered' && item.status !== 'refunded';
                                                const isProcessing = processingEscrowId === item.id;

                                                return (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                {item.product?.image_url ? (
                                                                    <img src={item.product.image_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📦</div>
                                                                )}
                                                                <div>
                                                                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.product?.title || 'Product Item'}</div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                        Qty: {item.quantity} {item.product?.item_no ? `• SKU: ${item.product.item_no}` : ''}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td style={{ padding: '12px 14px' }}>
                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.vendor?.store_name || 'Vendor'}</div>
                                                            {item.vendor?.whatsapp_number && (
                                                                <a 
                                                                    href={`https://wa.me/${item.vendor.whatsapp_number}?text=${encodeURIComponent(`Hi ${item.vendor.store_name}, this is ZimMarket Admin regarding escrow order item #${item.id.slice(0, 8)}.`)}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={{ fontSize: '11px', color: '#25D366', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                                                                >
                                                                    💬 +{item.vendor.whatsapp_number}
                                                                </a>
                                                            )}
                                                        </td>

                                                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                            {item.order?.buyer_id ? `${item.order.buyer_id.slice(0, 8)}...` : 'Buyer'}
                                                        </td>

                                                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                            <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>${(itemTotalCents / 100).toFixed(2)}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>≈ ZiG {((itemTotalCents / 100) * 26.5).toFixed(2)}</div>
                                                        </td>

                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                textTransform: 'uppercase',
                                                                backgroundColor: item.status === 'delivered'
                                                                    ? 'rgba(16, 185, 129, 0.15)'
                                                                    : item.status === 'refunded'
                                                                    ? 'rgba(239, 68, 68, 0.15)'
                                                                    : 'rgba(59, 130, 246, 0.15)',
                                                                color: item.status === 'delivered'
                                                                    ? 'var(--success)'
                                                                    : item.status === 'refunded'
                                                                    ? 'var(--danger)'
                                                                    : 'var(--accent-primary)',
                                                                border: isHeld ? '1px solid var(--accent-primary)' : 'none'
                                                            }}>
                                                                {item.status === 'delivered' ? '✓ Released' : item.status === 'refunded' ? '✕ Refunded' : '🔒 In Escrow'}
                                                            </span>
                                                        </td>

                                                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                            {isHeld ? (
                                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                                    <button
                                                                        onClick={() => handleAdminForceReleaseEscrow(item)}
                                                                        disabled={isProcessing}
                                                                        className="btn-primary"
                                                                        style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--success)' }}
                                                                        title="Force release escrow funds to vendor account"
                                                                    >
                                                                        🟢 Release
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleAdminForceRefundBuyer(item)}
                                                                        disabled={isProcessing}
                                                                        className="btn-secondary"
                                                                        style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                                                        title="Refund escrow funds back to buyer"
                                                                    >
                                                                        🔴 Refund
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Resolved ✓</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
