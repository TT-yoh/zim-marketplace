export function DisputesTab({ adminZigRate, disputeFilter, escrowItems, handleAdminForceRefundBuyer, handleAdminForceReleaseEscrow, handleMarkRefundPaid, processingEscrowId, refunds, setDisputeFilter }) {
    return (
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

            {/* Buyer Refunds Owed */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', marginBottom: '28px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--text-primary)' }}>💸 Refunds Owed to Buyers</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Paynow cannot refund mobile money automatically. Send the amount to the buyer, then record the transaction reference here.
                </p>
                {refunds.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No refunds recorded.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px' }}>
                                    <th style={{ padding: '10px 12px' }}>Date</th>
                                    <th style={{ padding: '10px 12px' }}>Buyer</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                                    <th style={{ padding: '10px 12px' }}>Status</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refunds.map(refund => (
                                    <tr key={refund.id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{new Date(refund.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{refund.buyer_id.slice(0, 8)}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            ${(refund.amount_cents / 100).toFixed(2)}{refund.currency === 'XTS' ? ' 🧪' : ''}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: refund.status === 'paid' ? 'var(--success)' : 'var(--danger)' }}>
                                            {refund.status === 'paid' ? `Paid (${refund.payout_reference})` : 'Owed'}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                            {refund.status !== 'paid' && (
                                                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleMarkRefundPaid(refund)}>
                                                    Mark Paid
                                                </button>
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
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>≈ ZiG {((itemTotalCents / 100) * adminZigRate).toFixed(2)}</div>
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
    );
}
