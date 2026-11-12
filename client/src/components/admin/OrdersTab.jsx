export function OrdersTab({ currency, formatPrice, recentOrders }) {
    return (
        <div className="glass-panel animate-fade-in p-32">
            <div className="between mb-20 wrap gap-12 row">
                <div>
                    <h3 className="m-0 fs-22 text-primary">
                        📦 Marketplace Transactions ({recentOrders.length})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Real-time operational feed of customer orders, values, and fulfillment status.
                    </p>
                </div>
            </div>

            <div className="ui-table-wrap">
                <table className="ui-table">
                    <thead>
                        <tr className="ui-thead-row">
                            <th className="ui-cell fw-600">Order ID</th>
                            <th className="ui-cell fw-600">Date & Time</th>
                            <th className="ui-cell fw-600">Buyer ID</th>
                            <th className="ui-cell fw-600">Status</th>
                            <th className="ui-cell fw-600 text-right">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentOrders.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-24 text-center text-secondary">No orders placed yet.</td>
                            </tr>
                        ) : (
                            recentOrders.map(order => (
                                <tr key={order.id} className="ui-row-divider">
                                    <td className="ui-cell font-mono text-primary fw-600">
                                        #{order.id.split('-')[0]}
                                    </td>
                                    <td className="ui-cell text-secondary fs-13">
                                        {new Date(order.created_at).toLocaleString()}
                                    </td>
                                    <td className="ui-cell font-mono text-secondary fs-12">
                                        {order.buyer_id ? `${order.buyer_id.split('-')[0]}...` : 'Guest'}
                                    </td>
                                    <td className="ui-cell">
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
                                    <td className="ui-cell fw-700 text-success text-right fs-15">
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
