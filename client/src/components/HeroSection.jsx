// client/src/components/HeroSection.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';

export function HeroSection({
    searchTerm = '',
    setSearchTerm,
    selectedCategory = 'All',
    setSelectedCategory,
    categories = [],
    products = [],
    currency = 'USD',
    zigRate = 25.5,
    formatPrice,
    setCurrentView,
    isVendor = false,
    onOpenQuotation,
    onQuickView,
    onAddToCart,
    onSelectSort
}) {
    // Mode: 'promotions' | 'new_arrivals'
    const [activeTab, setActiveTab] = useState('promotions');
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [justAddedId, setJustAddedId] = useState(null);

    // High quality fallback items in case catalog is still streaming or empty
    const defaultPromos = [
        {
            id: 'promo-1',
            title: 'Growatt 5kVA SPF 5000ES Hybrid Solar Inverter',
            category: 'Solar & Energy',
            brand: 'Growatt',
            price_cents: 68500, // $685.00
            original_price_cents: 82000, // $820.00
            discount_percent: 16,
            badge: '🔥 FLASH DEAL -16%',
            image_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
            store_name: 'SolarPro Zimbabwe',
            stock_quantity: 8
        },
        {
            id: 'promo-2',
            title: 'Apple iPhone 15 Pro 256GB - Natural Titanium',
            category: 'Electronics',
            brand: 'Apple',
            price_cents: 109900, // $1099.00
            original_price_cents: 125000, // $1250.00
            discount_percent: 12,
            badge: '⚡ SPECIAL OFFER -12%',
            image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
            store_name: 'iStore Direct Harare',
            stock_quantity: 5
        },
        {
            id: 'promo-3',
            title: 'DEWALT 20V MAX Cordless Drill & Impact Driver Combo Kit',
            category: 'Home & Hardware',
            brand: 'DEWALT',
            price_cents: 19500, // $195.00
            original_price_cents: 24500, // $245.00
            discount_percent: 20,
            badge: '💥 20% OFF WEEKEND DEAL',
            image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
            store_name: 'BuildMat Solutions',
            stock_quantity: 14
        },
        {
            id: 'promo-4',
            title: 'Exide 12V 100Ah Deep Cycle Solar & Inverter Battery',
            category: 'Solar & Energy',
            brand: 'Exide',
            price_cents: 16500, // $165.00
            original_price_cents: 19900, // $199.00
            discount_percent: 17,
            badge: '🔥 SAVE $34 TODAY',
            image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&auto=format&fit=crop&q=80',
            store_name: 'EnergyHub Bulawayo',
            stock_quantity: 20
        }
    ];

    const defaultNewArrivals = [
        {
            id: 'new-1',
            title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
            category: 'Electronics',
            brand: 'Sony',
            price_cents: 34900,
            badge: '✨ JUST LANDED',
            image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
            store_name: 'AudioTech Express',
            stock_quantity: 7
        },
        {
            id: 'new-2',
            title: 'Anker 737 Power Bank (PowerCore 24K) 140W Fast Charge',
            category: 'Electronics',
            brand: 'Anker',
            price_cents: 13500,
            badge: '🆕 NEW IN STORE',
            image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80',
            store_name: 'GadgetZone Harare',
            stock_quantity: 15
        },
        {
            id: 'new-3',
            title: 'Makita 18V LXT Lithium-Ion Brushless Angle Grinder Kit',
            category: 'Home & Hardware',
            brand: 'Makita',
            price_cents: 17500,
            badge: '✨ FRESH INVENTORY',
            image_url: 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600&auto=format&fit=crop&q=80',
            store_name: 'Hardware Hub',
            stock_quantity: 9
        },
        {
            id: 'new-4',
            title: 'Samsung Galaxy Watch 6 Classic 47mm LTE',
            category: 'Electronics',
            brand: 'Samsung',
            price_cents: 29900,
            badge: '🆕 FRESH ARRIVAL',
            image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
            store_name: 'Galaxy Store ZW',
            stock_quantity: 6
        }
    ];

    // Compute dynamic promotions from real products
    const promoItems = useMemo(() => {
        if (!products || products.length === 0) return defaultPromos;

        // Find products with prices and photos
        const candidateItems = products.filter(p => (p.price_cents || 0) > 0 && p.image_url);

        if (candidateItems.length < 2) return defaultPromos;

        // Select up to 4 featured products for promotions
        const selected = candidateItems.slice(0, 4).map((p, idx) => {
            const discounts = [20, 15, 25, 18];
            const discPercent = discounts[idx % discounts.length];
            const originalPrice = Math.round(p.price_cents * (1 + discPercent / 100));
            return {
                ...p,
                original_price_cents: originalPrice,
                discount_percent: discPercent,
                badge: `🔥 -${discPercent}% PROMO DEAL`,
                store_name: p.shop_name || 'Verified Merchant Store'
            };
        });

        return selected;
    }, [products]);

    // Compute dynamic new arrivals from real products (sorted newest first)
    const newArrivalItems = useMemo(() => {
        if (!products || products.length === 0) return defaultNewArrivals;

        const candidateItems = [...products]
            .filter(p => (p.price_cents || 0) > 0 && p.image_url)
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        if (candidateItems.length < 2) return defaultNewArrivals;

        const badges = ['✨ NEW ARRIVAL', '🆕 JUST LISTED', '⚡ FRESH STOCK', '🌟 RECENT ADDITION'];
        return candidateItems.slice(0, 4).map((p, idx) => ({
            ...p,
            badge: badges[idx % badges.length],
            store_name: p.shop_name || 'Verified Merchant Store'
        }));
    }, [products]);

    const activeList = activeTab === 'promotions' ? promoItems : newArrivalItems;
    const currentItem = activeList[activeIndex] || activeList[0] || defaultPromos[0];

    // Reset index when tab switches
    useEffect(() => {
        setActiveIndex(0);
    }, [activeTab]);

    // Auto-advance carousel every 6 seconds unless hovered
    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % activeList.length);
        }, 5500);
        return () => clearInterval(timer);
    }, [isHovered, activeList.length]);

    const scrollToCatalog = () => {
        const catalogEl = document.getElementById('storefront-catalog') || document.querySelector('.storefront-layout');
        if (catalogEl) {
            catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleExploreAllDeals = () => {
        if (setSearchTerm) setSearchTerm('');
        if (setSelectedCategory) setSelectedCategory('All');
        scrollToCatalog();
    };

    const handleExploreNewArrivals = () => {
        if (setSearchTerm) setSearchTerm('');
        if (setSelectedCategory) setSelectedCategory('All');
        if (onSelectSort) onSelectSort('newest');
        scrollToCatalog();
    };

    const handleCardQuickView = (item, e) => {
        if (e) e.stopPropagation();
        if (onQuickView) {
            onQuickView(item);
        } else {
            scrollToCatalog();
        }
    };

    const handleCardAddToCart = (item, e) => {
        if (e) e.stopPropagation();
        if (onAddToCart) {
            onAddToCart(item);
            setJustAddedId(item.id);
            setTimeout(() => setJustAddedId(null), 1500);
        } else if (onQuickView) {
            onQuickView(item);
        }
    };

    const nextSlide = () => {
        setActiveIndex(prev => (prev + 1) % activeList.length);
    };

    const prevSlide = () => {
        setActiveIndex(prev => (prev - 1 + activeList.length) % activeList.length);
    };

    // Formatter helpers
    const formatUSD = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
    const formatZiG = (cents) => {
        const usd = (cents || 0) / 100;
        const rate = parseFloat(zigRate || 25.5);
        return `ZiG ${(usd * rate).toFixed(2)}`;
    };

    return (
        <section 
            className="hero-wrapper" 
            aria-label="Promotions and New Arrivals Showcase"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Ambient Lighting Orbs */}
            <div className="hero-glow-orb-1" aria-hidden="true" />
            <div className="hero-glow-orb-2" aria-hidden="true" />

            <div className="hero-grid">
                {/* Left Column: Clean Copy & Action Controls */}
                <div className="hero-content">
                    {/* Top Segmented Mode Switcher */}
                    <div className="hero-mode-tabs" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'promotions'}
                            onClick={() => setActiveTab('promotions')}
                            className={`hero-mode-tab ${activeTab === 'promotions' ? 'active-promo' : ''}`}
                        >
                            <span>🔥</span>
                            <span>Promotions &amp; Deals</span>
                            <span className="hero-tab-badge">Up to 25% Off</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'new_arrivals'}
                            onClick={() => setActiveTab('new_arrivals')}
                            className={`hero-mode-tab ${activeTab === 'new_arrivals' ? 'active-new' : ''}`}
                        >
                            <span>✨</span>
                            <span>New Arrivals</span>
                            <span className="hero-tab-badge">Just Listed</span>
                        </button>
                    </div>

                    {/* Clean Status Pill */}
                    <div className="hero-pill">
                        <span className="hero-pill-dot" />
                        <span>
                            {activeTab === 'promotions' 
                                ? '🇿🇼 Featured Merchant Deals & Discounts' 
                                : '🇿🇼 Fresh Zimbabwe Inventory • Direct From Stores'}
                        </span>
                        <span style={{ opacity: 0.35 }}>•</span>
                        <span style={{ color: 'var(--success)', fontWeight: '700' }}>
                            1 USD = ZiG {parseFloat(zigRate || 25.5).toFixed(2)}
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="hero-title">
                        {activeTab === 'promotions' ? (
                            <>
                                Limited-Time Deals &amp;{' '}
                                <span className="hero-title-gradient">Verified Promotions.</span>
                            </>
                        ) : (
                            <>
                                Fresh Arrivals &amp;{' '}
                                <span className="hero-title-gradient">Newly Listed Products.</span>
                            </>
                        )}
                    </h1>

                    {/* Subtitle */}
                    <p className="hero-description">
                        {activeTab === 'promotions'
                            ? 'Discover handpicked deals from verified merchants across Harare, Bulawayo, and nationwide. Every purchase is backed by 100% escrow protection and seamless dual-currency checkout.'
                            : 'Explore the latest catalog items added this week by trusted local suppliers, hardware distributors, and tech stores across Zimbabwe.'}
                    </p>

                    {/* Reassurance Tags */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="hero-trust-chip">🛡️ 100% Escrow Protection</span>
                        <span className="hero-trust-chip">⚡ Dual Currency (USD &amp; ZiG)</span>
                        <span className="hero-trust-chip">🚚 Local Dispatch</span>
                    </div>

                    {/* Action Buttons & Carousel Nav Row */}
                    <div className="hero-actions-row">
                        {activeTab === 'promotions' ? (
                            <button
                                type="button"
                                onClick={handleExploreAllDeals}
                                className="btn-primary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '13px 24px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '12px',
                                    boxShadow: '0 6px 18px rgba(239, 68, 68, 0.35)'
                                }}
                            >
                                <span>🔥</span>
                                <span>Explore All Promotional Deals</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleExploreNewArrivals}
                                className="btn-primary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '13px 24px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    borderRadius: '12px',
                                    boxShadow: '0 6px 18px rgba(59, 130, 246, 0.35)'
                                }}
                            >
                                <span>✨</span>
                                <span>Browse All New Arrivals</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={(e) => handleCardQuickView(currentItem, e)}
                            className="btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '13px 20px',
                                fontSize: '13px',
                                fontWeight: '600',
                                borderRadius: '12px'
                            }}
                        >
                            <span>👁️</span>
                            <span>Quick View Spotlight Item</span>
                        </button>

                        {/* Carousel Arrows */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                            <button
                                type="button"
                                onClick={prevSlide}
                                aria-label="Previous item"
                                className="hero-arrow-btn"
                            >
                                ‹
                            </button>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', padding: '0 4px' }}>
                                {activeIndex + 1} / {activeList.length}
                            </span>
                            <button
                                type="button"
                                onClick={nextSlide}
                                aria-label="Next item"
                                className="hero-arrow-btn"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Clean Interactive Spotlight Card */}
                <div className="hero-spotlight-card animate-fade-in" key={`${activeTab}-${currentItem.id}`}>
                    {/* Spotlight Header */}
                    <div className="hero-card-header">
                        <span className="hero-card-category">
                            {currentItem.category || 'Featured'}
                        </span>
                        <span className={`hero-card-badge ${activeTab === 'promotions' ? 'badge-deal' : 'badge-new'}`}>
                            {currentItem.badge}
                        </span>
                    </div>

                    {/* Spotlight Image Container */}
                    <div 
                        className="hero-card-image-wrap"
                        onClick={(e) => handleCardQuickView(currentItem, e)}
                        title="Click to view details"
                    >
                        {currentItem.image_url ? (
                            <img
                                src={currentItem.image_url}
                                alt={currentItem.title}
                                className="hero-card-img"
                                loading="eager"
                            />
                        ) : (
                            <div className="hero-card-img-placeholder">
                                📦
                            </div>
                        )}
                        <div className="hero-card-hover-overlay">
                            <span>🔍 Click to View Details</span>
                        </div>
                    </div>

                    {/* Spotlight Product Details */}
                    <div className="hero-card-body">
                        <div className="hero-card-title-row">
                            <h3 
                                className="hero-card-title"
                                onClick={(e) => handleCardQuickView(currentItem, e)}
                                title={currentItem.title}
                            >
                                {currentItem.title}
                            </h3>
                            <div className="hero-card-store">
                                🏪 {currentItem.store_name || 'Verified Merchant Store'}
                                <span style={{ color: 'var(--success)' }}>✓</span>
                            </div>
                        </div>

                        {/* Pricing Block */}
                        <div className="hero-card-price-block">
                            <div className="hero-card-price-main">
                                {activeTab === 'promotions' && currentItem.original_price_cents && (
                                    <span className="hero-card-was-price">
                                        Was {formatUSD(currentItem.original_price_cents)}
                                    </span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span className="hero-card-price-now">
                                        {formatPrice ? formatPrice(currentItem.price_cents) : formatUSD(currentItem.price_cents)}
                                    </span>
                                    {activeTab === 'promotions' && currentItem.discount_percent && (
                                        <span className="hero-card-save-tag">
                                            Save {currentItem.discount_percent}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="hero-card-zig-price">
                                ≈ {formatZiG(currentItem.price_cents)}
                            </div>
                        </div>

                        {/* Actions on Card */}
                        <div className="hero-card-actions">
                            <button
                                type="button"
                                onClick={(e) => handleCardQuickView(currentItem, e)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: '10px 14px', fontSize: '13px', borderRadius: '10px' }}
                            >
                                Details
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleCardAddToCart(currentItem, e)}
                                className="btn-primary"
                                style={{ flex: 1.5, padding: '10px 16px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <span>{justAddedId === currentItem.id ? '✓' : '🛒'}</span>
                                <span>{justAddedId === currentItem.id ? 'Added!' : 'Add to Cart'}</span>
                            </button>
                        </div>

                        {/* Miniature Thumbnails Selector */}
                        <div className="hero-card-thumbnails">
                            {activeList.map((item, idx) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setActiveIndex(idx)}
                                    className={`hero-thumb-btn ${idx === activeIndex ? 'active-thumb' : ''}`}
                                    title={item.title}
                                >
                                    {item.image_url ? (
                                        <img src={item.image_url} alt="" />
                                    ) : (
                                        <span>📦</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Slim Reassurance Strip */}
            <div className="hero-reassurance-bar">
                <div className="hero-reassurance-item">
                    <span style={{ fontSize: '16px' }}>🛡️</span>
                    <div>
                        <strong>100% Escrow Protection</strong>
                        <span style={{ opacity: 0.7 }}> — Funds released after delivery inspection</span>
                    </div>
                </div>
                <div className="hero-reassurance-item">
                    <span style={{ fontSize: '16px' }}>⚡</span>
                    <div>
                        <strong>Dual Currency Settlement</strong>
                        <span style={{ opacity: 0.7 }}> — Pay in USD or ZiG via EcoCash, InnBucks &amp; Cash</span>
                    </div>
                </div>
                <div className="hero-reassurance-item">
                    <span style={{ fontSize: '16px' }}>🚚</span>
                    <div>
                        <strong>Nationwide Dispatch</strong>
                        <span style={{ opacity: 0.7 }}> — Harare, Bulawayo &amp; all regional centers</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
