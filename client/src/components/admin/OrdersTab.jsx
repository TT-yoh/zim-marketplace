export function OrdersTab({ currency, formatPrice, recentOrders }) {
    return (
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
    );
}
