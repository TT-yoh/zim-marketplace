// client/src/components/GlobalSearchModal.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';

export function GlobalSearchModal({
    isOpen,
    onClose,
    products = [],
    vendorProfiles = {},
    categories = [],
    formatPrice,
    currency = 'USD',
    onSelectProduct,
    onSelectStore,
    onApplySearch,
    onAddToCart
}) {
    const [query, setQuery] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
    const [activeHighlightIndex, setActiveHighlightIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState(() => {
        try {
            const saved = localStorage.getItem('zimmarket_recent_searches');
            return saved ? JSON.parse(saved) : ['Solar Inverter', 'EcoCash', 'Car Battery', 'Groceries', 'Samsung'];
        } catch (e) {
            return ['Solar', 'Batteries', 'Groceries'];
        }
    });

    const inputRef = useRef(null);
    const resultsContainerRef = useRef(null);

    // Popular trending searches in Zimbabwe
    const popularSearches = [
        '⚡ Solar Batteries',
        '🚗 Engine Oil 5W30',
        '📱 Smartphones',
        '🌽 Maize Meal 10kg',
        '💡 Inverter 5kW',
        '👕 School Uniforms',
        '🛠️ Hardware Tools',
        '👟 Running Shoes'
    ];

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveHighlightIndex(-1);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    // Handle global keyboard shortcut (ESC to close)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Save recent search
    const addRecentSearch = (term) => {
        const cleaned = term.trim();
        if (!cleaned) return;
        setRecentSearches(prev => {
            const next = [cleaned, ...prev.filter(t => t.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8);
            try {
                localStorage.setItem('zimmarket_recent_searches', JSON.stringify(next));
            } catch (e) {}
            return next;
        });
    };

    const removeRecentSearch = (term, e) => {
        e.stopPropagation();
        setRecentSearches(prev => {
            const next = prev.filter(t => t !== term);
            try {
                localStorage.setItem('zimmarket_recent_searches', JSON.stringify(next));
            } catch (e) {}
            return next;
        });
    };

    const clearAllRecent = (e) => {
        e.stopPropagation();
        setRecentSearches([]);
        try {
            localStorage.removeItem('zimmarket_recent_searches');
        } catch (e) {}
    };

    // Filter matching stores and products
    const { matchingStores, matchingProducts } = useMemo(() => {
        const clean = query.trim().toLowerCase();
        if (!clean) return { matchingStores: [], matchingProducts: [] };

        // 1. Stores matching query
        const stores = Object.entries(vendorProfiles)
            .map(([id, profile]) => ({ id, ...profile }))
            .filter(v => {
                const nameMatch = v.store_name?.toLowerCase().includes(clean);
                const bioMatch = v.bio?.toLowerCase().includes(clean);
                const addressMatch = v.business_address?.toLowerCase().includes(clean);
                return nameMatch || bioMatch || addressMatch;
            })
            .slice(0, 3);

        // 2. Products matching query & category
        const prods = products.filter(p => {
            if (selectedCategoryFilter !== 'All' && p.category !== selectedCategoryFilter) {
                return false;
            }
            const matchTitle = p.title?.toLowerCase().includes(clean);
            const matchItemNo = p.item_no?.toLowerCase().includes(clean);
            const matchBrand = p.brand?.toLowerCase().includes(clean);
            const matchCategory = p.category?.toLowerCase().includes(clean);
            const matchSubCategory = p.sub_category?.toLowerCase().includes(clean);
            const matchDesc = p.description?.toLowerCase().includes(clean);
            return matchTitle || matchItemNo || matchBrand || matchCategory || matchSubCategory || matchDesc;
        }).slice(0, 10);

        return { matchingStores: stores, matchingProducts: prods };
    }, [query, selectedCategoryFilter, products, vendorProfiles]);

    const allResultItems = useMemo(() => {
        const items = [];
        matchingStores.forEach(store => items.push({ type: 'store', data: store }));
        matchingProducts.forEach(prod => items.push({ type: 'product', data: prod }));
        return items;
    }, [matchingStores, matchingProducts]);

    // Handle Keyboard navigation
    const handleInputKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveHighlightIndex(prev => {
                const next = prev < allResultItems.length - 1 ? prev + 1 : 0;
                return next;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveHighlightIndex(prev => {
                const next = prev > 0 ? prev - 1 : allResultItems.length - 1;
                return next;
            });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeHighlightIndex >= 0 && activeHighlightIndex < allResultItems.length) {
                const item = allResultItems[activeHighlightIndex];
                if (item.type === 'store') {
                    handleStoreClick(item.data.id);
                } else {
                    handleProductClick(item.data);
                }
            } else if (query.trim()) {
                handleExecuteSearch(query);
            }
        }
    };

    const handleExecuteSearch = (term) => {
        addRecentSearch(term);
        if (onApplySearch) {
            onApplySearch(term);
        }
        onClose();
    };

    const handleProductClick = (product) => {
        addRecentSearch(product.title);
        if (onSelectProduct) {
            onSelectProduct(product);
        }
        onClose();
    };

    const handleStoreClick = (shopId) => {
        const store = vendorProfiles[shopId];
        if (store?.store_name) addRecentSearch(store.store_name);
        if (onSelectStore) {
            onSelectStore(shopId);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="global-search-overlay animate-fade-in"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(5, 7, 13, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                paddingTop: '60px',
                paddingLeft: '16px',
                paddingRight: '16px'
            }}
        >
            <div 
                className="global-search-modal glass-panel animate-scale-up"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '680px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.15)',
                    backgroundColor: 'var(--bg-secondary)',
                    maxHeight: '82vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Search Input Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    gap: '12px',
                    position: 'relative'
                }}>
                    <span style={{ fontSize: '20px', color: 'var(--accent-primary)', flexShrink: 0 }}>🔍</span>
                    <input 
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveHighlightIndex(-1);
                        }}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Search products, brands, or verified Zimbabwe stores..."
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            fontSize: '16px',
                            fontWeight: '500',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            padding: 0
                        }}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}
                        >
                            ✕
                        </button>
                    )}
                    <kbd style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        flexShrink: 0
                    }}>
                        ESC
                    </kbd>
                </div>

                {/* Category Pills Strip */}
                {categories && categories.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border)',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap'
                    }}>
                        <button
                            type="button"
                            onClick={() => setSelectedCategoryFilter('All')}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: selectedCategoryFilter === 'All' ? 'var(--accent-primary)' : 'transparent',
                                color: selectedCategoryFilter === 'All' ? '#fff' : 'var(--text-secondary)'
                            }}
                        >
                            All Categories
                        </button>
                        {categories.filter(c => c !== 'All').slice(0, 7).map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategoryFilter(cat)}
                                style={{
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedCategoryFilter === cat ? 'var(--accent-primary)' : 'transparent',
                                    color: selectedCategoryFilter === cat ? '#fff' : 'var(--text-secondary)'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Modal Body / Results */}
                <div 
                    ref={resultsContainerRef}
                    style={{
                        padding: '16px 20px',
                        overflowY: 'auto',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}
                >
                    {/* Default View (No Query Typed) */}
                    {!query.trim() && (
                        <>
                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                            🕒 Recent Searches
                                        </span>
                                        <button 
                                            onClick={clearAllRecent}
                                            style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {recentSearches.map(term => (
                                            <div
                                                key={term}
                                                onClick={() => {
                                                    setQuery(term);
                                                    handleExecuteSearch(term);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    borderRadius: '16px',
                                                    backgroundColor: 'var(--bg-tertiary)',
                                                    border: '1px solid var(--border)',
                                                    fontSize: '12.5px',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                className="search-chip-hover"
                                            >
                                                <span>{term}</span>
                                                <button
                                                    onClick={(e) => removeRecentSearch(term, e)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', fontSize: '11px' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Trending Searches in ZimMarket */}
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    🔥 Popular Searches
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {popularSearches.map(item => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => {
                                                const cleanText = item.replace(/^[^\w\s]+/, '').trim();
                                                setQuery(cleanText);
                                                handleExecuteSearch(cleanText);
                                            }}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '16px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                color: 'var(--accent-primary)',
                                                fontSize: '12.5px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Verified Stores Strip */}
                            {Object.keys(vendorProfiles).length > 0 && (
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                        🏪 Verified Stores On ZimMarket
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                        {Object.entries(vendorProfiles).slice(0, 4).map(([id, vendor]) => (
                                            <div
                                                key={id}
                                                onClick={() => handleStoreClick(id)}
                                                style={{
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    backgroundColor: 'var(--bg-tertiary)',
                                                    border: '1px solid var(--border)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px'
                                                }}
                                                className="search-store-card"
                                            >
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '8px',
                                                    backgroundColor: 'var(--accent-primary)',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '700',
                                                    fontSize: '14px',
                                                    flexShrink: 0
                                                }}>
                                                    {vendor.logo_url ? (
                                                        <img src={vendor.logo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} />
                                                    ) : (
                                                        vendor.store_name?.charAt(0)?.toUpperCase() || 'S'
                                                    )}
                                                </div>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vendor.store_name}</span>
                                                        {vendor.is_verified && <span style={{ color: 'var(--success)' }}>✔</span>}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        Verified Merchant
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Results View (When Query Typed) */}
                    {query.trim() && (
                        <>
                            {/* Matching Stores Section */}
                            {matchingStores.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                                        🏪 Matching Stores ({matchingStores.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {matchingStores.map((store, idx) => {
                                            const itemIndex = idx;
                                            const isHighlighted = activeHighlightIndex === itemIndex;
                                            return (
                                                <div
                                                    key={store.id}
                                                    onClick={() => handleStoreClick(store.id)}
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderRadius: '12px',
                                                        backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                                                        border: `1px solid ${isHighlighted ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '20px' }}>🏪</span>
                                                        <div>
                                                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>{store.store_name}</span>
                                                                {store.is_verified && <span style={{ color: 'var(--success)', fontSize: '12px' }}>✔ Verified</span>}
                                                            </div>
                                                            {store.business_address && (
                                                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                                                    📍 {store.business_address}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '8px' }}
                                                    >
                                                        Visit Store →
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Matching Products Section */}
                            {matchingProducts.length > 0 ? (
                                <div>
                                    <div style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        📦 Products ({matchingProducts.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {matchingProducts.map((prod, idx) => {
                                            const itemIndex = matchingStores.length + idx;
                                            const isHighlighted = activeHighlightIndex === itemIndex;
                                            const vendor = vendorProfiles[prod.shop_id];
                                            const priceDisplay = formatPrice ? formatPrice(prod.price_cents, currency, prod.shop_id) : `$${((prod.price_cents || 0) / 100).toFixed(2)}`;

                                            return (
                                                <div
                                                    key={prod.id}
                                                    onClick={() => handleProductClick(prod)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '10px 14px',
                                                        borderRadius: '12px',
                                                        backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                                                        border: `1px solid ${isHighlighted ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                        cursor: 'pointer',
                                                        gap: '12px'
                                                    }}
                                                >
                                                    {/* Product Thumbnail & Details */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            width: '44px',
                                                            height: '44px',
                                                            borderRadius: '8px',
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            overflow: 'hidden',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            border: '1px solid var(--border)'
                                                        }}>
                                                            {prod.image_url ? (
                                                                <img src={prod.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <span style={{ fontSize: '18px' }}>📦</span>
                                                            )}
                                                        </div>

                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontSize: '13.5px',
                                                                fontWeight: '600',
                                                                color: 'var(--text-primary)',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {prod.title}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                <span>{prod.category}</span>
                                                                {vendor?.store_name && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span style={{ color: 'var(--text-secondary)' }}>🏪 {vendor.store_name}</span>
                                                                    </>
                                                                )}
                                                                {prod.stock_quantity > 0 ? (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span style={{ color: 'var(--success)' }}>✓ In Stock</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span style={{ color: 'var(--danger)' }}>Out of stock</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Price & Actions */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                                                            {priceDisplay}
                                                        </span>
                                                        {onAddToCart && prod.stock_quantity > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onAddToCart(prod);
                                                                }}
                                                                className="btn-primary"
                                                                style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '8px' }}
                                                            >
                                                                + Add
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : matchingStores.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔎</div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        No products or stores found for "{query}"
                                    </div>
                                    <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                                        Try checking your spelling or search for general terms like "solar", "groceries", or "parts".
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>

                {/* Footer Command Hints */}
                <div style={{
                    padding: '12px 20px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>Press <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>↵ Enter</kbd> to search catalog</span>
                        <span><kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>↑↓</kbd> navigate</span>
                        <span><kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>ESC</kbd> close</span>
                    </div>
                    {query.trim() && (
                        <button
                            type="button"
                            onClick={() => handleExecuteSearch(query)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            View all results in marketplace →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
