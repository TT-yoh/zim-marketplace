import { VendorWallet } from '../VendorWallet.jsx';

export function PricingTab({ currency, fetchingOfficialRate, getFormattedPrice, handleFetchLiveRate, handleSaveStoreRate, isEditingStoreRate, officialRateMeta, savingStoreRate, setIsEditingStoreRate, setShowBulkPriceModal, setStoreCustomRateInput, setStoreRateMode, shopId, storeCustomRateInput, storeEffectiveRate, storeRateMode, totalInventoryValueCents, totalProducts, vendorProfile }) {
    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

                {/* Card 1: Store ZiG Exchange Rate Engine */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>🇿🇼</span>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Store ZiG Exchange Rate</h4>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official RBZ Feed vs Custom Multiplier</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleFetchLiveRate}
                            disabled={fetchingOfficialRate}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Fetch latest live exchange rate from official feeds"
                        >
                            <span style={{ display: 'inline-block', transform: fetchingOfficialRate ? 'rotate(360deg)' : 'none', transition: 'transform 0.8s ease' }}>
                                🔄
                            </span>
                            {fetchingOfficialRate ? 'Syncing...' : 'Sync Official'}
                        </button>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>
                                1 USD = {storeEffectiveRate.toFixed(2)} ZiG
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '10px',
                                backgroundColor: (vendorProfile?.use_custom_rate || storeRateMode === 'custom') ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: (vendorProfile?.use_custom_rate || storeRateMode === 'custom') ? 'var(--accent-primary)' : 'var(--success)',
                                fontWeight: '700'
                            }}>
                                {(vendorProfile?.use_custom_rate || storeRateMode === 'custom') ? '🏪 Custom Store Rate' : '🌐 Official RBZ Interbank'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Official RBZ: 1 USD = {officialRateMeta.rate.toFixed(2)} ZiG
                            </span>
                        </div>
                    </div>

                    {/* Inline Rate Modifier or Toggle Button */}
                    {!isEditingStoreRate ? (
                        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setIsEditingStoreRate(true)}
                                className="btn-secondary"
                                style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: '700', borderRadius: '10px' }}
                            >
                                ⚙️ Modify Store Exchange Rate
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginTop: 'auto', padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="storeRateRadio"
                                        checked={storeRateMode === 'official'}
                                        onChange={() => setStoreRateMode('official')}
                                    />
                                    Official RBZ ({officialRateMeta.rate.toFixed(2)})
                                </label>
                                <label style={{ fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="storeRateRadio"
                                        checked={storeRateMode === 'custom'}
                                        onChange={() => setStoreRateMode('custom')}
                                    />
                                    Custom Multiplier
                                </label>
                            </div>

                            {storeRateMode === 'custom' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>1 USD =</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        value={storeCustomRateInput}
                                        onChange={e => setStoreCustomRateInput(e.target.value)}
                                        style={{ width: '90px', padding: '6px 8px', fontSize: '15px', fontWeight: '700' }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>ZiG</span>
                                    <button
                                        type="button"
                                        onClick={() => setStoreCustomRateInput(officialRateMeta.rate.toFixed(2))}
                                        className="btn-secondary"
                                        style={{ fontSize: '11px', padding: '5px 8px' }}
                                        title="Copy current official rate into custom input"
                                    >
                                        ⚡ Match Official
                                    </button>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={handleSaveStoreRate}
                                    disabled={savingStoreRate}
                                    className="btn-primary"
                                    style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: '700' }}
                                >
                                    {savingStoreRate ? 'Saving...' : '💾 Save Rate'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingStoreRate(false)}
                                    className="btn-secondary"
                                    style={{ padding: '8px 12px', fontSize: '12px' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Card 2: Bulk Price Adjustment Tool */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>💰</span>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Bulk Pricing Engine</h4>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Store-wide inflation markups or promotional discounts</div>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Adjust prices across multiple items simultaneously by percentage or fixed dollar amounts without manual edits.
                    </p>
                    <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setShowBulkPriceModal(true)}
                            className="btn-primary"
                            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '700', borderRadius: '10px' }}
                        >
                            💰 Launch Bulk Price Adjuster
                        </button>
                    </div>
                </div>

                {/* Card 3: ZIMRA 15% VAT Tax Configuration */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>🏛️</span>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>ZIMRA 15% Standard VAT</h4>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Zimbabwe Revenue Authority Compliance</div>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        All catalog items store both <strong>Price (Incl. VAT)</strong> and <strong>Price (Excl. VAT)</strong>. Storefront quotes, pro-forma receipts, and invoices automatically compute standard 15% tax breakdowns.
                    </p>
                    <div style={{ padding: '10px 14px', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        ✓ Dual-currency (USD &amp; ZiG) compliant tax lines active on all buyer orders.
                    </div>
                </div>

                {/* Card 4: Catalog Valuation */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>📈</span>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Catalog Retail Valuation</h4>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estimated Retail Stock Value</div>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                            {getFormattedPrice(totalInventoryValueCents)}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            In ZiG: <strong style={{ color: 'var(--text-primary)' }}>
                                ZiG {((totalInventoryValueCents / 100) * storeEffectiveRate).toFixed(2)}
                            </strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                (@ {storeEffectiveRate.toFixed(2)} ZiG/USD)
                            </span>
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'auto' }}>
                        Across {totalProducts} registered catalog items.
                    </div>
                </div>
            </div>

            {/* Card 4: Vendor Wallet & Escrow Balance */}
            <div style={{ marginTop: '8px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💳</span> Merchant Wallet & Escrow Payouts
                </h4>
                <VendorWallet shopId={shopId} />
            </div>
        </div>
    );
}
