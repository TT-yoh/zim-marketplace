export function RateTab({ fetchingOfficialRate, handleFetchLiveRate, handleSaveVendor, officialRateMeta, saving, setStoreCustomRate, setUseCustomZigRate, storeCustomRate, useCustomZigRate }) {
    return (
        <form onSubmit={handleSaveVendor} className="animate-fade-in">
            {/* Section Card: Official Rate Feed */}
            <div className="settings-section-card" style={{ borderColor: 'rgba(16, 185, 129, 0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                    <div>
                        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🇿🇼</span> Official Reserve Bank of Zimbabwe (RBZ) Interbank Feed
                        </div>
                        <div className="settings-section-subtitle">
                            Live foreign exchange benchmark retrieved from official banking heads and public currency feeds.
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleFetchLiveRate}
                        disabled={fetchingOfficialRate}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '700' }}
                    >
                        <span style={{ display: 'inline-block', transform: fetchingOfficialRate ? 'rotate(360deg)' : 'none', transition: 'transform 0.8s ease' }}>
                            🔄
                        </span>
                        {fetchingOfficialRate ? 'Connecting to Feeds...' : 'Fetch Official Live Rate'}
                    </button>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Official Reference Rate
                        </div>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                            1 USD = {officialRateMeta.rate?.toFixed(2)} ZiG
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Authority Source
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '6px' }}>
                            {officialRateMeta.source || 'Reserve Bank of Zimbabwe & Interbank Feed'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Live Feed Health
                        </div>
                        <div style={{ marginTop: '6px' }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                backgroundColor: officialRateMeta.isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: officialRateMeta.isLive ? 'var(--success)' : 'var(--warning, #f59e0b)'
                            }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: officialRateMeta.isLive ? 'var(--success)' : '#f59e0b' }} />
                                {officialRateMeta.isLive ? '🟢 Live Interbank Stream' : '🟠 Cached Baseline'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Card: Store Rate Policy Selection */}
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>🏪</span> Store Pricing & Conversion Policy
                </div>
                <div className="settings-section-subtitle">
                    Select how your product catalog prices are converted to Zimbabwe Gold (ZiG) when buyers view in local currency.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    {/* Option 1: Official Rate */}
                    <label className={`radio-card ${!useCustomZigRate ? 'active' : ''}`} style={{ padding: '16px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="zigRateMode"
                            checked={!useCustomZigRate}
                            onChange={() => setUseCustomZigRate(false)}
                        />
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                🌐 Follow Official RBZ Live Rate (Default)
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                                Automatically tracks daily Reserve Bank / Interbank rates. Zero maintenance required.
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--success)' }}>
                                Active: 1 USD = {officialRateMeta.rate?.toFixed(2)} ZiG
                            </div>
                        </div>
                    </label>

                    {/* Option 2: Custom Store Rate */}
                    <label className={`radio-card ${useCustomZigRate ? 'active' : ''}`} style={{ padding: '16px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="zigRateMode"
                            checked={useCustomZigRate}
                            onChange={() => setUseCustomZigRate(true)}
                        />
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                🏪 Set Custom Store Exchange Rate
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                                Specify your own store multiplier to adjust for local supplier costs, cash premiums, or promotional margins.
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                {useCustomZigRate ? `Active: 1 USD = ${(parseFloat(storeCustomRate) || officialRateMeta.rate).toFixed(2)} ZiG` : 'Click to configure custom multiplier'}
                            </div>
                        </div>
                    </label>
                </div>

                {/* Custom Rate Input & Simulator */}
                {useCustomZigRate && (
                    <div style={{
                        padding: '20px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        marginBottom: '16px'
                    }} className="animate-fade-in">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ flex: '1', minWidth: '240px' }}>
                                <span className="form-label">Your Store Rate (ZiG per 1 USD) *</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                        1 USD =
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        required={useCustomZigRate}
                                        value={storeCustomRate}
                                        onChange={e => setStoreCustomRate(e.target.value)}
                                        placeholder={officialRateMeta.rate?.toFixed(2) || '26.76'}
                                        style={{ width: '130px', fontSize: '18px', fontWeight: '700', padding: '8px 12px' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                        ZiG
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setStoreCustomRate(officialRateMeta.rate.toFixed(2))}
                                        className="btn-secondary"
                                        style={{ fontSize: '12px', padding: '7px 12px' }}
                                        title="Copy current official RBZ rate into your custom input"
                                    >
                                        ⚡ Match Official ({officialRateMeta.rate.toFixed(2)})
                                    </button>
                                </div>
                            </div>

                            {/* Variance vs Official Metric */}
                            {(() => {
                                const customVal = parseFloat(storeCustomRate) || 0;
                                const diff = customVal - officialRateMeta.rate;
                                const diffPct = officialRateMeta.rate > 0 ? ((diff / officialRateMeta.rate) * 100).toFixed(1) : 0;
                                return (
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border)',
                                        fontSize: '12px'
                                    }}>
                                        <div style={{ color: 'var(--text-muted)' }}>Variance vs Official Feed</div>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: diff === 0 ? 'var(--text-secondary)' : diff > 0 ? 'var(--accent-primary)' : 'var(--warning, #f59e0b)',
                                            marginTop: '2px'
                                        }}>
                                            {diff === 0 ? 'Exact Match (0.0%)' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)} ZiG (${diffPct}%)`}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Live Conversion Simulation Box */}
                        <div style={{
                            padding: '14px 18px',
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                            borderRadius: '10px',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            fontSize: '13px'
                        }}>
                            <div style={{ fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '6px' }}>
                                📊 Live Catalog Conversion Simulation
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', color: 'var(--text-secondary)' }}>
                                <div>
                                    Item Listed At: <strong style={{ color: 'var(--text-primary)' }}>$10.00 USD</strong>
                                </div>
                                <div>
                                    Customer Sees (Your Rate): <strong style={{ color: 'var(--success)' }}>
                                        ZiG {((10 * (parseFloat(storeCustomRate) || officialRateMeta.rate))).toFixed(2)}
                                    </strong>
                                </div>
                                <div>
                                    Official RBZ Value: <span style={{ color: 'var(--text-muted)' }}>
                                        ZiG {(10 * officialRateMeta.rate).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Save Footer */}
            <div className="settings-footer-actions">
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    🇿🇼 ZiG conversion updates immediately apply to all products in your store.
                </span>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                    style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                >
                    {saving ? 'Saving Changes...' : '💾 Save Exchange Rate Preference'}
                </button>
            </div>
        </form>
    );
}
