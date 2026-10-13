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
    vendorProfiles = {},
    onSelectStore,
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

    // Dynamic store resolver from registered merchants within the app
    const getStoreInfo = (p) => {
        if (!p) return { name: 'Verified Store in App', isVerified: true, shopId: null };
        const v = vendorProfiles?.[p.shop_id];
        return {
            name: v?.store_name || p.shop_name || 'Verified Store in App',
            isVerified: v?.is_verified ?? p.is_verified ?? true,
            shopId: p.shop_id || v?.id || null
        };
    };

    // Authentic fallback items mapped directly from registered stores within the app
    const defaultPromos = [
        {
            id: 'promo-app-1',
            title: 'EAZY TOOLS SUBPUMP 4SDM2/9-0.37kw/0.5hp',
            category: 'Solar & Energy',
            brand: 'EAZY TOOLS',
            price_cents: 10606, // $106.06
            original_price_cents: 12500, // $125.00
            discount_percent: 15,
            badge: '🔥 FLASH DEAL -15%',
            image_url: 'https://qelpgmrbohsdkwvcsnov.supabase.co/storage/v1/object/public/product-images/ff9b7c21-72ee-4517-8f93-bdbe79717849/1791034918965_ga6rh.jpg',
            store_name: 'ttishmael78',
            shop_id: 'ff9b7c21-72ee-4517-8f93-bdbe79717849',
            is_verified: true,
            stock_quantity: 12
        },
        {
            id: 'promo-app-2',
            title: 'GENERATOR 2.2KW PS2200',
            category: 'Home & Hardware',
            brand: 'PowerPro',
            price_cents: 18182, // $181.82
            original_price_cents: 22000, // $220.00
            discount_percent: 17,
            badge: '⚡ SPECIAL OFFER -17%',
            image_url: 'https://qelpgmrbohsdkwvcsnov.supabase.co/storage/v1/object/public/product-images/ff9b7c21-72ee-4517-8f93-bdbe79717849/1791034918965_ga6rh.jpg',
            store_name: 'ttishmael78',
            shop_id: 'ff9b7c21-72ee-4517-8f93-bdbe79717849',
            is_verified: true,
            stock_quantity: 8
        },
        {
            id: 'promo-app-3',
            title: 'EXHAUST 5.5KW (PETROL)',
            category: 'Auto Parts',
            brand: 'MMS Auto',
            price_cents: 1515, // $15.15
            original_price_cents: 1890, // $18.90
            discount_percent: 20,
            badge: '💥 20% OFF DEALS',
            image_url: 'https://qelpgmrbohsdkwvcsnov.supabase.co/storage/v1/object/public/product-images/ff9b7c21-72ee-4517-8f93-bdbe79717849/1791035028447_h6auc.jpg',
            store_name: 'MMS',
            shop_id: 'a223a428-0469-49df-a49f-f4528bd0d6de',
            is_verified: true,
            stock_quantity: 24
        },
        {
            id: 'promo-app-4',
            title: 'AVR PETROL 2KW AUTOMATIC VOLTAGE REGULATOR',
            category: 'Solar & Energy',
            brand: 'EAZY TOOLS',
            price_cents: 909, // $9.09
            original_price_cents: 1150, // $11.50
            discount_percent: 21,
            badge: '🔥 SAVE ON ESSENTIALS',
            image_url: 'https://qelpgmrbohsdkwvcsnov.supabase.co/storage/v1/object/public/product-images/ff9b7c21-72ee-4517-8f93-bdbe79717849/1791035012646_6lswz.jpg',
            store_name: 'ttishmael78',
            shop_id: 'ff9b7c21-72ee-4517-8f93-bdbe79717849',
            is_verified: true,
            stock_quantity: 30
        }
    ];

    const defaultNewArrivals = [
        {
            id: 'new-app-1',
            title: 'EAZY TOOLS SUBPUMP 4SDM2/9-0.37kw/0.5hp',
            category: 'Solar & Energy',
            brand: 'EAZY TOOLS',
            price_cents: 10606,
            badge: '✨ JUST LANDED',
            image_url: 'https://qelpgmrbohsdkwvcsnov.supabase.co/storage/v1/object/public/product-images/ff9b7c21-72ee-4517-8f93-bdbe79717849/1791034918965_ga6rh.jpg',
            store_name: 'ttishmael78',
            shop_id: 'ff9b7c21-72ee-4517-8f93-bdbe79717849',
            is_verified: true,
            stock_quantity: 12
        },
        {
            id: 'new-app-2',
            title: 'GENERATOR 2.2KW PS2200',
            category: 'Home & Hardware',
            brand: 'PowerPro',
            price_cents: 18182,
            badge: '🆕 FRESH ARRIVAL',
            image_url: 'https://qelpgmrbohsdkwvcsnov.supabase.co/storage/v1/object/public/product-images/ff9b7c21-72ee-4517-8f93-bdbe79717849/1791034918965_ga6rh.jpg',
            store_name: 'ttishmael78',
            shop_id: 'ff9b7c21-72ee-4517-8f93-bdbe79717849',
            is_verified: true,
            stock_quantity: 8
        },
        {
            id: 'new-app-3',
            title: 'AIR FILTER 2.2 KW',
            category: 'Auto Parts',
            brand: 'MMS Auto',
            price_cents: 909,
            badge: '⚡ FRESH STOCK',
            image_url: 'https://qelpgmrbohsdkwvcsnov.supabase.co/storage/v1/object/public/product-images/ff9b7c21-72ee-4517-8f93-bdbe79717849/1791035028447_h6auc.jpg',
            store_name: 'MMS',
            shop_id: 'a223a428-0469-49df-a49f-f4528bd0d6de',
            is_verified: true,
            stock_quantity: 15
        },
        {
            id: 'new-app-4',
            title: 'IMPELLER WP20/WP30 HEAVY DUTY',
            category: 'Agriculture',
            brand: 'MMS Ag',
            price_cents: 505,
            badge: '🆕 NEW IN STORE',
            image_url: 'https://qelpgmrbohsdkwvcsnov.supabase.co/storage/v1/object/public/product-images/ff9b7c21-72ee-4517-8f93-bdbe79717849/1791035033249_4esgw.jpg',
            store_name: 'ttishmael78',
            shop_id: 'ff9b7c21-72ee-4517-8f93-bdbe79717849',
            is_verified: true,
            stock_quantity: 20
        }
    ];

    // Compute dynamic promotions from real products of stores in the app with auto-shuffling
    const promoItems = useMemo(() => {
        // Find products with prices and photos from stores within the app
        let candidateItems = (products || []).filter(p => (p.price_cents || 0) > 0 && p.image_url);

        // If not enough items have uploaded photos, fall back to any priced items from the app's stores
        if (candidateItems.length < 2) {
            candidateItems = (products || []).filter(p => (p.price_cents || 0) > 0);
        }

        if (candidateItems.length === 0) return defaultPromos;

        // Separate products into priority tiers:
        // Tier 1: Admin Hero Spotlight pinned items
        const pinnedList = candidateItems.filter(p => p.is_featured_hero);
        // Tier 2: Vendor / Admin Promotional deals
        const promoList = candidateItems.filter(p => !p.is_featured_hero && p.is_promotion);
        // Tier 3: General candidate items from registered stores in the app
        const regularList = candidateItems.filter(p => !p.is_featured_hero && !p.is_promotion);

        // Auto-shuffle items within each tier so all participating stores receive fair rotating exposure
        const shuffledPinned = shuffleArray(pinnedList);
        const shuffledPromos = shuffleArray(promoList);
        const shuffledRegular = shuffleArray(regularList);

        // Merge in strict priority: Pinned first, then Promos, then general catalog items
        const mergedPool = [...shuffledPinned, ...shuffledPromos, ...shuffledRegular];

        // Select up to 8 products for the active hero carousel rotation
        const selected = mergedPool.slice(0, Math.min(8, mergedPool.length)).map((p, idx) => {
            const fallbackDiscounts = [20, 15, 25, 18, 30, 22, 12, 10];
            const discPercent = (p.promo_discount_percent && p.promo_discount_percent > 0)
                ? p.promo_discount_percent
                : (p.is_promotion ? 15 : fallbackDiscounts[idx % fallbackDiscounts.length]);
            const originalPrice = Math.round(p.price_cents * (1 + discPercent / 100));
            const badge = p.is_featured_hero
                ? `⭐ SPOTLIGHT DEAL -${discPercent}%`
                : (p.is_promotion ? `🔥 -${discPercent}% STORE PROMO` : `⚡ -${discPercent}% SPECIAL DEAL`);

            const store = getStoreInfo(p);

            return {
                ...p,
                original_price_cents: originalPrice,
                discount_percent: discPercent,
                badge,
                store_name: store.name,
                is_verified: store.isVerified,
                shop_id: store.shopId
            };
        });

        return selected;
    }, [products, vendorProfiles, shuffleSeed]);

    // Compute dynamic new arrivals from real products from stores in the app with auto-shuffling
    const newArrivalItems = useMemo(() => {
        let candidateItems = (products || []).filter(p => (p.price_cents || 0) > 0 && p.image_url);
        if (candidateItems.length < 2) {
            candidateItems = (products || []).filter(p => (p.price_cents || 0) > 0);
        }

        if (candidateItems.length === 0) return defaultNewArrivals;

        // Pinned items
        const pinnedList = candidateItems.filter(p => p.is_featured_hero);
        // Non-pinned items sorted by recency
        const newestList = candidateItems
            .filter(p => !p.is_featured_hero)
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        // Take top 30 newest items and shuffle them so recent catalog items rotate dynamically
        const recentPool = newestList.slice(0, 30);
        const shuffledRecent = shuffleArray(recentPool);

        const mergedPool = [...shuffleArray(pinnedList), ...shuffledRecent];
        const selected = mergedPool.slice(0, Math.min(8, mergedPool.length));

        const badges = ['✨ NEW ARRIVAL', '🆕 JUST LISTED', '⚡ FRESH STOCK', '🌟 RECENT ADDITION', '🔥 TOP PICK', '💎 DISCOVERY'];
        return selected.map((p, idx) => {
            const store = getStoreInfo(p);
            return {
                ...p,
                badge: p.is_featured_hero ? '⭐ HERO SPOTLIGHT' : badges[idx % badges.length],
                store_name: store.name,
                is_verified: store.isVerified,
                shop_id: store.shopId
            };
        });
    }, [products, vendorProfiles, shuffleSeed]);

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
                                                <div 
                                                    className="hero-card-store"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onSelectStore && item.shop_id) {
                                                            onSelectStore(item.shop_id);
                                                        } else {
                                                            scrollToCatalog();
                                                        }
                                                    }}
                                                    title={item.shop_id ? `Explore all products from ${item.store_name}` : 'Visit Store in App'}
                                                >
                                                    <span>🏪</span>
                                                    <span style={{ fontWeight: '600' }}>{item.store_name || 'Verified Merchant Store'}</span>
                                                    {item.is_verified && <span style={{ color: 'var(--success)' }}>✓</span>}
                                                    <span className="hero-card-store-link">→ Store</span>
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
