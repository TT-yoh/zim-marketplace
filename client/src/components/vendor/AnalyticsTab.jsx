import { SalesTrendChart } from '../SalesTrendChart.jsx';

export function AnalyticsTab({ chartOrderItems, currency, formatPrice, getFormattedPrice, salesStats, selectedShopId, vendorProfile }) {
    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Metrics Row */}
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div className="text-secondary fs-13 fw-500 mb-6">Delivered Earnings</div>
                    <div className="fs-32 fw-800 text-success">
                        {getFormattedPrice(salesStats.totalRevenue * 100)}
                    </div>
                    <div className="fs-12 text-muted mt-4">
                        {salesStats.completedOrdersCount} delivered order{salesStats.completedOrdersCount === 1 ? '' : 's'}
                    </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div className="text-secondary fs-13 fw-500 mb-6">Units Sold</div>
                    <div className="fs-32 fw-800 text-accent">
                        {salesStats.totalUnitsSold} <span className="fs-16 fw-500 text-secondary">units</span>
                    </div>
                    <div className="fs-12 text-secondary mt-4">
                        Lifetime items fulfilled
                    </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div className="text-secondary fs-13 fw-500 mb-6">Average Order Value (AOV)</div>
                    <div className="fs-32 fw-800 text-primary">
                        {getFormattedPrice(salesStats.averageOrderValueCents)}
                    </div>
                    <div className="fs-12 text-secondary mt-4">
                        Average customer basket size
                    </div>
                </div>
            </div>

            {/* Store Revenue & Order Trajectory Chart */}
            <SalesTrendChart 
                orders={chartOrderItems} 
                title={selectedShopId === 'ALL' ? "Global Marketplace Trajectory" : `${vendorProfile?.store_name || 'Store'} Sales Trajectory`}
                currency={currency}
                formatPrice={formatPrice}
            />

            {/* Top Best-Selling Products Leaderboard */}
            <div className="glass-panel p-24">
                <div className="between mb-16 row">
                    <h4 className="m-0 fs-18 text-primary gap-8 row">
                        🏆 Top 5 Best-Selling Products
                    </h4>
                    <span className="fs-12 text-muted">Ranked by Delivered GMV</span>
                </div>

                {salesStats.topProducts.length === 0 ? (
                    <div className="fs-13 text-muted p-24 text-center bg-secondary rounded-8">
                        📦 No delivered sales recorded yet. Share your store link to start receiving orders!
                    </div>
                ) : (
                    <div className="gap-10 stack">
                        {salesStats.topProducts.map((item, idx) => {
                            const medals = ['🥇', '🥈', '🥉', '#4', '#5'];
                            return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{medals[idx] || `#${idx + 1}`}</span>
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.title} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                                        )}
                                        <div className="overflow-hidden">
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.title}
                                            </div>
                                            <div className="fs-11 text-muted">
                                                {item.category || 'Product'} • Stock: <span style={{ color: item.stock_quantity <= 3 ? '#f59e0b' : 'var(--success)', fontWeight: '600' }}>{item.stock_quantity} left</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div className="fw-700 text-success fs-15">
                                            {getFormattedPrice(item.revenueCents)}
                                        </div>
                                        <div className="fs-11 text-secondary">
                                            {item.unitsSold} unit{item.unitsSold === 1 ? '' : 's'} sold
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
