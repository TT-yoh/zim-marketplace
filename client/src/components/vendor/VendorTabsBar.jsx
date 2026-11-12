export function VendorTabsBar({ activeTab, lowStockProducts, outOfStockProducts, salesStats, setActiveTab, totalProducts }) {
    return (
        <div className="dashboard-tabs-bar">
            <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`dashboard-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            >
                <span>📦</span>
                <span>Products & Catalog</span>
                <span className="tab-badge">{totalProducts}</span>
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`dashboard-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            >
                <span>📊</span>
                <span>Sales & Analytics</span>
                <span className="tab-badge">{salesStats.completedOrdersCount} orders</span>
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('stock_alerts')}
                className={`dashboard-tab-btn ${activeTab === 'stock_alerts' ? 'active' : ''}`}
            >
                <span>⚠️</span>
                <span>Stock Health & Alerts</span>
                {(outOfStockProducts.length > 0 || lowStockProducts.length > 0) && (
                    <span className="tab-badge warning-badge">
                        {outOfStockProducts.length + lowStockProducts.length}
                    </span>
                )}
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className={`dashboard-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
            >
                <span>💰</span>
                <span>Pricing, VAT & Wallet</span>
            </button>
        </div>
    );
}
