import { getStoreRateInfo } from '../../utils/exchangeRateService.js';
import { Button } from '../ui/index.js';

export function VendorStoreBanner({ copyStoreLink, filteredProducts, selectedVendorShopId, setSelectedVendorShopId, shareStoreWhatsApp, vendorProfiles, zigRate }) {
    return (
        <>
            {selectedVendorShopId !== 'All' && vendorProfiles[selectedVendorShopId] && (() => {
                const vp = vendorProfiles[selectedVendorShopId];
                const bio = vp.bio || vp.shipping_settings?.bio;
                const slogan = vp.slogan || vp.shipping_settings?.slogan;
                const logoUrl = vp.logo_url || vp.shipping_settings?.logo_url;
                const bannerUrl = vp.banner_url || vp.shipping_settings?.banner_url;
                const address = vp.business_address || vp.shipping_settings?.business_address || vp.shipping_settings?.pickup_address;
                const operatingHours = vp.operating_hours || vp.shipping_settings?.operating_hours;
                const returnPolicy = vp.return_policy || vp.shipping_settings?.return_policy;
                const warrantyPolicy = vp.warranty_policy || vp.shipping_settings?.warranty_policy;
                const deliveryTurnaround = vp.delivery_turnaround || vp.shipping_settings?.delivery_turnaround;
                const supportEmail = vp.support_email || vp.shipping_settings?.support_email;
                const secondaryPhone = vp.secondary_phone || vp.shipping_settings?.secondary_phone;
                const allowPickup = vp.shipping_settings?.allow_pickup !== false;

                return (
                    <div className="glass-panel animate-fade-in-up" style={{ 
                        marginBottom: '24px', 
                        borderRadius: '20px', 
                        overflow: 'hidden', 
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)'
                    }}>
                        {/* Optional Cover Banner */}
                        {bannerUrl && (
                            <div style={{ height: '140px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                                <img 
                                    src={bannerUrl} 
                                    alt={`${vp.store_name} Banner`} className="img-cover" 
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.1), rgba(15,23,42,0.8))' }} />
                            </div>
                        )}

                        <div style={{ 
                            padding: '24px', 
                            background: bannerUrl ? 'var(--bg-secondary)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                                {/* Store Identity */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: '1', minWidth: '280px' }}>
                                    {/* Store Logo or Initial */}
                                    <div style={{ 
                                        width: '64px', 
                                        height: '64px', 
                                        borderRadius: '16px', 
                                        backgroundColor: 'var(--accent-primary)', 
                                        color: '#fff', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontSize: '28px', 
                                        fontWeight: 'bold', 
                                        boxShadow: '0 6px 16px rgba(59, 130, 246, 0.35)',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        border: '2px solid rgba(255,255,255,0.2)'
                                    }}>
                                        {logoUrl ? (
                                            <img src={logoUrl} alt={vp.store_name} className="img-cover" />
                                        ) : (
                                            vp.store_name ? vp.store_name.charAt(0).toUpperCase() : '🏪'
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="gap-8 wrap row">
                                            <h2 className="m-0 fs-24 fw-800 text-primary">
                                                {vp.store_name}
                                            </h2>
                                            {vp.is_verified && (
                                                <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', border: '1px solid var(--success)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                                                    ✓ Verified Merchant
                                                </span>
                                            )}
                                            {vp.avgRating && (
                                                <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                                                    ★ {vp.avgRating} ({vp.reviewCount || 0} reviews)
                                                </span>
                                            )}
                                        </div>

                                        {/* Slogan */}
                                        {slogan && (
                                            <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--accent-primary)', marginTop: '4px', fontWeight: '600' }}>
                                                "{slogan}"
                                            </div>
                                        )}

                                        {/* Bio / Description */}
                                        {bio && (
                                            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', maxWidth: '650px' }}>
                                                {bio}
                                            </p>
                                        )}

                                        {/* Operational Badges Row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                            <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                                                📦 <strong>{filteredProducts.length}</strong> Listed Products
                                            </span>

                                            {deliveryTurnaround && (
                                                <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                                                    ⚡ {deliveryTurnaround}
                                                </span>
                                            )}

                                            {vp.shipping_settings?.free_shipping_threshold_cents && (
                                                <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid var(--success)', fontWeight: '600' }}>
                                                    🎉 Free Delivery over ${(vp.shipping_settings.free_shipping_threshold_cents / 100).toFixed(0)}
                                                </span>
                                            )}

                                            {operatingHours && (
                                                <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                                                    🕒 {operatingHours}
                                                </span>
                                            )}

                                            {/* Store Active ZiG Exchange Rate Badge */}
                                            {(() => {
                                                const rateInfo = getStoreRateInfo(vp, { rate: zigRate, source: 'Official RBZ' });
                                                return (
                                                    <span 
                                                        title={rateInfo.label}
                                                        style={{ 
                                                            padding: '3px 10px', 
                                                            borderRadius: '12px', 
                                                            backgroundColor: rateInfo.isCustom ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                                                            color: rateInfo.isCustom ? 'var(--accent-primary)' : 'var(--success)', 
                                                            border: `1px solid ${rateInfo.isCustom ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, 
                                                            fontWeight: '700' 
                                                        }}
                                                    >
                                                        🇿🇼 {rateInfo.label}
                                                    </span>
                                                );
                                            })()}

                                            {address && allowPickup && (
                                                <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                                                    📍 Pickup: {address}
                                                </span>
                                            )}

                                            {warrantyPolicy && (
                                                <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                                                    🛡️ {warrantyPolicy}
                                                </span>
                                            )}

                                            {returnPolicy && (
                                                <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                                                    🔄 {returnPolicy}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="gap-8 wrap row">
                                    {vp.whatsapp_number && (
                                        <Button
                                            onClick={() => {
                                                const phone = vp.whatsapp_number.replace(/[^0-9]/g, '');
                                                const msg = encodeURIComponent(`Hi ${vp.store_name}, I am viewing your store on ZimMarket and have an inquiry!`);
                                                window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                                            }}
                                            variant="secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--success)', color: 'var(--success)', fontSize: '12px', padding: '8px 12px' }}
                                        >
                                            <span>💬</span> WhatsApp
                                        </Button>
                                    )}

                                    {(secondaryPhone || vp.whatsapp_number) && (
                                        <Button
                                            onClick={() => {
                                                window.location.href = `tel:${secondaryPhone || vp.whatsapp_number}`;
                                            }}
                                            variant="secondary" className="gap-6 fs-12 p-8-12 row"
                                            title="Call Store Directly"
                                        >
                                            <span>📞</span> Call
                                        </Button>
                                    )}

                                    <Button
                                        onClick={() => copyStoreLink(vp)}
                                        variant="secondary" className="gap-6 fs-12 p-8-12 row"
                                    >
                                        <span>🔗</span> Copy Link
                                    </Button>

                                    <Button
                                        onClick={() => shareStoreWhatsApp(vp)}
                                        variant="secondary" className="gap-6 fs-12 p-8-12 row"
                                    >
                                        <span>📲</span> Share
                                    </Button>

                                    <Button
                                        onClick={() => {
                                            setSelectedVendorShopId('All');
                                            window.history.pushState({}, '', window.location.pathname);
                                        }}
                                        variant="secondary" className="gap-6 fs-12 p-8-12 text-muted row"
                                    >
                                        ✕ View All
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
