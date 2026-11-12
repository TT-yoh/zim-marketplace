import { VendorWallet } from '../VendorWallet.jsx';
import { Button } from '../ui/index.js';

export function PricingTab({ fetchingOfficialRate, getFormattedPrice, handleFetchLiveRate, handleSaveStoreRate, isEditingStoreRate, officialRateMeta, savingStoreRate, setIsEditingStoreRate, setShowBulkPriceModal, setStoreCustomRateInput, setStoreRateMode, shopId, storeCustomRateInput, storeEffectiveRate, storeRateMode, totalInventoryValueCents, totalProducts, vendorProfile }) {
    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

                {/* Card 1: Store ZiG Exchange Rate Engine */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                    <div className="between gap-10 row">
                        <div className="gap-10 row">
                            <span className="fs-24">🇿🇼</span>
                            <div>
                                <h4 className="m-0 fs-16 text-primary">Store ZiG Exchange Rate</h4>
                                <div className="fs-12 text-muted">Official RBZ Feed vs Custom Multiplier</div>
                            </div>
                        </div>
                        <Button
                            type="button"
                            onClick={handleFetchLiveRate}
                            disabled={fetchingOfficialRate}
                            variant="secondary" className="fs-12 p-6-10 gap-6 row"
                            title="Fetch latest live exchange rate from official feeds"
                        >
                            <span style={{ display: 'inline-block', transform: fetchingOfficialRate ? 'rotate(360deg)' : 'none', transition: 'transform 0.8s ease' }}>
                                🔄
                            </span>
                            {fetchingOfficialRate ? 'Syncing...' : 'Sync Official'}
                        </Button>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <span className="fs-28 fw-800 text-success">
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
                            <span className="fs-12 text-muted">
                                Official RBZ: 1 USD = {officialRateMeta.rate.toFixed(2)} ZiG
                            </span>
                        </div>
                    </div>

                    {/* Inline Rate Modifier or Toggle Button */}
                    {!isEditingStoreRate ? (
                        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                            <Button
                                type="button"
                                onClick={() => setIsEditingStoreRate(true)}
                                variant="secondary"
                                style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: '700', borderRadius: '10px' }}
                            >
                                ⚙️ Modify Store Exchange Rate
                            </Button>
                        </div>
                    ) : (
                        <div style={{ marginTop: 'auto', padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
                            <div className="flex gap-10 wrap">
                                <label className="fs-12 fw-600 gap-6 cursor-pointer row">
                                    <input
                                        type="radio"
                                        name="storeRateRadio"
                                        checked={storeRateMode === 'official'}
                                        onChange={() => setStoreRateMode('official')}
                                    />
                                    Official RBZ ({officialRateMeta.rate.toFixed(2)})
                                </label>
                                <label className="fs-12 fw-600 gap-6 cursor-pointer row">
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
                                <div className="gap-8 wrap row">
                                    <span className="fs-13 fw-600 text-secondary">1 USD =</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        value={storeCustomRateInput}
                                        onChange={e => setStoreCustomRateInput(e.target.value)}
                                        style={{ width: '90px', padding: '6px 8px', fontSize: '15px', fontWeight: '700' }}
                                    />
                                    <span className="fs-13 fw-600 text-secondary">ZiG</span>
                                    <Button
                                        type="button"
                                        onClick={() => setStoreCustomRateInput(officialRateMeta.rate.toFixed(2))}
                                        variant="secondary"
                                        style={{ fontSize: '11px', padding: '5px 8px' }}
                                        title="Copy current official rate into custom input"
                                    >
                                        ⚡ Match Official
                                    </Button>
                                </div>
                            )}

                            <div className="flex gap-8">
                                <Button
                                    type="button"
                                    onClick={handleSaveStoreRate}
                                    disabled={savingStoreRate}
                                    style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: '700' }}
                                >
                                    {savingStoreRate ? 'Saving...' : '💾 Save Rate'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setIsEditingStoreRate(false)}
                                    variant="secondary" className="p-8-12 fs-12"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Card 2: Bulk Price Adjustment Tool */}
                <div className="glass-panel p-24 gap-14 rounded-16 stack">
                    <div className="gap-10 row">
                        <span className="fs-24">💰</span>
                        <div>
                            <h4 className="m-0 fs-16 text-primary">Bulk Pricing Engine</h4>
                            <div className="fs-12 text-muted">Store-wide inflation markups or promotional discounts</div>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Adjust prices across multiple items simultaneously by percentage or fixed dollar amounts without manual edits.
                    </p>
                    <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                        <Button
                            type="button"
                            onClick={() => setShowBulkPriceModal(true)}
                            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '700', borderRadius: '10px' }}
                        >
                            💰 Launch Bulk Price Adjuster
                        </Button>
                    </div>
                </div>

                {/* Card 3: ZIMRA 15% VAT Tax Configuration */}
                <div className="glass-panel p-24 gap-14 rounded-16 stack">
                    <div className="gap-10 row">
                        <span className="fs-24">🏛️</span>
                        <div>
                            <h4 className="m-0 fs-16 text-primary">ZIMRA 15% Standard VAT</h4>
                            <div className="fs-12 text-muted">Zimbabwe Revenue Authority Compliance</div>
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
                <div className="glass-panel p-24 gap-14 rounded-16 stack">
                    <div className="gap-10 row">
                        <span className="fs-24">📈</span>
                        <div>
                            <h4 className="m-0 fs-16 text-primary">Catalog Retail Valuation</h4>
                            <div className="fs-12 text-muted">Estimated Retail Stock Value</div>
                        </div>
                    </div>
                    <div>
                        <div className="fs-28 fw-800 text-accent">
                            {getFormattedPrice(totalInventoryValueCents)}
                        </div>
                        <div className="fs-13 text-secondary mt-4">
                            In ZiG: <strong className="text-primary">
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
