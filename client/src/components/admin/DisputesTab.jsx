import { Button } from '../ui/index.js';

export function DisputesTab({ adminZigRate, disputeFilter, escrowItems, handleAdminForceRefundBuyer, handleAdminForceReleaseEscrow, handleMarkRefundPaid, processingEscrowId, refunds, setDisputeFilter }) {
    return (
        <div className="animate-fade-in">
            {/* Escrow KPI Metric Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div className="text-secondary fs-13 fw-600 mb-6">🔒 Escrow Held in Trust</div>
                    <div className="fs-28 fw-800 text-accent">
                        ${((escrowItems.filter(i => i.status !== 'delivered' && i.status !== 'refunded').reduce((s, i) => s + ((i.price_cents || i.product?.price_cents || 0) * i.quantity), 0)) / 100).toFixed(2)}
                    </div>
                    <div className="fs-11 text-muted mt-4">
                        {escrowItems.filter(i => i.status !== 'delivered' && i.status !== 'refunded').length} active transactions
                    </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div className="text-secondary fs-13 fw-600 mb-6">🟢 Released to Vendors</div>
                    <div className="fs-28 fw-800 text-success">
                        ${((escrowItems.filter(i => i.status === 'delivered').reduce((s, i) => s + ((i.price_cents || i.product?.price_cents || 0) * i.quantity), 0)) / 100).toFixed(2)}
                    </div>
                    <div className="fs-11 text-muted mt-4">
                        {escrowItems.filter(i => i.status === 'delivered').length} completed orders
                    </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div className="text-secondary fs-13 fw-600 mb-6">🔴 Refunded to Buyers</div>
                    <div className="fs-28 fw-800 text-danger">
                        ${((escrowItems.filter(i => i.status === 'refunded').reduce((s, i) => s + ((i.price_cents || i.product?.price_cents || 0) * i.quantity), 0)) / 100).toFixed(2)}
                    </div>
                    <div className="fs-11 text-muted mt-4">
                        {escrowItems.filter(i => i.status === 'refunded').length} refunded orders
                    </div>
                </div>
            </div>

            {/* Buyer Refunds Owed */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', marginBottom: '28px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--text-primary)' }}>💸 Refunds Owed to Buyers</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Paynow cannot refund mobile money automatically. Send the amount to the buyer, then record the transaction reference here.
                </p>
                {refunds.length === 0 ? (
                    <div className="text-muted fs-13">No refunds recorded.</div>
                ) : (
                    <div className="ui-table-wrap">
                        <table className="fs-13 ui-table">
                            <thead>
                                <tr className="text-secondary uppercase fs-11">
                                    <th className="p-10-12">Date</th>
                                    <th className="p-10-12">Buyer</th>
                                    <th className="p-10-12 text-right">Amount</th>
                                    <th className="p-10-12">Status</th>
                                    <th className="p-10-12 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refunds.map(refund => (
                                    <tr key={refund.id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td className="p-10-12 text-secondary">{new Date(refund.created_at).toLocaleDateString()}</td>
                                        <td className="p-10-12 font-mono text-primary">{refund.buyer_id.slice(0, 8)}</td>
                                        <td className="p-10-12 text-right fw-700 text-primary">
                                            ${(refund.amount_cents / 100).toFixed(2)}{refund.currency === 'XTS' ? ' 🧪' : ''}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: refund.status === 'paid' ? 'var(--success)' : 'var(--danger)' }}>
                                            {refund.status === 'paid' ? `Paid (${refund.payout_reference})` : 'Owed'}
                                        </td>
                                        <td className="p-10-12 text-right">
                                            {refund.status !== 'paid' && (
                                                <Button variant="secondary" className="p-6-12 fs-12" onClick={() => handleMarkRefundPaid(refund)}>
                                                    Mark Paid
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Escrow Console Table Panel */}
            <div className="glass-panel" style={{ padding: '28px', backgroundColor: 'var(--bg-secondary)' }}>
                <div className="between mb-20 wrap gap-16 row">
                    <div>
                        <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚖️ Escrow Protection & Dispute Mediation Console</span>
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Superadmin overrides for buyer-vendor escrow disputes, parcel tracking delays, and emergency fund releases.
                        </p>
                    </div>

                    {/* Filter Chips */}
                    <div className="flex gap-8">
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
                <div className="ui-table-wrap">
                    <table className="fs-13 ui-table">
                        <thead>
                            <tr className="bg-faint text-secondary uppercase fs-11">
                                <th className="p-12-14 fw-700">Item & SKU</th>
                                <th className="p-12-14 fw-700">Vendor Store</th>
                                <th className="p-12-14 fw-700">Buyer ID</th>
                                <th className="p-12-14 fw-700 text-right">Escrow Amount</th>
                                <th className="p-12-14 fw-700 text-center">Escrow State</th>
                                <th className="p-12-14 fw-700 text-right">Admin Actions</th>
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
                                    <td colSpan="6" className="p-32 text-center text-muted">
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
                                            <tr key={item.id} className="ui-row-divider">
                                                <td className="p-12-14">
                                                    <div className="gap-10 row">
                                                        {item.product?.image_url ? (
                                                            <img src={item.product.image_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📦</div>
                                                        )}
                                                        <div>
                                                            <div className="fw-700 text-primary">{item.product?.title || 'Product Item'}</div>
                                                            <div className="fs-11 text-secondary">
                                                                Qty: {item.quantity} {item.product?.item_no ? `• SKU: ${item.product.item_no}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="p-12-14">
                                                    <div className="fw-600 text-primary">{item.vendor?.store_name || 'Vendor'}</div>
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

                                                <td className="p-12-14 font-mono text-secondary fs-12">
                                                    {item.order?.buyer_id ? `${item.order.buyer_id.slice(0, 8)}...` : 'Buyer'}
                                                </td>

                                                <td className="p-12-14 text-right">
                                                    <div className="fw-800 text-primary">${(itemTotalCents / 100).toFixed(2)}</div>
                                                    <div className="fs-11 text-muted">≈ ZiG {((itemTotalCents / 100) * adminZigRate).toFixed(2)}</div>
                                                </td>

                                                <td className="p-12-14 text-center">
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

                                                <td className="p-12-14 text-right">
                                                    {isHeld ? (
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                            <Button
                                                                onClick={() => handleAdminForceReleaseEscrow(item)}
                                                                disabled={isProcessing}
                                                                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--success)' }}
                                                                title="Force release escrow funds to vendor account"
                                                            >
                                                                🟢 Release
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleAdminForceRefundBuyer(item)}
                                                                disabled={isProcessing}
                                                                variant="secondary"
                                                                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                                                title="Refund escrow funds back to buyer"
                                                            >
                                                                🔴 Refund
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="fs-12 text-muted">Resolved ✓</span>
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
    );
}
