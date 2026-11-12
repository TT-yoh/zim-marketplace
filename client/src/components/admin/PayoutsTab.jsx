import { Button } from '../ui/index.js';

export function PayoutsTab({ handleProcessPayout, loadAdminData, payoutRequests }) {
    return (
        <div className="glass-panel animate-fade-in p-32">
            <div className="between mb-24 wrap gap-12 row">
                <div>
                    <h3 className="m-0 fs-22 text-primary">
                        💳 Merchant Payout Requests ({payoutRequests.length})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Review and process vendor store balance disbursements (EcoCash, InnBucks, Bank).
                    </p>
                </div>
                <Button
                    onClick={loadAdminData}
                    variant="secondary" className="p-8-16 fs-13"
                >
                    🔄 Refresh
                </Button>
            </div>

            <div className="ui-table-wrap">
                <table className="ui-table">
                    <thead>
                        <tr className="ui-thead-row">
                            <th className="ui-cell fw-600">Date</th>
                            <th className="ui-cell fw-600">Vendor Store</th>
                            <th className="ui-cell fw-600">Amount</th>
                            <th className="ui-cell fw-600">Method & Details</th>
                            <th className="ui-cell fw-600">Status</th>
                            <th className="ui-cell fw-600 text-right">Disbursement Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payoutRequests.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-32 text-center text-secondary">
                                    No payout requests submitted yet.
                                </td>
                            </tr>
                        ) : (
                            payoutRequests.map(payout => {
                                const isPending = payout.status === 'pending';
                                const isApproved = payout.status === 'approved';
                                return (
                                    <tr key={payout.id} className="ui-row-divider">
                                        <td className="ui-cell text-secondary fs-13">
                                            {new Date(payout.created_at).toLocaleString()}
                                        </td>
                                        <td className="ui-cell">
                                            <div className="fw-600 text-primary">
                                                {payout.vendor?.store_name || 'Merchant'}
                                            </div>
                                            {payout.vendor?.whatsapp_number && (
                                                <div className="fs-12 text-muted">
                                                    +{payout.vendor.whatsapp_number}
                                                </div>
                                            )}
                                        </td>
                                        <td className="ui-cell fw-800 text-primary fs-15">
                                            ${(payout.amount_cents / 100).toFixed(2)}
                                        </td>
                                        <td className="ui-cell fs-13">
                                            <span className="fw-600 uppercase text-accent">
                                                {payout.payout_method}
                                            </span>
                                            <div className="text-secondary mt-2">
                                                Account: <strong>{payout.payout_details?.account_number || '-'}</strong>
                                            </div>
                                            {payout.payout_details?.account_name && (
                                                <div className="text-muted fs-12">
                                                    Name: {payout.payout_details.account_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="ui-cell">
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
                                                <div className="fs-11 text-muted mt-4">
                                                    Note: {payout.admin_notes}
                                                </div>
                                            )}
                                        </td>
                                        <td className="ui-cell text-right">
                                            {(isPending || isApproved) ? (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <Button
                                                        onClick={() => handleProcessPayout(payout.id, 'paid')}
                                                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', backgroundColor: 'var(--success)' }}
                                                        title="Mark funds as successfully transferred"
                                                    >
                                                        ✓ Mark Paid
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleProcessPayout(payout.id, 'rejected')}
                                                        variant="secondary"
                                                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                                        title="Reject and automatically refund balance to vendor wallet"
                                                    >
                                                        ✕ Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="fs-12 text-muted">
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
