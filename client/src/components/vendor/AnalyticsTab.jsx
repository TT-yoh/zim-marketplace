import { SalesTrendChart } from '../SalesTrendChart.jsx';

export function AnalyticsTab({ chartOrderItems, currency, formatPrice, getFormattedPrice, salesStats, selectedShopId, vendorProfile }) {
    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Metrics Row */}
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Delivered Earnings</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--success)' }}>
                        {getFormattedPrice(salesStats.totalRevenue * 100)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {salesStats.completedOrdersCount} delivered order{salesStats.completedOrdersCount === 1 ? '' : 's'}
                    </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Units Sold</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                        {salesStats.totalUnitsSold} <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>units</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Lifetime items fulfilled
                    </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Average Order Value (AOV)</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {getFormattedPrice(salesStats.averageOrderValueCents)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏆 Top 5 Best-Selling Products
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ranked by Delivered GMV</span>
                </div>

                {salesStats.topProducts.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        📦 No delivered sales recorded yet. Share your store link to start receiving orders!
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.title}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {item.category || 'Product'} • Stock: <span style={{ color: item.stock_quantity <= 3 ? '#f59e0b' : 'var(--success)', fontWeight: '600' }}>{item.stock_quantity} left</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: '700', color: 'var(--success)', fontSize: '15px' }}>
                                            {getFormattedPrice(item.revenueCents)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
