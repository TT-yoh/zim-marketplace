import { Button } from '../ui/index.js';

export function VendorDashboardHeader({ allVendors, isAdmin, selectedShopId, setSelectedShopId, setShowUploadModal, setUploadMode, shopId, vendorProfile }) {
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
                <div className="gap-12 row">
                    <span className="fs-28">{isAdmin ? '👑' : '🏪'}</span>
                    <div>
                        <div className="fw-800 text-accent fs-16">
                            {isAdmin ? 'Superadmin Global Store Manager' : 'Store & Catalog Switcher'}
                        </div>
                        <div className="text-secondary fs-13">
                            Select a store to view its inventory, edit prices, or switch to Global Catalog (10,250 items).
                        </div>
                    </div>
                </div>

                <div className="gap-10 wrap row">
                    <label className="fs-13 fw-700 text-primary">Active Store:</label>
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

            <div className="between mb-24 wrap gap-16 row">
                <div>
                    <h2 style={{ fontSize: '30px', color: 'var(--text-primary)', margin: 0, fontWeight: '800' }}>
                        {selectedShopId === 'ALL' ? 'Global Catalog Manager' : (vendorProfile?.store_name ? `${vendorProfile.store_name} Dashboard` : 'Vendor Dashboard')}
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Manage inventory items, monitor sales volume, restock low stock, and configure store pricing.
                    </p>
                </div>
                <div className="gap-10 wrap row">
                    <Button
                        onClick={() => { setUploadMode('single'); setShowUploadModal(true); }}
                        className="gap-8 p-10-18 fw-700 fs-13 rounded-10 row"
                    >
                        ➕ Add Product
                    </Button>
                    <Button
                        onClick={() => { setUploadMode('bulk'); setShowUploadModal(true); }}
                        variant="secondary" className="gap-8 p-10-18 fw-600 fs-13 rounded-10 row"
                    >
                        📁 Bulk CSV Import
                    </Button>
                </div>
            </div>
        </>
    );
}
