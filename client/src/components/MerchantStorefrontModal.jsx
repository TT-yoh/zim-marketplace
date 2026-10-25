// client/src/components/MerchantStorefrontModal.jsx
import React, { useState, useMemo } from 'react';
import { getStoreEffectiveZigRate, getStoreRateInfo } from '../utils/exchangeRateService.js';
import { useToast } from './ToastContext.jsx';
import { useChat } from './ChatContext.jsx';

export function MerchantStorefrontModal({
    isOpen,
    onClose,
    vendor,
    products = [],
    formatPrice,
    currency = 'USD',
    zigRate = 25.5,
    onAddToCart,
    onQuickView,
    onViewInCatalog
}) {
    const { showToast } = useToast();
    const { startChatWithVendor } = useChat();
    const [activeTab, setActiveTab] = useState('products'); // 'products' | 'about' | 'fulfillment' | 'policies'
    const [storeSearch, setStoreSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    if (!isOpen || !vendor) return null;

    // Extract custom variables from top-level or shipping_settings fallback
    const storeName = vendor.store_name || 'Verified Merchant';
    const bio = vendor.bio || vendor.shipping_settings?.bio || 'Welcome to our verified merchant storefront on ZimMarket. We offer quality products with guaranteed delivery and escrow protection.';
    const slogan = vendor.slogan || vendor.shipping_settings?.slogan || '';
    const logoUrl = vendor.logo_url || vendor.shipping_settings?.logo_url;
    const bannerUrl = vendor.banner_url || vendor.shipping_settings?.banner_url;
    const address = vendor.business_address || vendor.shipping_settings?.business_address || vendor.shipping_settings?.pickup_address;
    const operatingHours = vendor.operating_hours || vendor.shipping_settings?.operating_hours;
    const returnPolicy = vendor.return_policy || vendor.shipping_settings?.return_policy || '7-Day Return Policy for defective or incorrect items.';
    const warrantyPolicy = vendor.warranty_policy || vendor.shipping_settings?.warranty_policy || 'Standard warranty applies to all eligible products.';
    const deliveryTurnaround = vendor.delivery_turnaround || vendor.shipping_settings?.delivery_turnaround || '1 - 2 business days';
    const supportEmail = vendor.support_email || vendor.shipping_settings?.support_email;
    const secondaryPhone = vendor.secondary_phone || vendor.shipping_settings?.secondary_phone;
    const whatsapp = vendor.whatsapp_number;
    const freeShippingThreshold = vendor.shipping_settings?.free_shipping_threshold_cents;
    const allowPickup = vendor.shipping_settings?.pickup_enabled !== false;

    // Filter products belonging to this vendor
    const vendorProducts = useMemo(() => {
        return products.filter(p => p.shop_id === vendor.id);
    }, [products, vendor.id]);

    // Store categories
    const storeCategories = useMemo(() => {
        const cats = new Set();
        vendorProducts.forEach(p => {
            if (p.category) cats.add(p.category);
        });
        return ['All', ...Array.from(cats)];
    }, [vendorProducts]);

    // Filtered store products based on store search and category
    const filteredStoreProducts = useMemo(() => {
        const clean = storeSearch.trim().toLowerCase();
        return vendorProducts.filter(p => {
            if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
            if (clean) {
                const titleMatch = p.title?.toLowerCase().includes(clean);
                const descMatch = p.description?.toLowerCase().includes(clean);
                const brandMatch = p.brand?.toLowerCase().includes(clean);
                return titleMatch || descMatch || brandMatch;
            }
            return true;
        });
    }, [vendorProducts, storeSearch, selectedCategory]);

    const rateInfo = getStoreRateInfo(vendor, { rate: zigRate, source: 'Official RBZ' });
    const effectiveRate = getStoreEffectiveZigRate(vendor, zigRate);

    // Share link handler
    const handleCopyStoreLink = () => {
        const slug = vendor.store_slug || storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const url = `${window.location.origin}${window.location.pathname}?store=${slug}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast(`Storefront link copied to clipboard!`, 'success');
        }).catch(() => {
            showToast(`Could not copy link automatically`, 'warning');
        });
    };

    // Live chat handler
    const handleStartChat = () => {
        if (startChatWithVendor) {
            startChatWithVendor(vendor.id, storeName);
            onClose();
        }
    };

    return (
        <div 
            className="merchant-modal-overlay animate-fade-in"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(5, 7, 13, 0.8)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px'
            }}
        >
            <div 
                className="merchant-modal-container glass-panel animate-scale-up"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '920px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 50px rgba(59, 130, 246, 0.15)',
                    backgroundColor: 'var(--bg-secondary)',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Store Header with Banner */}
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                    {/* Cover Banner */}
                    <div style={{
                        height: '170px',
                        width: '100%',
                        position: 'relative',
                        backgroundColor: '#1e293b',
                        backgroundImage: bannerUrl 
                            ? `url(${bannerUrl})` 
                            : 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 50%, #064e3b 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to bottom, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.9) 100%)'
                        }} />

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '16px',
                                backdropFilter: 'blur(8px)',
                                zIndex: 10
                            }}
                            title="Close Storefront"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Store Identity Row */}
                    <div style={{
                        padding: '0 28px 18px 28px',
                        marginTop: '-44px',
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        {/* Logo & Name */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px' }}>
                            {/* Logo Avatar */}
                            <div style={{
                                width: '84px',
                                height: '84px',
                                borderRadius: '20px',
                                backgroundColor: 'var(--accent-primary)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                fontWeight: '800',
                                border: '4px solid var(--bg-secondary)',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                                {logoUrl ? (
                                    <img src={logoUrl} alt={storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    storeName.charAt(0).toUpperCase()
                                )}
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                                        {storeName}
                                    </h2>
                                    {vendor.is_verified && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                            color: 'var(--success)',
                                            fontSize: '11.5px',
                                            fontWeight: '700',
                                            border: '1px solid var(--success)'
                                        }}>
                                            ✔ Verified Merchant
                                        </span>
                                    )}
                                </div>
                                {slogan && (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                                        {slogan}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Top Action Pills (Rating, Exchange Rate, Product Count) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                                padding: '6px 12px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                fontSize: '12.5px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                ★ {vendor.rating ? Number(vendor.rating).toFixed(1) : '5.0'} Rating
                            </span>

                            <span style={{
                                padding: '6px 12px',
                                borderRadius: '12px',
                                backgroundColor: rateInfo.isCustom ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: rateInfo.isCustom ? 'var(--accent-primary)' : 'var(--success)',
                                border: `1px solid ${rateInfo.isCustom ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                fontSize: '12px',
                                fontWeight: '700'
                            }}
                            title={rateInfo.label}
                            >
                                🇿🇼 {rateInfo.label}
                            </span>

                            <span style={{
                                padding: '6px 12px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--bg-tertiary)',
                                border: '1px solid var(--border)',
                                fontSize: '12px',
                                color: 'var(--text-secondary)'
                            }}>
                                📦 {vendorProducts.length} Listings
                            </span>
                        </div>
                    </div>

                    {/* Quick Interaction Buttons Bar */}
                    <div style={{
                        padding: '12px 28px',
                        borderTop: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={handleStartChat}
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
                            >
                                <span>💬</span> Live Chat
                            </button>

                            {whatsapp && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const phone = whatsapp.replace(/[^0-9]/g, '');
                                        const msg = encodeURIComponent(`Hi ${storeName}, I am browsing your store on ZimMarket and have an inquiry!`);
                                        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                                    }}
                                    className="btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--success)', color: 'var(--success)', fontSize: '13px', padding: '8px 14px' }}
                                >
                                    <span>📱</span> WhatsApp
                                </button>
                            )}

                            {(secondaryPhone || whatsapp) && (
                                <button
                                    type="button"
                                    onClick={() => window.location.href = `tel:${secondaryPhone || whatsapp}`}
                                    className="btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
                                >
                                    <span>📞</span> Call
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleCopyStoreLink}
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
                            >
                                <span>🔗</span> Share Link
                            </button>
                        </div>

                        {onViewInCatalog && (
                            <button
                                type="button"
                                onClick={() => {
                                    onViewInCatalog(vendor.id);
                                    onClose();
                                }}
                                className="btn-secondary"
                                style={{ fontSize: '12.5px', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', padding: '8px 14px' }}
                            >
                                Browse in Full Marketplace ↗
                            </button>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        padding: '10px 28px 0 28px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border)',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap'
                    }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('products')}
                            style={{
                                padding: '10px 18px',
                                border: 'none',
                                borderBottom: activeTab === 'products' ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                background: 'transparent',
                                color: activeTab === 'products' ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === 'products' ? '700' : '500',
                                fontSize: '13.5px',
                                cursor: 'pointer'
                            }}
                        >
                            📦 Products ({vendorProducts.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('fulfillment')}
                            style={{
                                padding: '10px 18px',
                                border: 'none',
                                borderBottom: activeTab === 'fulfillment' ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                background: 'transparent',
                                color: activeTab === 'fulfillment' ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === 'fulfillment' ? '700' : '500',
                                fontSize: '13.5px',
                                cursor: 'pointer'
                            }}
                        >
                            📍 Location & Delivery
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('policies')}
                            style={{
                                padding: '10px 18px',
                                border: 'none',
                                borderBottom: activeTab === 'policies' ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                background: 'transparent',
                                color: activeTab === 'policies' ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === 'policies' ? '700' : '500',
                                fontSize: '13.5px',
                                cursor: 'pointer'
                            }}
                        >
                            🛡️ Guarantees & Returns
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('about')}
                            style={{
                                padding: '10px 18px',
                                border: 'none',
                                borderBottom: activeTab === 'about' ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                background: 'transparent',
                                color: activeTab === 'about' ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === 'about' ? '700' : '500',
                                fontSize: '13.5px',
                                cursor: 'pointer'
                            }}
                        >
                            ℹ️ About Merchant
                        </button>
                    </div>
                </div>

                {/* Tab Content Body */}
                <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                    {/* TAB 1: PRODUCTS */}
                    {activeTab === 'products' && (
                        <div>
                            {/* In-Store Search & Category Filters */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '220px' }}>
                                    <input
                                        type="text"
                                        placeholder={`Search in ${storeName}...`}
                                        value={storeSearch}
                                        onChange={(e) => setStoreSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 14px',
                                            fontSize: '13px',
                                            borderRadius: '8px',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    {storeSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setStoreSearch('')}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {storeCategories.length > 2 && (
                                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                                        {storeCategories.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat)}
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    backgroundColor: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                                    color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)'
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Products Grid */}
                            {filteredStoreProducts.length > 0 ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                                    gap: '16px'
                                }}>
                                    {filteredStoreProducts.map(product => {
                                        const usd = (product.price_cents || 0) / 100;
                                        const zig = usd * effectiveRate;
                                        const inStock = product.stock_quantity > 0;

                                        return (
                                            <div
                                                key={product.id}
                                                style={{
                                                    borderRadius: '16px',
                                                    border: '1px solid var(--border)',
                                                    backgroundColor: 'var(--bg-tertiary)',
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    transition: 'all 0.2s ease',
                                                    position: 'relative'
                                                }}
                                                className="card-interactive"
                                            >
                                                {/* Product Image */}
                                                <div 
                                                    onClick={() => {
                                                        if (onQuickView) onQuickView(product);
                                                    }}
                                                    style={{
                                                        height: '140px',
                                                        width: '100%',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '32px' }}>📦</span>
                                                    )}
                                                </div>

                                                {/* Card Content */}
                                                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                                                    <div>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            {product.category}
                                                        </span>
                                                        <h4 
                                                            onClick={() => {
                                                                if (onQuickView) onQuickView(product);
                                                            }}
                                                            style={{
                                                                margin: '4px 0 8px 0',
                                                                fontSize: '13.5px',
                                                                fontWeight: '600',
                                                                color: 'var(--text-primary)',
                                                                lineHeight: '1.35',
                                                                cursor: 'pointer',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}
                                                            title={product.title}
                                                        >
                                                            {product.title}
                                                        </h4>
                                                    </div>

                                                    <div>
                                                        {/* Price Block */}
                                                        <div style={{ marginTop: '6px' }}>
                                                            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                                                                {product.price_cents > 0 ? `$${usd.toFixed(2)}` : 'Price on Request'}
                                                            </div>
                                                            {product.price_cents > 0 && (
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                    ≈ ZiG {zig.toFixed(2)}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Action Row */}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: '8px' }}>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                color: inStock ? 'var(--success)' : 'var(--danger)'
                                                            }}>
                                                                {inStock ? `In Stock (${product.stock_quantity})` : 'Out of stock'}
                                                            </span>

                                                            {inStock && onAddToCart && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onAddToCart(product)}
                                                                    className="btn-primary"
                                                                    style={{ padding: '5px 12px', fontSize: '11.5px', borderRadius: '6px' }}
                                                                >
                                                                    + Add
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600' }}>No products match your store filter</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: FULFILLMENT & LOCATION */}
                    {activeTab === 'fulfillment' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            {/* Physical Address & Pickup */}
                            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid var(--accent-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>📍</span>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Physical Store & Pick-up</h4>
                                </div>
                                <p style={{ margin: '0 0 12px 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    {address || 'Direct merchant dispatch across Harare and national courier.'}
                                </p>
                                {vendor.pickup_instructions && (
                                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                                        <strong>Pick-up Note:</strong> {vendor.pickup_instructions}
                                    </div>
                                )}
                            </div>

                            {/* Operating Hours */}
                            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>🕒</span>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Operating Schedule</h4>
                                </div>
                                <p style={{ margin: '0 0 8px 0', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                                    {operatingHours || 'Monday – Friday: 8:00 AM – 5:00 PM\nSaturday: 8:00 AM – 1:00 PM'}
                                </p>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    ⚡ Express courier rider dispatches are processed during operating hours.
                                </div>
                            </div>

                            {/* Delivery Turnaround & Thresholds */}
                            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid var(--success)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>🚚</span>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Delivery Speed & Zones</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                    <div><strong>Turnaround:</strong> {deliveryTurnaround}</div>
                                    {freeShippingThreshold && (
                                        <div style={{ color: 'var(--success)', fontWeight: '600' }}>
                                            🎉 Free Delivery unlocked on orders over ${(freeShippingThreshold / 100).toFixed(0)}!
                                        </div>
                                    )}
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                        Supported delivery zones: Harare CBD, Greater Harare (Chitungwiza, Ruwa, Norton), Bulawayo & Inter-City Courier.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: GUARANTEES & POLICIES */}
                    {activeTab === 'policies' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* ZimMarket Escrow Protection Notice */}
                            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '24px' }}>🛡️</span>
                                    <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--success)' }}>
                                        100% ZimMarket Escrow Financial Guarantee
                                    </h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    When you buy from <strong>{storeName}</strong>, your money is held in secure platform escrow. The seller only receives payment after you have received your order and confirmed delivery. If an item is not delivered as described, you are protected by automated mediation and refund guarantees.
                                </p>
                            </div>

                            {/* Return Policy */}
                            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🔄</span> Return & Exchange Policy
                                </h4>
                                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    {returnPolicy}
                                </p>
                            </div>

                            {/* Warranty Policy */}
                            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🛡️</span> Warranty & Authenticity
                                </h4>
                                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    {warrantyPolicy}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: ABOUT MERCHANT */}
                    {activeTab === 'about' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                                    About {storeName}
                                </h4>
                                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                    {bio}
                                </p>
                            </div>

                            {/* Contact Details Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                {supportEmail && (
                                    <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email Inquiries</div>
                                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>
                                            <a href={`mailto:${supportEmail}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                                                {supportEmail}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {whatsapp && (
                                    <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>WhatsApp Business</div>
                                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--success)', marginTop: '4px' }}>
                                            {whatsapp}
                                        </div>
                                    </div>
                                )}

                                {secondaryPhone && (
                                    <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Telephone</div>
                                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>
                                            {secondaryPhone}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
