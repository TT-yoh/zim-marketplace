// client/src/components/HeroSection.jsx
import React, { useState, useRef, useEffect } from 'react';

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
    onOpenQuotation
}) {
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef(null);

    // Filter autocomplete suggestions when user types >= 2 characters
    const suggestions = searchTerm.trim().length >= 2
        ? products
            .filter(p => {
                const term = searchTerm.toLowerCase();
                return (
                    (p.title && p.title.toLowerCase().includes(term)) ||
                    (p.item_no && p.item_no.toLowerCase().includes(term)) ||
                    (p.brand && p.brand.toLowerCase().includes(term)) ||
                    (p.category && p.category.toLowerCase().includes(term))
                );
            })
            .slice(0, 5)
        : [];

    const scrollToCatalog = () => {
        const catalogEl = document.getElementById('storefront-catalog') || document.querySelector('.storefront-layout');
        if (catalogEl) {
            catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSelectTag = (tag) => {
        if (tag.type === 'category') {
            if (setSelectedCategory) setSelectedCategory(tag.value);
            if (setSearchTerm) setSearchTerm('');
        } else if (tag.type === 'search') {
            if (setSearchTerm) setSearchTerm(tag.value);
        }
        scrollToCatalog();
    };

    const handleSuggestionClick = (title) => {
        if (setSearchTerm) setSearchTerm(title);
        setIsFocused(false);
        scrollToCatalog();
    };

    const trendingTags = [
        { label: '☀️ Solar & Inverters', type: 'category', value: 'Solar & Energy' },
        { label: '🔋 Car Batteries', type: 'search', value: 'Battery' },
        { label: '📱 Phones & Tech', type: 'category', value: 'Electronics' },
        { label: '🚜 Agriculture', type: 'category', value: 'Agriculture' },
        { label: '🧱 Cement & Tools', type: 'category', value: 'Home & Hardware' },
        { label: '🚗 Auto Parts', type: 'category', value: 'Auto Parts' },
        { label: '👗 Fashion', type: 'category', value: 'Fashion' },
    ];

    const totalProductCount = products && products.length > 0 ? products.length : 4305;

    return (
        <section className="hero-wrapper" aria-label="ZimMarket Hero Banner">
            {/* Ambient Lighting Orbs */}
            <div className="hero-glow-orb-1" aria-hidden="true" />
            <div className="hero-glow-orb-2" aria-hidden="true" />

            <div className="hero-grid">
                {/* Left Column: Headline, Omnibar, Tags & CTAs */}
                <div className="hero-content">
                    {/* Top Trust Pill */}
                    <div className="hero-pill">
                        <span className="hero-pill-dot" />
                        <span>🇿🇼 Zimbabwe's #1 Direct Marketplace</span>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{ color: 'var(--success)', fontWeight: '700' }}>
                            1 USD = ZiG {parseFloat(zigRate || 25.5).toFixed(2)}
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="hero-title">
                        The Direct Marketplace for Zimbabwe.{' '}
                        <span className="hero-title-gradient">
                            Trade Smarter. Pay Securely.
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="hero-description">
                        Connect directly with verified local merchants across Harare, Bulawayo, and nationwide.
                        Browse {totalProductCount.toLocaleString()}+ authentic products with live USD & ZiG pricing,
                        EcoCash & WhatsApp settlement, and guaranteed buyer escrow protection.
                    </p>

                    {/* Smart Omnibar Search Box */}
                    <div className="hero-search-box" ref={searchRef}>
                        <span style={{ fontSize: '18px', color: 'var(--text-muted)', marginLeft: '4px' }}>🔍</span>

                        {categories && categories.length > 0 && setSelectedCategory && (
                            <select
                                className="hero-category-select"
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    scrollToCatalog();
                                }}
                                title="Filter by Category"
                            >
                                <option value="All">All Categories</option>
                                {categories.map((cat, i) => (
                                    <option key={i} value={cat}>{cat}</option>
                                ))}
                            </select>
                        )}

                        <input
                            type="text"
                            className="hero-search-input"
                            placeholder={`Search ${totalProductCount.toLocaleString()}+ products by name, SKU, or brand...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setIsFocused(false);
                                    scrollToCatalog();
                                }
                            }}
                        />

                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                title="Clear search"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '26px',
                                    height: '26px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    fontSize: '12px',
                                    padding: 0
                                }}
                            >
                                ✕
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={scrollToCatalog}
                            className="btn-primary"
                            style={{
                                padding: '10px 20px',
                                fontSize: '14px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                            }}
                        >
                            Search
                        </button>

                        {/* Autocomplete Dropdown */}
                        {isFocused && suggestions.length > 0 && (
                            <div
                                className="glass-panel animate-fade-in-up"
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    left: 0,
                                    right: 0,
                                    zIndex: 500,
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    overflow: 'hidden',
                                    boxShadow: '0 16px 36px rgba(0,0,0,0.55)'
                                }}
                            >
                                {suggestions.map((item) => (
                                    <div
                                        key={item.id}
                                        onMouseDown={() => handleSuggestionClick(item.title)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.title}
                                                style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px' }}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                backgroundColor: 'var(--bg-tertiary)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '20px'
                                            }}>
                                                📦
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {item.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {item.category || 'Product'} {item.item_no ? `• SKU: ${item.item_no}` : ''}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--accent-primary)' }}>
                                            {formatPrice ? formatPrice(item.price_cents) : `$${((item.price_cents || 0) / 100).toFixed(2)}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Trending Quick Jump Tags */}
                    <div className="hero-trending-tags">
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginRight: '4px' }}>
                            Popular:
                        </span>
                        {trendingTags.map((tag, i) => (
                            <button
                                key={i}
                                type="button"
                                className="hero-tag-btn"
                                onClick={() => handleSelectTag(tag)}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="hero-actions-row">
                        <button
                            type="button"
                            onClick={scrollToCatalog}
                            className="btn-primary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                fontSize: '14px',
                                borderRadius: '12px'
                            }}
                        >
                            <span>🛍️</span>
                            <span>Explore Catalog ({totalProductCount.toLocaleString()}+ Items)</span>
                        </button>

                        {isVendor && setCurrentView && (
                            <button
                                type="button"
                                onClick={() => setCurrentView('vendor-inventory')}
                                className="btn-secondary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 20px',
                                    fontSize: '14px',
                                    borderRadius: '12px'
                                }}
                            >
                                <span>📦</span>
                                <span>My Vendor Dashboard</span>
                            </button>
                        )}

                        {onOpenQuotation && (
                            <button
                                type="button"
                                onClick={onOpenQuotation}
                                className="btn-secondary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 18px',
                                    fontSize: '13px',
                                    borderRadius: '12px',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <span>📄</span>
                                <span>Pro-Forma Tax Quote</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column: Visual 3D Showcase & Floating Trust Badges */}
                <div className="hero-visual-card">
                    <img
                        src="/zimmarket_hero_banner.jpg"
                        alt="ZimMarket - The Future of African Ecommerce"
                        className="hero-visual-image"
                        loading="eager"
                    />

                    {/* Floating Trust Badge: Escrow Protection */}
                    <div className="hero-floating-badge badge-top-left">
                        <span style={{ fontSize: '16px' }}>🛡️</span>
                        <div>
                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>100% Escrow Protected</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>Funds held until delivery</div>
                        </div>
                    </div>

                    {/* Floating Trust Badge: Dual Currency */}
                    <div className="hero-floating-badge badge-bottom-right">
                        <span style={{ fontSize: '16px' }}>⚡</span>
                        <div>
                            <div style={{ color: 'var(--success)', fontSize: '12px', fontWeight: '700' }}>USD & ZiG Ready</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>Instant RBZ rate conversion</div>
                        </div>
                    </div>

                    {/* Floating Trust Badge: Harare & Nationwide Delivery */}
                    <div className="hero-floating-badge badge-bottom-left">
                        <span style={{ fontSize: '16px' }}>🚚</span>
                        <div>
                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>Harare & Nationwide</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>Fast dispatch & pickup</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom 4-Pillar Features Bar */}
            <div className="hero-features-bar">
                <div className="hero-feature-item">
                    <div className="hero-feature-icon" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
                        📦
                    </div>
                    <div>
                        <div className="hero-feature-title">{totalProductCount.toLocaleString()}+ Verified Products</div>
                        <div className="hero-feature-desc">Authentic stock from vetted Zimbabwe merchants</div>
                    </div>
                </div>

                <div className="hero-feature-item">
                    <div className="hero-feature-icon" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
                        🛡️
                    </div>
                    <div>
                        <div className="hero-feature-title">Guaranteed Buyer Escrow</div>
                        <div className="hero-feature-desc">Funds released only after you inspect your order</div>
                    </div>
                </div>

                <div className="hero-feature-item">
                    <div className="hero-feature-icon" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}>
                        💱
                    </div>
                    <div>
                        <div className="hero-feature-title">Dual Currency (USD & ZiG)</div>
                        <div className="hero-feature-desc">Live exchange rate with 1-click currency toggle</div>
                    </div>
                </div>

                <div className="hero-feature-item">
                    <div className="hero-feature-icon" style={{ borderColor: 'rgba(168, 85, 247, 0.3)', color: '#c084fc' }}>
                        💬
                    </div>
                    <div>
                        <div className="hero-feature-title">WhatsApp & EcoCash Trade</div>
                        <div className="hero-feature-desc">Direct seller negotiations & instant invoicing</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
