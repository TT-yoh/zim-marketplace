export function ShippingTab({ customZoneRates, flatShippingFee, freeShippingThreshold, handleSaveVendor, saving, setCustomZoneRates, setFlatShippingFee, setFreeShippingThreshold, setShippingMode, shippingMode }) {
    return (
        <form onSubmit={handleSaveVendor} className="animate-fade-in">
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>🚚</span> Delivery Pricing Strategy
                </div>
                <div className="settings-section-subtitle">
                    Choose how delivery fees are billed to buyers when checking out from your store.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    <label className={`radio-card ${shippingMode === 'default' ? 'active' : ''}`} style={{ padding: '14px' }}>
                        <input 
                            type="radio" 
                            name="shippingMode" 
                            value="default" 
                            checked={shippingMode === 'default'} 
                            onChange={e => setShippingMode(e.target.value)} 
                        />
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                🌐 Platform Standard
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Standard tiers (Harare $2–$5, Bulawayo $3, Intercity $8)
                            </div>
                        </div>
                    </label>

                    <label className={`radio-card ${shippingMode === 'flat' ? 'active' : ''}`} style={{ padding: '14px' }}>
                        <input 
                            type="radio" 
                            name="shippingMode" 
                            value="flat" 
                            checked={shippingMode === 'flat'} 
                            onChange={e => setShippingMode(e.target.value)} 
                        />
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                🏷️ Store Flat Rate
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Charge one single fixed delivery fee across all destinations
                            </div>
                        </div>
                    </label>

                    <label className={`radio-card ${shippingMode === 'custom_zones' ? 'active' : ''}`} style={{ padding: '14px' }}>
                        <input 
                            type="radio" 
                            name="shippingMode" 
                            value="custom_zones" 
                            checked={shippingMode === 'custom_zones'} 
                            onChange={e => setShippingMode(e.target.value)} 
                        />
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                📍 Custom Zimbabwe Zones
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Set tailored delivery fees for specific cities and suburbs
                            </div>
                        </div>
                    </label>
                </div>

                {/* Flat Rate Input */}
                {shippingMode === 'flat' && (
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                        <label>
                            <span className="form-label">Store Flat Delivery Fee ($ USD)</span>
                            <input 
                                type="number" 
                                step="0.50" 
                                min="0" 
                                value={flatShippingFee} 
                                onChange={e => setFlatShippingFee(e.target.value)} 
                                placeholder="3.00"
                                style={{ width: '160px', padding: '8px', fontSize: '15px', fontWeight: '700' }}
                            />
                        </label>
                    </div>
                )}

                {/* Custom Zones Grid */}
                {shippingMode === 'custom_zones' && (
                    <div style={{ padding: '18px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            Regional Delivery Rates ($ USD)
                        </div>
                        <div className="settings-grid-3">
                            <label>
                                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Harare CBD</span>
                                <input type="number" step="0.50" min="0" value={customZoneRates.harare_cbd} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_cbd: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Harare East (Msasa)</span>
                                <input type="number" step="0.50" min="0" value={customZoneRates.harare_east} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_east: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Harare North (Avondale)</span>
                                <input type="number" step="0.50" min="0" value={customZoneRates.harare_north} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_north: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Greater Harare</span>
                                <input type="number" step="0.50" min="0" value={customZoneRates.harare_greater} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_greater: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Bulawayo Central</span>
                                <input type="number" step="0.50" min="0" value={customZoneRates.bulawayo_central} onChange={e => setCustomZoneRates({ ...customZoneRates, bulawayo_central: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Inter-City Courier</span>
                                <input type="number" step="0.50" min="0" value={customZoneRates.intercity_express} onChange={e => setCustomZoneRates({ ...customZoneRates, intercity_express: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                            </label>
                        </div>
                    </div>
                )}

                {/* Free Delivery Threshold */}
                <div style={{ marginTop: '16px' }}>
                    <label>
                        <span className="form-label">🎉 Free Delivery Minimum Order ($ USD, optional)</span>
                        <input 
                            type="number" 
                            step="5" 
                            min="0" 
                            value={freeShippingThreshold} 
                            onChange={e => setFreeShippingThreshold(e.target.value)} 
                            placeholder="e.g. 50.00 (Orders over $50 unlock free delivery)"
                            style={{ width: '100%', maxWidth: '360px', padding: '8px' }}
                        />
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            When set, any buyer whose cart subtotal exceeds this amount gets automated free delivery at checkout.
                        </div>
                    </label>
                </div>
            </div>

            <div className="settings-footer-actions">
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    🚚 Delivery rates update automatically for customer checkouts.
                </span>
                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={saving} 
                    style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                >
                    {saving ? 'Saving Changes...' : '💾 Save Delivery Rates'}
                </button>
            </div>
        </form>
    );
}
