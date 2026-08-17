// client/src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';
import { useModal } from './ModalContext.jsx';

export function AdminDashboard() {
    const { showToast } = useToast();
    const { showConfirm, showPrompt } = useModal();
    const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [pendingVendors, setPendingVendors] = useState([]);
    const [allVendors, setAllVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

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

            // Fetch Stats, Recent Orders, Pending Vendors, and All Stores
            const [usersRes, productsRes, ordersCountRes, ordersDataRes, recentRes, pendingRes, allVendorsRes] = await Promise.all([
                supabase.from('vendor_profiles').select('*', { count: 'exact', head: true }),
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('total_amount_cents'),
                supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
                supabase.from('vendor_profiles').select('*').eq('is_verified', false).not('id_document_url', 'is', null),
                supabase.from('vendor_profiles').select('id, store_name, whatsapp_number, vendor_type, is_verified, is_active, created_at').order('created_at', { ascending: false })
            ]);

            const usersCount = usersRes.count || 0;
            const productsCount = productsRes.count || 0;
            const ordersCount = ordersCountRes.count || 0;
            const totalRev = ordersDataRes.data ? ordersDataRes.data.reduce((sum, o) => sum + (o.total_amount_cents || 0), 0) : 0;

            setStats({
                users: usersCount,
                products: productsCount,
                orders: ordersCount,
                revenue: totalRev / 100
            });

            if (recentRes.data) setRecentOrders(recentRes.data);
            if (pendingRes.data) setPendingVendors(pendingRes.data);
            if (allVendorsRes.data) setAllVendors(allVendorsRes.data);

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

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading Admin...</div>;

    if (!isAdmin) return (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--danger)' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Access Denied</h2>
            <p>You do not have superadmin privileges.</p>
        </div>
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <h2 style={{ fontSize: '32px', color: 'var(--text-primary)', marginBottom: '32px' }}>Platform Admin</h2>
            
            <div style={{ display: 'flex', gap: '24px', marginBottom: '40px', flexWrap: 'wrap' }}>
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
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--success)' }}>${stats.revenue.toFixed(2)}</div>
                </div>
            </div>

            {pendingVendors.length > 0 && (
                <div className="glass-panel" style={{ padding: '32px', marginBottom: '40px', border: '1px solid var(--warning)' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', color: 'var(--warning)' }}>Pending Vendor KYC Verifications ({pendingVendors.length})</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '16px', fontWeight: '600' }}>Store Name</th>
                                    <th style={{ padding: '16px', fontWeight: '600' }}>WhatsApp</th>
                                    <th style={{ padding: '16px', fontWeight: '600' }}>Documents</th>
                                    <th style={{ padding: '16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingVendors.map(vendor => (
                                    <tr key={vendor.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: '500' }}>{vendor.store_name}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>+{vendor.whatsapp_number}</td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: '4px' }}>
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
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
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
            <div className="glass-panel" style={{ padding: '32px', marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>
                            🏪 Registered Vendor Stores ({allVendors.length})
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Manage active status, suspend non-operational stores, or permanently delete inactive merchant profiles.
                        </p>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '16px', fontWeight: '600' }}>Store Name</th>
                                <th style={{ padding: '16px', fontWeight: '600' }}>WhatsApp</th>
                                <th style={{ padding: '16px', fontWeight: '600' }}>Type</th>
                                <th style={{ padding: '16px', fontWeight: '600' }}>Status</th>
                                <th style={{ padding: '16px', fontWeight: '600', textAlign: 'right' }}>Store Controls</th>
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
                                            <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{vendor.store_name}</span>
                                                    {vendor.is_verified && (
                                                        <span style={{ fontSize: '11px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                            ✓ Verified
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>+{vendor.whatsapp_number}</td>
                                            <td style={{ padding: '16px', color: 'var(--text-muted)', textTransform: 'capitalize', fontSize: '13px' }}>
                                                {vendor.vendor_type || 'individual'}
                                            </td>
                                            <td style={{ padding: '16px' }}>
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
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
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
                                                        {isActive ? '⏸️ Suspend Store' : '▶️ Activate Store'}
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
                                                        🗑️ Delete Store
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

            <div className="glass-panel" style={{ padding: '32px', marginBottom: '40px' }}>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', color: 'var(--text-primary)' }}>Recent Transactions</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '16px', fontWeight: '600' }}>Order ID</th>
                                <th style={{ padding: '16px', fontWeight: '600' }}>Date</th>
                                <th style={{ padding: '16px', fontWeight: '600' }}>Buyer ID</th>
                                <th style={{ padding: '16px', fontWeight: '600' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No orders yet.</td>
                                </tr>
                            ) : (
                                recentOrders.map(order => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{order.id.split('-')[0]}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{new Date(order.created_at).toLocaleString()}</td>
                                        <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{order.buyer_id.split('-')[0]}...</td>
                                        <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--success)' }}>${(order.total_amount_cents / 100).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
