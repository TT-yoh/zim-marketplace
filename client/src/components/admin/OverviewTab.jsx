import { SalesTrendChart } from '../SalesTrendChart.jsx';
import { CategoryBreakdownChart } from '../CategoryBreakdownChart.jsx';
import { Button } from '../ui/index.js';

export function OverviewTab({ adminRateMeta, adminZigRate, chartOrders, chartProducts, currency, financialSummary, formatPrice, handlePromptRateOverride, pendingBuyers, pendingVendors, setActiveTab, stats }) {
    return (
        <div className="animate-fade-in">
            {/* Top KPI Metric Cards */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center' }}>
                    <div className="text-secondary fs-14 fw-500 mb-8">Total Vendors</div>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-primary)' }}>{stats.users}</div>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center' }}>
                    <div className="text-secondary fs-14 fw-500 mb-8">Live Products</div>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-primary)' }}>{stats.products}</div>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center' }}>
                    <div className="text-secondary fs-14 fw-500 mb-8">Total Orders</div>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-primary)' }}>{stats.orders}</div>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center' }}>
                    <div className="text-secondary fs-14 fw-500 mb-8">Total GMV</div>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--success)' }}>
                        {formatPrice ? formatPrice(Math.round(stats.revenue * 100), currency) : `$${stats.revenue.toFixed(2)}`}
                    </div>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div className="text-secondary fs-14 fw-500 mb-8">Official ZiG Rate</div>
                    <div className="fs-32 fw-800 text-accent">
                        {adminZigRate.toFixed(2)}
                    </div>
                    <div className="fs-11 text-muted mt-4">
                        {adminRateMeta.source} • <button onClick={handlePromptRateOverride} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: '700', padding: 0 }}>Edit Rate</button>
                    </div>
                </div>
            </div>

            {/* Financial Custodial Clearinghouse & Fund Segregation Vault */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'linear-gradient(145deg, rgba(30, 58, 138, 0.12), rgba(15, 23, 42, 0.4))' }}>
                <div className="between mb-16 wrap gap-12 row">
                    <div>
                        <h3 className="m-0 fs-18 gap-8 text-primary row">
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
                    <div className="p-16 rounded-12 bg-secondary border">
                        <div className="fs-12 text-secondary fw-600 mb-6">
                            💼 Platform Commissions (Your Fee)
                        </div>
                        <div className="fs-24 fw-800 text-accent">
                            {formatPrice ? formatPrice(financialSummary.platformClearedCents, currency) : `$${(financialSummary.platformClearedCents / 100).toFixed(2)}`}
                        </div>
                        <div className="fs-11 text-muted mt-4">
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
                        <div className="fs-11 text-muted mt-4">
                            Custodial bank funds awaiting buyer delivery
                        </div>
                    </div>

                    {/* Card 3: 3rd-Party Cleared Vendor Payables */}
                    <div className="p-16 rounded-12 bg-secondary border">
                        <div className="fs-12 text-secondary fw-600 mb-6">
                            💳 3rd-Party Withdrawable Payables
                        </div>
                        <div className="fs-24 fw-800 text-primary">
                            {formatPrice ? formatPrice(financialSummary.vendorPayableCents, currency) : `$${(financialSummary.vendorPayableCents / 100).toFixed(2)}`}
                        </div>
                        <div className="fs-11 text-muted mt-4">
                            {formatPrice ? formatPrice(financialSummary.pendingPayoutsCents, currency) : `$${(financialSummary.pendingPayoutsCents / 100).toFixed(2)}`} requested payouts
                        </div>
                    </div>

                    {/* Card 4: Your Personal Store Sales Revenue */}
                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <div className="fs-12 text-success fw-600 mb-6">
                            🏪 Your Store Sales (0% Fee)
                        </div>
                        <div className="fs-24 fw-800 text-success">
                            {formatPrice ? formatPrice(financialSummary.ownerStoreSalesCents, currency) : `$${(financialSummary.ownerStoreSalesCents / 100).toFixed(2)}`}
                        </div>
                        <div className="fs-11 text-muted mt-4">
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
                    <div className="gap-12 row">
                        <span className="fs-24">⚠️</span>
                        <div>
                            <strong className="text-warning fs-15">
                                {pendingVendors.length + pendingBuyers.length} Verification{(pendingVendors.length + pendingBuyers.length) > 1 ? 's' : ''} Pending ({pendingVendors.length} Vendor{pendingVendors.length !== 1 ? 's' : ''}, {pendingBuyers.length} Buyer{pendingBuyers.length !== 1 ? 's' : ''})
                            </strong>
                            <div className="fs-13 text-secondary">
                                Merchants and buyers have submitted identification documents awaiting review.
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => setActiveTab('vendors')}
                        style={{ backgroundColor: 'var(--warning)', color: '#000', fontWeight: '700', padding: '8px 16px', fontSize: '13px' }}
                    >
                        Review Verification Submissions →
                    </Button>
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
