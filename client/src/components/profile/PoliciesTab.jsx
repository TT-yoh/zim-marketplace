export function PoliciesTab({ deliveryTurnaround, handleSaveVendor, lowStockThreshold, returnPolicy, saving, setDeliveryTurnaround, setLowStockThreshold, setReturnPolicy, setWarrantyPolicy, warrantyPolicy }) {
    return (
        <form onSubmit={handleSaveVendor} className="animate-fade-in">
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>🛡️</span> Store Guarantees & Fulfillment Policies
                </div>
                <div className="settings-section-subtitle">
                    Build buyer confidence by displaying clear turnaround, returns, and warranty guidelines.
                </div>

                <label style={{ display: 'block', marginBottom: '16px' }}>
                    <span className="form-label">⚡ Order Fulfillment & Dispatch Turnaround</span>
                    <input 
                        type="text" 
                        value={deliveryTurnaround} 
                        onChange={e => setDeliveryTurnaround(e.target.value)} 
                        placeholder="e.g. Orders dispatched within 2 hours. Same-day Harare delivery."
                        style={{ width: '100%' }} 
                    />
                </label>

                <label style={{ display: 'block', marginBottom: '16px' }}>
                    <span className="form-label">🔄 Return & Refund Policy</span>
                    <textarea 
                        rows="2"
                        value={returnPolicy} 
                        onChange={e => setReturnPolicy(e.target.value)} 
                        placeholder="e.g. 7-day return policy for unopened items in original packaging. Full refund or exchange."
                        style={{ width: '100%', resize: 'vertical' }} 
                    />
                </label>

                <label style={{ display: 'block' }}>
                    <span className="form-label">🛡️ Warranty Coverage Policy</span>
                    <textarea 
                        rows="2"
                        value={warrantyPolicy} 
                        onChange={e => setWarrantyPolicy(e.target.value)} 
                        placeholder="e.g. 12 months manufacturer warranty on electronic inverters and lithium batteries."
                        style={{ width: '100%', resize: 'vertical' }} 
                    />
                </label>
            </div>

            {/* Low-Stock Threshold Variable Card */}
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>⚠️</span> Inventory Low-Stock Sensitivity Alert
                </div>
                <div className="settings-section-subtitle">
                    Set the unit count threshold that triggers low-stock warning badges on your dashboard.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                            type="number" 
                            min="1" 
                            max="100" 
                            value={lowStockThreshold} 
                            onChange={e => setLowStockThreshold(parseInt(e.target.value, 10) || 1)} 
                            style={{ width: '90px', padding: '8px', fontSize: '15px', fontWeight: '800', textAlign: 'center' }} 
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            units or fewer remaining
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[2, 3, 5, 10].map(val => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setLowStockThreshold(val)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: '1px solid var(--border)',
                                    backgroundColor: lowStockThreshold === val ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                    color: lowStockThreshold === val ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                ≤ {val}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="settings-footer-actions">
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    📋 Policies are highlighted on product pages to build customer trust.
                </span>
                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={saving} 
                    style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                >
                    {saving ? 'Saving Changes...' : '💾 Save Policies & Alerts'}
                </button>
            </div>
        </form>
    );
}
