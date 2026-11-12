export function BrandTab({ bannerUrl, bio, copyStoreLink, handleSaveVendor, handleUploadBanner, handleUploadLogo, liveStoreUrl, logoUrl, officialRateMeta, saving, setActiveTab, setBannerUrl, setBio, setLogoUrl, setSlogan, setStoreName, setStoreSlug, setWhatsapp, shareStoreWhatsApp, slogan, storeCustomRate, storeName, storeSlug, uploadingBanner, uploadingLogo, useCustomZigRate, whatsapp }) {
    return (
        <form onSubmit={handleSaveVendor} className="animate-fade-in">
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>🏪</span> Storefront Identity & Direct Links
                </div>
                <div className="settings-section-subtitle">
                    Define your public business name, contact line, and custom web address.
                </div>

                <div className="settings-grid-2" style={{ marginBottom: '16px' }}>
                    <label>
                        <span className="form-label">Store Business Name *</span>
                        <input 
                            type="text" 
                            required 
                            value={storeName} 
                            onChange={e => setStoreName(e.target.value)} 
                            placeholder="e.g. Apex Electronics & Solar"
                            style={{ width: '100%' }} 
                        />
                    </label>

                    <label>
                        <span className="form-label">WhatsApp Customer Orders Line *</span>
                        <input 
                            type="tel" 
                            required 
                            value={whatsapp} 
                            onChange={e => setWhatsapp(e.target.value)} 
                            placeholder="e.g. 0771234567 or 263771234567" 
                            style={{ width: '100%' }} 
                        />
                    </label>
                </div>

                <label style={{ display: 'block', marginBottom: '16px' }}>
                    <span className="form-label">Store Tagline / Slogan</span>
                    <input 
                        type="text" 
                        value={slogan} 
                        onChange={e => setSlogan(e.target.value)} 
                        placeholder="e.g. Genuine Solar Equipment & Lithium Batteries at Best Prices"
                        style={{ width: '100%' }} 
                    />
                </label>

                <label style={{ display: 'block', marginBottom: '16px' }}>
                    <span className="form-label">Vanity URL Slug</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                            zimmarket.co.zw/?store=
                        </span>
                        <input 
                            type="text" 
                            value={storeSlug} 
                            onChange={e => setStoreSlug(e.target.value)} 
                            placeholder="apex-solar"
                            style={{ flex: 1 }}
                        />
                    </div>
                </label>

                {/* Live Storefront Share Box */}
                <div style={{ 
                    padding: '14px 18px', 
                    backgroundColor: 'rgba(59, 130, 246, 0.06)', 
                    border: '1px solid rgba(59, 130, 246, 0.25)', 
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '3px' }}>
                            🔗 Your Live Storefront Link:
                        </div>
                        <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                            {liveStoreUrl}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            type="button" 
                            onClick={copyStoreLink} 
                            className="btn-secondary" 
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                            📋 Copy Link
                        </button>
                        <button 
                            type="button" 
                            onClick={shareStoreWhatsApp} 
                            className="btn-secondary" 
                            style={{ fontSize: '12px', padding: '6px 12px', borderColor: 'var(--success)', color: 'var(--success)' }}
                        >
                            💬 WhatsApp
                        </button>
                        <a 
                            href={liveStoreUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-secondary" 
                            style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
                        >
                            👁️ View Store
                        </a>
                    </div>
                </div>

                {/* Quick ZiG Rate Pill */}
                <div style={{ 
                    marginTop: '12px', 
                    padding: '12px 16px', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px' }}>🇿🇼</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Active Store ZiG Rate:</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                            1 USD = {useCustomZigRate ? (parseFloat(storeCustomRate) || officialRateMeta.rate).toFixed(2) : officialRateMeta.rate.toFixed(2)} ZiG
                        </strong>
                        <span style={{ 
                            fontSize: '11px', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            backgroundColor: useCustomZigRate ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                            color: useCustomZigRate ? 'var(--accent-primary)' : 'var(--success)', 
                            fontWeight: '700' 
                        }}>
                            {useCustomZigRate ? '🏪 Custom Store Multiplier' : '🌐 Official RBZ Live Rate'}
                        </span>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setActiveTab('rate')} 
                        className="btn-secondary" 
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                        Adjust Rate ⚙️
                    </button>
                </div>
            </div>

            {/* Store Description & Bio */}
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>📝</span> About Your Store (Bio)
                </div>
                <div className="settings-section-subtitle">
                    Share your merchant experience, warranty promises, and what makes your catalog special.
                </div>
                <textarea 
                    rows="3"
                    value={bio} 
                    onChange={e => setBio(e.target.value)} 
                    placeholder="Describe what you sell, authentic brand guarantees, warranty policies, and same-day dispatch commitments..."
                    style={{ width: '100%', resize: 'vertical' }} 
                />
            </div>

            {/* Store Branding Visuals */}
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>🎨</span> Brand Visuals & Media
                </div>
                <div className="settings-section-subtitle">
                    Upload a crisp square logo and a panoramic storefront banner cover.
                </div>

                <div className="settings-grid-2">
                    {/* Logo Upload */}
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                            Store Logo (Square)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                            {logoUrl ? (
                                <img src={logoUrl} alt="Store Logo" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                            ) : (
                                <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                    🏷️
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleUploadLogo} 
                                    disabled={uploadingLogo}
                                    style={{ fontSize: '12px', width: '100%' }}
                                />
                                {uploadingLogo && <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>Compressing & uploading logo...</div>}
                            </div>
                        </div>
                        <input 
                            type="url" 
                            placeholder="Or paste Logo Image URL" 
                            value={logoUrl} 
                            onChange={e => setLogoUrl(e.target.value)}
                            style={{ width: '100%', fontSize: '12px', padding: '7px 10px' }}
                        />
                    </div>

                    {/* Banner Upload */}
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                            Storefront Banner Cover
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                            {bannerUrl ? (
                                <img src={bannerUrl} alt="Store Banner" style={{ width: '90px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                            ) : (
                                <div style={{ width: '90px', height: '56px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    🖼️
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleUploadBanner} 
                                    disabled={uploadingBanner}
                                    style={{ fontSize: '12px', width: '100%' }}
                                />
                                {uploadingBanner && <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>Compressing & uploading banner...</div>}
                            </div>
                        </div>
                        <input 
                            type="url" 
                            placeholder="Or paste Banner Image URL" 
                            value={bannerUrl} 
                            onChange={e => setBannerUrl(e.target.value)}
                            style={{ width: '100%', fontSize: '12px', padding: '7px 10px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Save Action Footer */}
            <div className="settings-footer-actions">
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    ✨ Changes immediately update your live storefront on ZimMarket.
                </span>
                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={saving} 
                    style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                >
                    {saving ? 'Saving Changes...' : '💾 Save Store Profile'}
                </button>
            </div>
        </form>
    );
}
