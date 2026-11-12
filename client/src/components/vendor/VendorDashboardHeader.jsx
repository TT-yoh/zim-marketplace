export function VendorDashboardHeader({ allVendors, isAdmin, products, selectedShopId, setSelectedShopId, setShowUploadModal, setUploadMode, shopId, vendorProfile }) {
    return (
        <>
            <div className="glass-panel animate-fade-in" style={{
                padding: '16px 24px',
                marginBottom: '28px',
                border: '1px solid var(--accent-primary)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                borderRadius: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>{isAdmin ? '👑' : '🏪'}</span>
                    <div>
                        <div style={{ fontWeight: '800', color: 'var(--accent-primary)', fontSize: '16px' }}>
                            {isAdmin ? 'Superadmin Global Store Manager' : 'Store & Catalog Switcher'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Select a store to view its inventory, edit prices, or switch to Global Catalog (10,250 items).
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Active Store:</label>
                    <select
                        value={selectedShopId}
                        onChange={(e) => setSelectedShopId(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontWeight: '700',
                            minWidth: '240px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">🌐 All Stores (10,250 Global Items)</option>
                        <option value={shopId}>👤 My Store (Self)</option>
                        <optgroup label="Registered Stores">
                            {allVendors.map(v => (
                                <option key={v.id} value={v.id}>
                                    🏪 {v.store_name} {v.id === 'a223a428-0469-49df-a49f-f4528bd0d6de' ? '(10,250 products)' : ''}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '30px', color: 'var(--text-primary)', margin: 0, fontWeight: '800' }}>
                        {selectedShopId === 'ALL' ? 'Global Catalog Manager' : (vendorProfile?.store_name ? `${vendorProfile.store_name} Dashboard` : 'Vendor Dashboard')}
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Manage inventory items, monitor sales volume, restock low stock, and configure store pricing.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => { setUploadMode('single'); setShowUploadModal(true); }}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '700', fontSize: '13px', borderRadius: '10px' }}
                    >
                        ➕ Add Product
                    </button>
                    <button
                        onClick={() => { setUploadMode('bulk'); setShowUploadModal(true); }}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '13px', borderRadius: '10px' }}
                    >
                        📁 Bulk CSV Import
                    </button>
                </div>
            </div>
        </>
    );
}
