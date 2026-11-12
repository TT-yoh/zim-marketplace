import { Button } from '../ui/index.js';

export function StockAlertsTab({ handleQuickRestock, lowStockProducts, lowStockThreshold, outOfStockProducts, setActiveTab, setCurrentPage, setCustomLowStockThreshold, setStockFilter, totalProducts }) {
    return (
        <div className="animate-fade-in gap-20 stack">
            {/* KPI Summary Cards */}
            <div className="flex gap-16 wrap">
                <div className="glass-panel" style={{ flex: 1, minWidth: '180px', padding: '18px', borderLeft: '4px solid var(--danger)' }}>
                    <div className="text-secondary fs-12 fw-600">Out of Stock</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: outOfStockProducts.length > 0 ? 'var(--danger)' : 'var(--text-primary)', marginTop: '4px' }}>
                        {outOfStockProducts.length}
                    </div>
                    <div className="fs-11 text-muted mt-2">Products with 0 units</div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '180px', padding: '18px', borderLeft: '4px solid #f59e0b' }}>
                    <div className="text-secondary fs-12 fw-600">Low Stock (≤ {lowStockThreshold})</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: lowStockProducts.length > 0 ? '#f59e0b' : 'var(--text-primary)', marginTop: '4px' }}>
                        {lowStockProducts.length}
                    </div>
                    <div className="fs-11 text-muted mt-2">Items needing restock</div>
                </div>

                <div className="glass-panel" style={{ flex: 1, minWidth: '180px', padding: '18px', borderLeft: '4px solid var(--success)' }}>
                    <div className="text-secondary fs-12 fw-600">Healthy Stock (&gt; {lowStockThreshold})</div>
                    <div className="fs-28 fw-800 text-success mt-4">
                        {Math.max(0, totalProducts - outOfStockProducts.length - lowStockProducts.length)}
                    </div>
                    <div className="fs-11 text-muted mt-2">Fully available in catalog</div>
                </div>
            </div>

            {/* High Visibility Low Inventory Alert Banner */}
            {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                <div className="glass-panel animate-fade-in-up" style={{
                    padding: '16px 20px',
                    backgroundColor: outOfStockProducts.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: outOfStockProducts.length > 0 ? '1px solid var(--danger)' : '1px solid var(--warning)',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div className="gap-12 row">
                        <span className="fs-24">
                            {outOfStockProducts.length > 0 ? '🚨' : '⚠️'}
                        </span>
                        <div>
                            <strong style={{ color: outOfStockProducts.length > 0 ? 'var(--danger)' : '#f59e0b', fontSize: '15px' }}>
                                Inventory Restock Notice
                            </strong>
                            <div className="fs-13 text-secondary mt-2">
                                {outOfStockProducts.length > 0 && (
                                    <span style={{ color: 'var(--danger)', fontWeight: '600', marginRight: '10px' }}>
                                        • {outOfStockProducts.length} product{outOfStockProducts.length === 1 ? '' : 's'} Out of Stock
                                    </span>
                                )}
                                {lowStockProducts.length > 0 && (
                                    <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                                        • {lowStockProducts.length} product{lowStockProducts.length === 1 ? '' : 's'} Running Low (≤ {lowStockThreshold} units)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="gap-10 wrap row">
                        <div className="gap-6 fs-12 text-secondary row">
                            <span>Sensitivity:</span>
                            {[2, 3, 5, 10, 20].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setCustomLowStockThreshold(val)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: lowStockThreshold === val ? '700' : '500',
                                        backgroundColor: lowStockThreshold === val ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                                        color: lowStockThreshold === val ? '#fff' : 'var(--text-secondary)',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer'
                                    }}
                                    title={`Set low stock alert sensitivity to ≤ ${val} units`}
                                >
                                    ≤ {val}
                                </button>
                            ))}
                        </div>

                        <Button
                            onClick={() => {
                                setStockFilter(outOfStockProducts.length > 0 ? 'out_of_stock' : 'low_stock');
                                setCurrentPage(1);
                                setActiveTab('inventory');
                            }}
                            variant="secondary"
                            style={{
                                padding: '8px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderColor: outOfStockProducts.length > 0 ? 'var(--danger)' : 'var(--warning)',
                                color: outOfStockProducts.length > 0 ? 'var(--danger)' : '#f59e0b'
                            }}
                        >
                            🔍 View in Products Table
                        </Button>
                    </div>
                </div>
            )}

            {/* Low Stock Replenishment Panel with 1-Click Restock */}
            <div className="glass-panel p-24">
                <div className="between mb-16 row">
                    <h4 style={{ margin: 0, fontSize: '18px', color: (lowStockProducts.length > 0 || outOfStockProducts.length > 0) ? '#f59e0b' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚡ 1-Click Inventory Replenishment Queue
                    </h4>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: (lowStockProducts.length > 0 || outOfStockProducts.length > 0) ? '#f59e0b' : 'var(--success)' }}>
                        {lowStockProducts.length + outOfStockProducts.length} items needing refill
                    </span>
                </div>

                {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--success)', padding: '28px', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid var(--success)' }}>
                        <div className="fs-28 mb-6">🎉</div>
                        <strong>All products have healthy stock levels!</strong>
                        <div className="fs-12 text-secondary mt-4">Every item in your store has &gt; {lowStockThreshold} units available.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                        {[...outOfStockProducts, ...lowStockProducts].slice(0, 20).map(p => {
                            const isOut = (p.stock_quantity ?? 0) <= 0;
                            return (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', padding: '10px 14px', borderRadius: '10px', backgroundColor: isOut ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: isOut ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)', gap: '10px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {p.title}
                                        </div>
                                        <div style={{ fontSize: '11px', color: isOut ? 'var(--danger)' : '#f59e0b', fontWeight: '700' }}>
                                            {isOut ? '🔴 Out of Stock (0 units)' : `🟡 Low Stock (${p.stock_quantity} left)`} {p.category ? `• ${p.category}` : ''}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                        <Button
                                            onClick={() => handleQuickRestock(p.id, 5)}
                                            variant="secondary"
                                            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', borderRadius: '6px' }}
                                            title="Quickly add +5 units"
                                        >
                                            ⚡ +5
                                        </Button>
                                        <Button
                                            onClick={() => handleQuickRestock(p.id, 10)}
                                            variant="secondary"
                                            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', borderRadius: '6px' }}
                                            title="Quickly add +10 units"
                                        >
                                            ⚡ +10
                                        </Button>
                                        <Button
                                            onClick={() => handleQuickRestock(p.id, 25)}
                                            variant="secondary"
                                            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', borderRadius: '6px' }}
                                            title="Quickly add +25 units"
                                        >
                                            ⚡ +25
                                        </Button>
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
