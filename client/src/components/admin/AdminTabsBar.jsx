export function AdminTabsBar({ activeTab, allVendors, categoriesList, escrowItems, heroProducts, payoutRequests, pendingVendors, setActiveTab, stats }) {
    return (
        <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '32px', 
            overflowX: 'auto', 
            paddingBottom: '6px', 
            borderBottom: '1px solid var(--border)' 
        }}>
            <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                <span>📊</span>
                <span>Overview & Analytics</span>
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('vendors')}
                className={activeTab === 'vendors' ? 'btn-primary' : 'btn-secondary'}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                <span>🏪</span>
                <span>Vendors & Stores ({allVendors.length})</span>
                {pendingVendors.length > 0 && (
                    <span style={{ 
                        backgroundColor: 'var(--warning, #f59e0b)', 
                        color: '#000', 
                        fontSize: '11px', 
                        fontWeight: '800', 
                        padding: '2px 7px', 
                        borderRadius: '10px' 
                    }}>
                        {pendingVendors.length} KYC
                    </span>
                )}
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                <span>🏷️</span>
                <span>Categories ({categoriesList.length})</span>
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                <span>📦</span>
                <span>Orders & Transactions ({stats.orders})</span>
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('disputes')}
                className={activeTab === 'disputes' ? 'btn-primary' : 'btn-secondary'}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                <span>⚖️</span>
                <span>Escrow Disputes & Mediation</span>
                {escrowItems.filter(i => i.status !== 'delivered' && i.status !== 'refunded').length > 0 && (
                    <span style={{ 
                        backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                        color: 'var(--accent-primary)', 
                        fontSize: '11px', 
                        fontWeight: '800', 
                        padding: '2px 7px', 
                        borderRadius: '10px',
                        border: '1px solid var(--accent-primary)'
                    }}>
                        {escrowItems.filter(i => i.status !== 'delivered' && i.status !== 'refunded').length} Held
                    </span>
                )}
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('payouts')}
                className={activeTab === 'payouts' ? 'btn-primary' : 'btn-secondary'}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                <span>💳</span>
                <span>Payout Requests ({payoutRequests.length})</span>
                {payoutRequests.filter(p => p.status === 'pending').length > 0 && (
                    <span style={{ 
                        backgroundColor: 'var(--warning, #f59e0b)', 
                        color: '#000', 
                        fontSize: '11px', 
                        fontWeight: '800', 
                        padding: '2px 7px', 
                        borderRadius: '10px' 
                    }}>
                        {payoutRequests.filter(p => p.status === 'pending').length} Pending
                    </span>
                )}
            </button>

            <button
                type="button"
                onClick={() => setActiveTab('hero')}
                className={activeTab === 'hero' ? 'btn-primary' : 'btn-secondary'}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
            >
                <span>⭐</span>
                <span>Hero Spotlight &amp; Deals</span>
                {heroProducts.filter(p => p.is_featured_hero || p.is_promotion).length > 0 && (
                    <span style={{ 
                        backgroundColor: 'rgba(234, 179, 8, 0.25)', 
                        color: '#eab308', 
                        fontSize: '11px', 
                        fontWeight: '800', 
                        padding: '2px 7px', 
                        borderRadius: '10px',
                        border: '1px solid #eab308' 
                    }}>
                        {heroProducts.filter(p => p.is_featured_hero || p.is_promotion).length}
                    </span>
                )}
            </button>
        </div>
    );
}
