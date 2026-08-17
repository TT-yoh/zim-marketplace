// client/src/components/VendorOrders.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

const StatusStepper = ({ status }) => {
    const steps = ['pending', 'shipped', 'delivered'];
    const currentIndex = steps.indexOf(status) !== -1 ? steps.indexOf(status) : 0;
    
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            {steps.map((step, index) => (
                <React.Fragment key={step}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ 
                            width: '16px', height: '16px', borderRadius: '50%', 
                            backgroundColor: index <= currentIndex ? 'var(--success)' : 'transparent',
                            border: index <= currentIndex ? 'none' : '2px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {index <= currentIndex && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
                        </div>
                        <span style={{ 
                            fontSize: '12px', 
                            color: index <= currentIndex ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontWeight: index === currentIndex ? '600' : '400',
                            textTransform: 'capitalize'
                        }}>
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div style={{ 
                            height: '2px', width: '24px', 
                            backgroundColor: index < currentIndex ? 'var(--success)' : 'var(--border)'
                        }} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export function VendorOrders({ shopId }) {
    // Superadmin Multi-Store Support
    const [isAdmin, setIsAdmin] = useState(false);
    const [allVendors, setAllVendors] = useState([]);
    const [selectedShopId, setSelectedShopId] = useState(shopId);

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [toast, setToast] = useState(null);

    const toggleOrder = (orderId) => {
        setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        async function checkAdmin() {
            const { data: adminCheck } = await supabase
                .from('platform_admins')
                .select('*')
                .eq('id', shopId)
                .maybeSingle();

            if (adminCheck) {
                setIsAdmin(true);
                const { data: vList } = await supabase
                    .from('vendor_profiles')
                    .select('id, store_name, whatsapp_number')
                    .order('store_name', { ascending: true });
                if (vList) setAllVendors(vList);
            }
        }
        checkAdmin();
    }, [shopId]);

    useEffect(() => {
        async function fetchVendorOrders() {
            try {
                setLoading(true);
                const activeTarget = selectedShopId;
                let query = supabase
                    .from('order_items')
                    .select('*, product:products(*), order:orders(shipping_address:buyer_addresses(*))')
                    .order('created_at', { ascending: false });

                if (activeTarget !== 'ALL') {
                    query = query.eq('shop_id', activeTarget);
                }

                const { data, error } = await query;
                if (error) throw error;
                
                // Group items by order_id to display as a receipt
                const groupedOrders = {};
                (data || []).forEach(item => {
                    if (!groupedOrders[item.order_id]) {
                        groupedOrders[item.order_id] = {
                            id: item.order_id,
                            created_at: item.created_at,
                            shipping_address: item.order?.shipping_address,
                            items: []
                        };
                    }
                    groupedOrders[item.order_id].items.push(item);
                });
                
                // Convert back to array
                const ordersArray = Object.values(groupedOrders).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                
                setOrders(ordersArray);
            } catch (err) {
                console.error("Error fetching vendor orders:", err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchVendorOrders();

        // Realtime subscription
        const filterStr = selectedShopId === 'ALL' ? undefined : `shop_id=eq.${selectedShopId}`;
        const channel = supabase
            .channel('vendor-order-items')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'order_items', filter: filterStr },
                (payload) => {
                    const updatedItem = payload.new;
                    setOrders(prevOrders => prevOrders.map(order => ({
                        ...order,
                        items: order.items.map(item => 
                            item.id === updatedItem.id ? { ...item, status: updatedItem.status } : item
                        )
                    })));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [shopId, selectedShopId]);

    const updateOrderStatus = async (orderId, newStatus) => {
        setUpdating(true);
        try {
            let updateQuery = supabase
                .from('order_items')
                .update({ status: newStatus })
                .eq('order_id', orderId);

            if (selectedShopId !== 'ALL') {
                updateQuery = updateQuery.eq('shop_id', selectedShopId);
            }

            const { error } = await updateQuery;

            if (error) throw error;

            setOrders(prevOrders => prevOrders.map(order => {
                if (order.id === orderId) {
                    return {
                        ...order,
                        items: order.items.map(item => ({ ...item, status: newStatus }))
                    };
                }
                return order;
            }));
            showToast(`Order status updated to ${newStatus}`);
        } catch (err) {
            showToast(`Update failed: ${err.message}`, 'error');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading Orders...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            {/* Superadmin Multi-Store Orders Banner */}
            {isAdmin && (
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
                        <span style={{ fontSize: '28px' }}>👑</span>
                        <div>
                            <div style={{ fontWeight: '800', color: 'var(--accent-primary)', fontSize: '16px' }}>
                                Superadmin Global Order Fulfillment
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                View and update customer order fulfillment statuses across all vendor stores.
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Viewing Orders For:</label>
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
                            <option value={shopId}>👤 My Store Orders</option>
                            <option value="ALL">🌐 All Stores (Global Orders)</option>
                            <optgroup label="Registered Stores">
                                {allVendors.map(v => (
                                    <option key={v.id} value={v.id}>
                                        🏪 {v.store_name}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '32px', color: 'var(--text-primary)', margin: 0 }}>
                    {selectedShopId === 'ALL' ? 'Global Order Fulfillment' : 'Order Fulfillment'}
                </h2>
            </div>
            
            {orders.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No orders have been placed for your products yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {orders.map(order => (
                        <div key={order.id} className="glass-panel animate-fade-in-up" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Order ID</div>
                                    <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{order.id.split('-')[0]}...</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Date</div>
                                    <div style={{ color: 'var(--text-primary)' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Customer</div>
                                    {order.shipping_address ? (
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{order.shipping_address.full_name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{order.shipping_address.city}, {order.shipping_address.province}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.shipping_address.phone_number}</div>
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--text-muted)' }}>No details</div>
                                    )}
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Order Actions</div>
                                    <select 
                                        value={order.items.every(i => i.status === 'delivered') ? 'delivered' : order.items.every(i => i.status === 'shipped') ? 'shipped' : 'pending'} 
                                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                        disabled={updating || order.items.every(i => i.status === 'delivered')}
                                        style={{ 
                                            padding: '6px 12px', 
                                            borderRadius: '6px', 
                                            backgroundColor: 'var(--bg-secondary)', 
                                            color: 'var(--text-primary)', 
                                            border: '1px solid var(--border)',
                                            fontSize: '13px',
                                            cursor: (updating || order.items.every(i => i.status === 'delivered')) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        <option value="pending">Mark All Pending</option>
                                        <option value="shipped">Mark All Shipped</option>
                                        {order.items.every(i => i.status === 'delivered') && <option value="delivered">Delivered</option>}
                                    </select>
                                </div>
                            </div>

                            {/* Item Thumbnail Previews - Overlapping Stack */}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', padding: '0 8px' }}>
                                <div style={{ display: 'flex', flex: 1, paddingLeft: '8px' }}>
                                    {order.items.slice(0, 5).map((item, index) => (
                                        <div key={item.id} style={{ 
                                            width: '44px', height: '44px', 
                                            borderRadius: '50%', 
                                            overflow: 'hidden',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            border: '3px solid var(--bg-secondary)',
                                            marginLeft: index === 0 ? '0' : '-16px',
                                            zIndex: 5 - index,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            transition: 'transform 0.2s ease',
                                            cursor: 'pointer'
                                        }} title={item.product?.title}
                                           onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                           onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            {item.product?.image_url ? (
                                                <img src={item.product.image_url} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>Img</div>
                                            )}
                                        </div>
                                    ))}
                                    {order.items.length > 5 && (
                                        <div style={{ 
                                            width: '44px', height: '44px', 
                                            borderRadius: '50%', 
                                            backgroundColor: 'var(--bg-tertiary)',
                                            border: '3px solid var(--bg-secondary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)',
                                            marginLeft: '-16px',
                                            zIndex: 0,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                        }}>
                                            +{order.items.length - 5}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                </div>
                            </div>

                            {expandedOrders[order.id] && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {order.items.map(item => (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                                            {item.product?.image_url ? (
                                                <img src={item.product.image_url} alt="Product" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px' }} />
                                            ) : (
                                                <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
                                            )}
                                            
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.product?.title || 'Unknown Product'}</div>
                                                {(item.selected_color || item.selected_size) && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                                        {[item.selected_color, item.selected_size].filter(Boolean).join(' / ')}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Qty: {item.quantity} | Total: ${((item.price_at_purchase_cents * item.quantity) / 100).toFixed(2)}</div>
                                                <StatusStepper status={item.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <button 
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px', 
                                        backgroundColor: 'rgba(255,255,255,0.03)', 
                                        border: '1px solid var(--border)', 
                                        color: 'var(--text-secondary)', 
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                    onMouseEnter={(e) => { e.target.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.target.style.color = 'var(--text-primary)'; }}
                                    onMouseLeave={(e) => { e.target.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.target.style.color = 'var(--text-secondary)'; }}
                                    onClick={() => toggleOrder(order.id)}
                                >
                                    {expandedOrders[order.id] ? (
                                        <>Hide Items <span style={{ fontSize: '10px' }}>▲</span></>
                                    ) : (
                                        <>View Items <span style={{ fontSize: '10px' }}>▼</span></>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    backgroundColor: toast.type === 'error' ? 'var(--error)' : 'var(--success)',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 2000,
                    fontWeight: '500',
                    animation: 'fadeInUp 0.3s ease-out'
                }}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
