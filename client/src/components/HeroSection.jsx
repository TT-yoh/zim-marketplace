// client/src/components/HeroSection.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';

// Fisher-Yates array shuffle helper
function shuffleArray(arr) {
    if (!arr || arr.length <= 1) return [...(arr || [])];
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

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
    const [shuffleSeed, setShuffleSeed] = useState(0);
    const [isShuffling, setIsShuffling] = useState(false);

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

    // Compute dynamic promotions from real products with auto-shuffling
    const promoItems = useMemo(() => {
        if (!products || products.length === 0) return defaultPromos;

        // Find products with prices and photos
        const candidateItems = products.filter(p => (p.price_cents || 0) > 0 && p.image_url);

        if (candidateItems.length < 2) return defaultPromos;

        // Separate products into priority tiers:
        // Tier 1: Admin Hero Spotlight pinned items
        const pinnedList = candidateItems.filter(p => p.is_featured_hero);
        // Tier 2: Vendor / Admin Promotional deals
        const promoList = candidateItems.filter(p => !p.is_featured_hero && p.is_promotion);
        // Tier 3: General candidate items
        const regularList = candidateItems.filter(p => !p.is_featured_hero && !p.is_promotion);

        // Auto-shuffle items within each tier so all participating stores receive fair rotating exposure
        const shuffledPinned = shuffleArray(pinnedList);
        const shuffledPromos = shuffleArray(promoList);
        const shuffledRegular = shuffleArray(regularList);

        // Merge in strict priority: Pinned first, then Promos, then general catalog items
        const mergedPool = [...shuffledPinned, ...shuffledPromos, ...shuffledRegular];

        // Select up to 6 products for the active hero carousel rotation
        const selected = mergedPool.slice(0, Math.min(6, mergedPool.length)).map((p, idx) => {
            const fallbackDiscounts = [20, 15, 25, 18, 30, 22];
            const discPercent = (p.promo_discount_percent && p.promo_discount_percent > 0)
                ? p.promo_discount_percent
                : (p.is_promotion ? 15 : fallbackDiscounts[idx % fallbackDiscounts.length]);
            const originalPrice = Math.round(p.price_cents * (1 + discPercent / 100));
            const badge = p.is_featured_hero
                ? `⭐ SPOTLIGHT DEAL -${discPercent}%`
                : `🔥 -${discPercent}% PROMO DEAL`;

            return {
                ...p,
                original_price_cents: originalPrice,
                discount_percent: discPercent,
                badge,
                store_name: p.shop_name || 'Verified Merchant Store'
            };
        });

        return selected;
    }, [products, shuffleSeed]);

    // Compute dynamic new arrivals from real products with auto-shuffling
    const newArrivalItems = useMemo(() => {
        if (!products || products.length === 0) return defaultNewArrivals;

        const candidateItems = [...products].filter(p => (p.price_cents || 0) > 0 && p.image_url);

        if (candidateItems.length < 2) return defaultNewArrivals;

        // Pinned items
        const pinnedList = candidateItems.filter(p => p.is_featured_hero);
        // Non-pinned items sorted by recency
        const newestList = candidateItems
            .filter(p => !p.is_featured_hero)
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        // Take top 25 newest items and shuffle them so recent catalog items rotate dynamically
        const recentPool = newestList.slice(0, 25);
        const shuffledRecent = shuffleArray(recentPool);

        const mergedPool = [...shuffleArray(pinnedList), ...shuffledRecent];
        const selected = mergedPool.slice(0, Math.min(6, mergedPool.length));

        const badges = ['✨ NEW ARRIVAL', '🆕 JUST LISTED', '⚡ FRESH STOCK', '🌟 RECENT ADDITION', '🔥 TOP PICK', '💎 DISCOVERY'];
        return selected.map((p, idx) => ({
            ...p,
            badge: p.is_featured_hero ? '⭐ HERO SPOTLIGHT' : badges[idx % badges.length],
            store_name: p.shop_name || 'Verified Merchant Store'
        }));
    }, [products, shuffleSeed]);

    const activeList = activeTab === 'promotions' ? promoItems : newArrivalItems;
    const currentItem = activeList[activeIndex] || activeList[0] || defaultPromos[0];

    // Reset index when tab switches
    useEffect(() => {
        setActiveIndex(0);
    }, [activeTab]);

    // Auto-advance carousel every 5.5s, auto-shuffling pool on completing full cycle
    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setActiveIndex(prev => {
                const next = prev + 1;
                if (next >= activeList.length) {
                    // Full loop completed - trigger auto-shuffle to cycle in fresh items!
                    setShuffleSeed(s => s + 1);
                    return 0;
                }
                return next;
            });
        }, 5500);
        return () => clearInterval(timer);
    }, [isHovered, activeList.length]);

    const handleManualShuffle = (e) => {
        if (e) e.stopPropagation();
        setIsShuffling(true);
        setActiveIndex(0);
        setShuffleSeed(s => s + 1);
        setTimeout(() => setIsShuffling(false), 500);
    };

    const nextSlide = () => {
        setActiveIndex(prev => {
            const next = prev + 1;
            if (next >= activeList.length) {
                setShuffleSeed(s => s + 1);
                return 0;
            }
            return next;
        });
    };

    const prevSlide = () => {
        setActiveIndex(prev => (prev - 1 + activeList.length) % activeList.length);
    };

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

    // Touch swipe gesture handlers for mobile & tablet
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);

    const handleTouchStart = (e) => {
        setTouchEndX(null);
        if (e.targetTouches && e.targetTouches.length > 0) {
            setTouchStartX(e.targetTouches[0].clientX);
        }
    };

    const handleTouchMove = (e) => {
        if (e.targetTouches && e.targetTouches.length > 0) {
            setTouchEndX(e.targetTouches[0].clientX);
        }
    };

    const handleTouchEnd = () => {
        if (touchStartX === null || touchEndX === null) return;
        const diff = touchStartX - touchEndX;
        if (diff > 45) {
            nextSlide();
        } else if (diff < -45) {
            prevSlide();
        }
        setTouchStartX(null);
        setTouchEndX(null);
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
                        <span style={{ opacity: 0.35 }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: '700' }}>
                            <span style={{ display: 'inline-block', transform: isShuffling ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }}>🔀</span>
                            <span>Auto-Rotating</span>
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

                        {/* Carousel Arrows & Shuffle Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                            <button
                                type="button"
                                onClick={handleManualShuffle}
                                aria-label="Shuffle showcase products"
                                className="hero-arrow-btn"
                                title="Shuffle featured items"
                                style={{
                                    width: 'auto',
                                    padding: '0 10px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    borderColor: isShuffling ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)',
                                    color: isShuffling ? 'var(--accent-primary)' : 'var(--text-secondary)'
                                }}
                            >
                                <span style={{ display: 'inline-block', transform: isShuffling ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }}>🔀</span>
                                <span>Shuffle</span>
                            </button>

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

                {/* Right Column: Interactive Sliding Product Carousel Showcase */}
                <div className="hero-slider-container">
                    <div 
                        className="hero-slider-viewport"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Floating Navigation Arrows on Card */}
                        <div className="hero-slide-nav-overlay" aria-hidden="true">
                            <button
                                type="button"
                                onClick={prevSlide}
                                aria-label="Previous slide"
                                className="hero-slide-arrow"
                                title="Previous product"
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={nextSlide}
                                aria-label="Next slide"
                                className="hero-slide-arrow"
                                title="Next product"
                            >
                                ›
                            </button>
                        </div>

                        {/* Continuous Sliding Track */}
                        <div 
                            className="hero-slider-track"
                            style={{
                                transform: `translateX(-${activeIndex * 100}%)`
                            }}
                        >
                            {activeList.map((item, idx) => (
                                <div className="hero-slider-slide" key={`${activeTab}-${item.id}-${idx}`}>
                                    <div className="hero-spotlight-card">
                                        {/* Spotlight Header */}
                                        <div className="hero-card-header">
                                            <span className="hero-card-category">
                                                {item.category || 'Featured'}
                                            </span>
                                            <span className={`hero-card-badge ${activeTab === 'promotions' ? 'badge-deal' : 'badge-new'}`}>
                                                {item.badge}
                                            </span>
                                        </div>

                                        {/* Spotlight Image Container */}
                                        <div 
                                            className="hero-card-image-wrap"
                                            onClick={(e) => handleCardQuickView(item, e)}
                                            title="Click to view details"
                                        >
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    className="hero-card-img"
                                                    loading={idx <= 1 ? "eager" : "lazy"}
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
                                                    onClick={(e) => handleCardQuickView(item, e)}
                                                    title={item.title}
                                                >
                                                    {item.title}
                                                </h3>
                                                <div className="hero-card-store">
                                                    🏪 {item.store_name || 'Verified Merchant Store'}
                                                    <span style={{ color: 'var(--success)' }}>✓</span>
                                                </div>
                                            </div>

                                            {/* Pricing Block */}
                                            <div className="hero-card-price-block">
                                                <div className="hero-card-price-main">
                                                    {activeTab === 'promotions' && item.original_price_cents && (
                                                        <span className="hero-card-was-price">
                                                            Was {formatUSD(item.original_price_cents)}
                                                        </span>
                                                    )}
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                        <span className="hero-card-price-now">
                                                            {formatPrice ? formatPrice(item.price_cents) : formatUSD(item.price_cents)}
                                                        </span>
                                                        {activeTab === 'promotions' && item.discount_percent && (
                                                            <span className="hero-card-save-tag">
                                                                Save {item.discount_percent}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="hero-card-zig-price">
                                                    ≈ {formatZiG(item.price_cents)}
                                                </div>
                                            </div>

                                            {/* Actions on Card */}
                                            <div className="hero-card-actions">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCardQuickView(item, e)}
                                                    className="btn-secondary"
                                                    style={{ flex: 1, padding: '10px 14px', fontSize: '13px', borderRadius: '10px' }}
                                                >
                                                    Details
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCardAddToCart(item, e)}
                                                    className="btn-primary"
                                                    style={{ flex: 1.5, padding: '10px 16px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                >
                                                    <span>{justAddedId === item.id ? '✓' : '🛒'}</span>
                                                    <span>{justAddedId === item.id ? 'Added!' : 'Add to Cart'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Miniature Thumbnails Selector */}
                    <div className="hero-card-thumbnails">
                        {activeList.map((item, idx) => (
                            <button
                                key={`thumb-${item.id}-${idx}`}
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

                    {/* Dynamic Slide Pagination Dots */}
                    <div className="hero-slider-dots">
                        {activeList.map((item, idx) => (
                            <button
                                key={`dot-${item.id}-${idx}`}
                                type="button"
                                onClick={() => setActiveIndex(idx)}
                                aria-label={`Go to slide ${idx + 1}`}
                                className={`hero-slider-dot ${idx === activeIndex ? 'active-dot' : ''}`}
                            />
                        ))}
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
