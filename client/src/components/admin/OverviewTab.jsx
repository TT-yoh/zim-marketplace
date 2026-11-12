import { SalesTrendChart } from '../SalesTrendChart.jsx';
import { CategoryBreakdownChart } from '../CategoryBreakdownChart.jsx';

export function OverviewTab({ adminRateMeta, adminZigRate, chartOrders, chartProducts, currency, financialSummary, formatPrice, handlePromptRateOverride, pendingBuyers, pendingVendors, setActiveTab, stats }) {
    return (
        <div className="animate-fade-in">
            {/* Top KPI Metric Cards */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
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
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--success)' }}>
                        {formatPrice ? formatPrice(Math.round(stats.revenue * 100), currency) : `$${stats.revenue.toFixed(2)}`}
                    </div>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Official ZiG Rate</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                        {adminZigRate.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {adminRateMeta.source} • <button onClick={handlePromptRateOverride} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: '700', padding: 0 }}>Edit Rate</button>
                    </div>
                </div>
            </div>

            {/* Financial Custodial Clearinghouse & Fund Segregation Vault */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'linear-gradient(145deg, rgba(30, 58, 138, 0.12), rgba(15, 23, 42, 0.4))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <span>🏦</span> Custodial Clearinghouse &amp; Bank Fund Segregation
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                            Real-time ledger breakdown segregating third-party custodial funds from platform facilitation earnings and your personal store revenue.
                        </p>
                    </div>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: '700' }}>
                        ● Escrow Reconciled
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {/* Card 1: Platform Facilitation Commissions */}
                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>
                            💼 Platform Commissions (Your Fee)
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                            {formatPrice ? formatPrice(financialSummary.platformClearedCents, currency) : `$${(financialSummary.platformClearedCents / 100).toFixed(2)}`}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            + {formatPrice ? formatPrice(financialSummary.platformPendingCents, currency) : `$${(financialSummary.platformPendingCents / 100).toFixed(2)}`} locked in escrow
                        </div>
                    </div>

                    {/* Card 2: 3rd-Party Vendor Escrow Float */}
                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                        <div style={{ fontSize: '12px', color: '#eab308', fontWeight: '600', marginBottom: '6px' }}>
                            🛡️ 3rd-Party Vendor Escrow Float
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#eab308' }}>
                            {formatPrice ? formatPrice(financialSummary.vendorEscrowFloatCents, currency) : `$${(financialSummary.vendorEscrowFloatCents / 100).toFixed(2)}`}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Custodial bank funds awaiting buyer delivery
                        </div>
                    </div>

                    {/* Card 3: 3rd-Party Cleared Vendor Payables */}
                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>
                            💳 3rd-Party Withdrawable Payables
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {formatPrice ? formatPrice(financialSummary.vendorPayableCents, currency) : `$${(financialSummary.vendorPayableCents / 100).toFixed(2)}`}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {formatPrice ? formatPrice(financialSummary.pendingPayoutsCents, currency) : `$${(financialSummary.pendingPayoutsCents / 100).toFixed(2)}`} requested payouts
                        </div>
                    </div>

                    {/* Card 4: Your Personal Store Sales Revenue */}
                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600', marginBottom: '6px' }}>
                            🏪 Your Store Sales (0% Fee)
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--success)' }}>
                            {formatPrice ? formatPrice(financialSummary.ownerStoreSalesCents, currency) : `$${(financialSummary.ownerStoreSalesCents / 100).toFixed(2)}`}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            100% net retail earnings for your store
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending KYC Notice Banner */}
            {(pendingVendors.length > 0 || pendingBuyers.length > 0) && (
                <div 
                    className="glass-panel" 
                    style={{ 
                        padding: '16px 24px', 
                        marginBottom: '32px', 
                        border: '1px solid var(--warning)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        flexWrap: 'wrap', 
                        gap: '12px' 
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <div>
                            <strong style={{ color: 'var(--warning)', fontSize: '15px' }}>
                                {pendingVendors.length + pendingBuyers.length} Verification{(pendingVendors.length + pendingBuyers.length) > 1 ? 's' : ''} Pending ({pendingVendors.length} Vendor{pendingVendors.length !== 1 ? 's' : ''}, {pendingBuyers.length} Buyer{pendingBuyers.length !== 1 ? 's' : ''})
                            </strong>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Merchants and buyers have submitted identification documents awaiting review.
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab('vendors')}
                        className="btn-primary"
                        style={{ backgroundColor: 'var(--warning)', color: '#000', fontWeight: '700', padding: '8px 16px', fontSize: '13px' }}
                    >
                        Review Verification Submissions →
                    </button>
                </div>
            )}

            {/* Interactive Analytics & Trajectory Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                <div style={{ minWidth: 0 }}>
                    <SalesTrendChart 
                        orders={chartOrders} 
                        title="Platform GMV & Order Trajectory" 
                        currency={currency}
                        formatPrice={formatPrice}
                    />
                </div>
                <div style={{ minWidth: 0 }}>
                    <CategoryBreakdownChart 
                        products={chartProducts} 
                        title="Marketplace Category Share" 
                    />
                </div>
            </div>
        </div>
    );
}
