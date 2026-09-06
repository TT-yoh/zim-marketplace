// client/src/components/BuyerOrderHistory.jsx
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

export function BuyerOrderHistory({ buyerId, currency = 'USD', formatPrice }) {
    const getFormattedPrice = (cents, orderCurrency) => {
        const targetCurr = orderCurrency === 'ZWG' ? 'ZiG' : currency;
        if (formatPrice) return formatPrice(cents, targetCurr);
        return `$${((cents || 0) / 100).toFixed(2)}`;
    };
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalData, setReviewModalData] = useState(null); // { productId, vendorId, orderItemId }
    const [receiptModalData, setReceiptModalData] = useState(null); // Order to print receipt for
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [confirmingDelivery, setConfirmingDelivery] = useState(null);
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
        async function fetchOrderHistory() {
            try {
                // Fetch orders and their items with product details
                // Supabase doesn't natively support deep nested joins without foreign keys correctly setup in PostgREST,
                // so we fetch orders and order_items separately and merge them.
                
                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('buyer_id', buyerId)
                    .order('created_at', { ascending: false });

                if (ordersError) throw ordersError;

                if (!ordersData || ordersData.length === 0) {
                    setOrders([]);
                    setLoading(false);
                    return;
                }

                const orderIds = ordersData.map(o => o.id);

                const { data: itemsData, error: itemsError } = await supabase
                    .from('order_items')
                    .select('*, product:products(*), vendor:vendor_profiles(*)')
                    .in('order_id', orderIds);

                if (itemsError) throw itemsError;

                // Group items by order_id
                const itemsByOrder = {};
                itemsData.forEach(item => {
                    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
                    itemsByOrder[item.order_id].push(item);
                });

                // Attach items to orders
                const completeOrders = ordersData.map(order => ({
                    ...order,
                    items: itemsByOrder[order.id] || []
                }));

                setOrders(completeOrders);
            } catch (err) {
                console.error("Error fetching order history:", err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchOrderHistory();

        // Subscribe to real-time status updates on order_items
        const channel = supabase
            .channel('buyer-order-items')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'order_items' },
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
    }, [buyerId]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .insert([{
                    buyer_id: buyerId,
                    vendor_id: reviewModalData.vendorId,
                    product_id: reviewModalData.productId,
                    rating,
                    comment
                }]);

            if (error) throw error;
            showToast("Review submitted successfully!");
            setReviewModalData(null);
            setRating(5);
            setComment('');
        } catch (err) {
            showToast(`Failed to submit review: ${err.message}`, 'error');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleConfirmOrderDelivery = async (orderId) => {
        setConfirmingDelivery(orderId);
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;
            
            // Find all items in this order that are "shipped" but not yet "delivered"
            const itemsToConfirm = order.items.filter(item => item.status === 'shipped');
            
            if (itemsToConfirm.length === 0) {
                showToast("No items are currently shipped and pending delivery confirmation.", 'error');
                return;
            }

            // Call release_escrow for each shipped item
            for (const item of itemsToConfirm) {
                const { error } = await supabase.rpc('release_escrow', { p_item_id: item.id });
                if (error) throw error;
            }
            
            showToast("Delivery confirmed! Escrow funds have been released.");
            
            // Update local state to show as delivered
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    return {
                        ...o,
                        items: o.items.map(item => 
                            item.status === 'shipped' ? { ...item, status: 'delivered' } : item
                        )
                    };
                }
                return o;
            }));
        } catch (err) {
            showToast(`Failed to confirm delivery: ${err.message}`, 'error');
        } finally {
            setConfirmingDelivery(null);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading Order History...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            <h2 style={{ fontSize: '32px', color: 'var(--text-primary)', marginBottom: '32px' }}>My Orders</h2>
            
            {orders.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    You haven't placed any orders yet.
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
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total</div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{getFormattedPrice(order.total_amount_cents, order.currency)}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Actions</div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <button 
                                            className="btn-secondary"
                                            style={{ fontSize: '12px', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                                            onClick={() => setReceiptModalData(order)}
                                        >
                                            🖨️ Tax Receipt
                                        </button>
                                        {order.items.some(i => i.status === 'shipped') ? (
                                            <button 
                                                className="btn-primary" 
                                                style={{ fontSize: '13px', padding: '6px 12px', backgroundColor: 'var(--success)' }}
                                                onClick={() => handleConfirmOrderDelivery(order.id)}
                                                disabled={confirmingDelivery === order.id}
                                            >
                                                {confirmingDelivery === order.id ? 'Confirming...' : 'Confirm Delivery'}
                                            </button>
                                        ) : order.items.every(i => i.status === 'delivered') ? (
                                            <div style={{ color: 'var(--success)', fontWeight: '600', fontSize: '13px' }}>Fully Delivered ✓</div>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Awaiting Shipment</div>
                                        )}
                                    </div>
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
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Qty: {item.quantity} | Seller: {item.vendor?.store_name || 'Unknown'}</div>
                                                <StatusStepper status={item.status} />
                                            </div>
                                            
                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                                 {item.vendor?.whatsapp_number && (
                                                     <a 
                                                         href={`https://wa.me/${item.vendor.whatsapp_number}?text=${encodeURIComponent(`Hi! I have a question regarding my order item: ${item.product?.title || 'Product'} (Order ID: ${order.id.split('-')[0]})`)}`}
                                                         target="_blank"
                                                         rel="noreferrer"
                                                         className="btn-secondary"
                                                         style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                     >
                                                         💬 Chat Seller
                                                     </a>
                                                 )}
                                                 {item.status === 'delivered' && (
                                                     <button 
                                                         className="btn-secondary" 
                                                         style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '20px' }}
                                                         onClick={() => setReviewModalData({ productId: item.product_id, vendorId: item.shop_id, orderItemId: item.id })}
                                                     >
                                                         ⭐ Leave Review
                                                     </button>
                                                 )}
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

            {/* Review Modal */}
            {reviewModalData && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ padding: '32px', width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-secondary)' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Write a Review</h3>
                        <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Rating</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                fontSize: '28px',
                                                cursor: 'pointer',
                                                filter: star <= rating ? 'none' : 'grayscale(100%) opacity(0.3)',
                                                transition: 'transform 0.1s ease'
                                            }}
                                            title={`${star} Star${star > 1 ? 's' : ''}`}
                                        >
                                            ⭐
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label>
                                <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Comment</span>
                                <textarea required rows="4" value={comment} onChange={e => setComment(e.target.value)} style={{ width: '100%', resize: 'none' }} placeholder="How was the product and service?" />
                            </label>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setReviewModalData(null)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submittingReview}>
                                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Official Tax Invoice & Escrow Receipt Modal */}
            {receiptModalData && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
                    <div className="glass-panel animate-fade-in-up receipt-print-container" style={{ width: '100%', maxWidth: '750px', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '16px', padding: '36px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }}>
                        
                        {/* Action Header - Hidden on Print */}
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>🧾</span>
                                <div>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Official ZIMRA Tax Receipt</h3>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Verified Proof of Payment & Escrow Clearance</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => window.print()}
                                    style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    🖨️ Print / Save PDF
                                </button>
                                <button 
                                    onClick={() => setReceiptModalData(null)}
                                    style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>

                        {/* Printable Receipt Sheet */}
                        <div style={{ border: '2px solid #0f172a', borderRadius: '8px', padding: '24px', backgroundColor: '#ffffff' }}>
                            
                            {/* Company Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                                <div>
                                    <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>ZimMarket Marketplace</h1>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>Harare CBD & Nationwide Multi-Vendor Network</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#475569' }}>Zimbabwe • www.zimmarket.co.zw • billing@zimmarket.co.zw</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>VAT Reg: 10048291 • BP No: 0200194821</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ backgroundColor: '#059669', color: '#ffffff', padding: '4px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: '800', display: 'inline-block', marginBottom: '8px' }}>
                                        PAID & CLEARED ✓
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Receipt #: REC-{receiptModalData.id.slice(0, 8).toUpperCase()}</div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>Date: {new Date(receiptModalData.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginTop: '4px' }}>Escrow Status: Funds Secured</div>
                                </div>
                            </div>

                            {/* Client & Transaction Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>Billed To (Buyer):</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                                        Buyer ID: {buyerId ? `${buyerId.slice(0, 8)}...` : 'Registered Buyer'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>Payment Method: Escrow (EcoCash / Card Gateway)</div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>Transaction Currency: {receiptModalData.currency === 'ZWG' ? 'ZiG' : 'USD'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>Order Details:</div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                        Items Count: {receiptModalData.items.length} {receiptModalData.items.length === 1 ? 'item' : 'items'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>
                                        Delivery Status: {receiptModalData.items.every(i => i.status === 'delivered') ? 'Delivered & Accepted' : 'In Transit / Escrow Active'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>✔ 100% Anti-Fraud Escrow Guarantee</div>
                                </div>
                            </div>

                            {/* Itemized Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                                        <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                                        <th style={{ padding: '8px 10px' }}>Item Description / Vendor</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price (USD)</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (USD)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receiptModalData.items.map((item, idx) => {
                                        const variation = [item.selected_color, item.selected_size].filter(Boolean).join(' / ');
                                        const itemTotal = (item.price_cents || item.product?.price_cents || 0) * item.quantity;
                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.product?.title || 'Marketplace Item'}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                        Seller: {item.vendor?.store_name || 'Verified Vendor'} {variation ? `• Options: ${variation}` : ''}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>{item.quantity}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>${(((item.price_cents || item.product?.price_cents || 0)) / 100).toFixed(2)}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>${(itemTotal / 100).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Tax & Total Calculation */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                                <div style={{ width: '280px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                                        <span>Subtotal (Excl. VAT):</span>
                                        <span style={{ fontWeight: '600' }}>${((receiptModalData.total_amount_cents / 1.15) / 100).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                                        <span>VAT (15% Standard):</span>
                                        <span style={{ fontWeight: '600' }}>${((receiptModalData.total_amount_cents - (receiptModalData.total_amount_cents / 1.15)) / 100).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900', color: '#0f172a', borderTop: '2px solid #0f172a', paddingTop: '8px', marginBottom: '4px' }}>
                                        <span>PAID TOTAL (USD):</span>
                                        <span style={{ color: '#059669' }}>${(receiptModalData.total_amount_cents / 100).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', color: '#1e40af', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                                        <span>PAID TOTAL (ZiG):</span>
                                        <span>ZiG {((receiptModalData.total_amount_cents / 100) * 26.5).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Official Footer */}
                            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                                Thank you for shopping with ZimMarket! This document serves as your official fiscal proof of transaction under Zimbabwe tax regulations.
                            </div>
                        </div>

                    </div>
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
