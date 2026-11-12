export function PayoutsTab({ handleProcessPayout, loadAdminData, payoutRequests }) {
    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>
                        💳 Merchant Payout Requests ({payoutRequests.length})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Review and process vendor store balance disbursements (EcoCash, InnBucks, Bank).
                    </p>
                </div>
                <button
                    onClick={loadAdminData}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                    🔄 Refresh
                </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '14px', fontWeight: '600' }}>Date</th>
                            <th style={{ padding: '14px', fontWeight: '600' }}>Vendor Store</th>
                            <th style={{ padding: '14px', fontWeight: '600' }}>Amount</th>
                            <th style={{ padding: '14px', fontWeight: '600' }}>Method & Details</th>
                            <th style={{ padding: '14px', fontWeight: '600' }}>Status</th>
                            <th style={{ padding: '14px', fontWeight: '600', textAlign: 'right' }}>Disbursement Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payoutRequests.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No payout requests submitted yet.
                                </td>
                            </tr>
                        ) : (
                            payoutRequests.map(payout => {
                                const isPending = payout.status === 'pending';
                                const isApproved = payout.status === 'approved';
                                return (
                                    <tr key={payout.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                            {new Date(payout.created_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '14px' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {payout.vendor?.store_name || 'Merchant'}
                                            </div>
                                            {payout.vendor?.whatsapp_number && (
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    +{payout.vendor.whatsapp_number}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px', fontWeight: '800', color: 'var(--text-primary)', fontSize: '15px' }}>
                                            ${(payout.amount_cents / 100).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '14px', fontSize: '13px' }}>
                                            <span style={{ fontWeight: '600', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
                                                {payout.payout_method}
                                            </span>
                                            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                Account: <strong>{payout.payout_details?.account_number || '-'}</strong>
                                            </div>
                                            {payout.payout_details?.account_name && (
                                                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                    Name: {payout.payout_details.account_name}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                backgroundColor: payout.status === 'paid'
                                                    ? 'rgba(16, 185, 129, 0.15)'
                                                    : payout.status === 'rejected'
                                                    ? 'rgba(239, 68, 68, 0.15)'
                                                    : 'rgba(245, 158, 11, 0.15)',
                                                color: payout.status === 'paid'
                                                    ? 'var(--success)'
                                                    : payout.status === 'rejected'
                                                    ? 'var(--danger)'
                                                    : 'var(--warning)'
                                            }}>
                                                {payout.status}
                                            </span>
                                            {payout.admin_notes && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    Note: {payout.admin_notes}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px', textAlign: 'right' }}>
                                            {(isPending || isApproved) ? (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleProcessPayout(payout.id, 'paid')}
                                                        className="btn-primary"
                                                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', backgroundColor: 'var(--success)' }}
                                                        title="Mark funds as successfully transferred"
                                                    >
                                                        ✓ Mark Paid
                                                    </button>
                                                    <button
                                                        onClick={() => handleProcessPayout(payout.id, 'rejected')}
                                                        className="btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                                        title="Reject and automatically refund balance to vendor wallet"
                                                    >
                                                        ✕ Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    Settled
                                                </span>
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
    );
}
