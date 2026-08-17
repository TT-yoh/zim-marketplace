// client/src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';
import { useModal } from './ModalContext.jsx';

export function AdminDashboard() {
    const { showToast } = useToast();
    const { showPrompt } = useModal();
    const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [pendingVendors, setPendingVendors] = useState([]);
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

            // Fetch Stats, Recent Orders, and Pending Vendors in parallel
            const [usersRes, productsRes, ordersCountRes, ordersDataRes, recentRes, pendingRes] = await Promise.all([
                supabase.from('vendor_profiles').select('*', { count: 'exact', head: true }),
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('total_amount_cents'),
                supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
                supabase.from('vendor_profiles').select('*').eq('is_verified', false).not('id_document_url', 'is', null)
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
            showToast("Vendor profile approved successfully!", "success");
        } catch (err) {
            showToast(`Failed to approve vendor: ${err.message}`, "error");
        }
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
