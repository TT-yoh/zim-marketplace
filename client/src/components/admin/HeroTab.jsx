import { Button } from '../ui/index.js';

export function HeroTab({ adminZigRate, handleSetHeroDiscount, handleToggleHeroPromo, handleToggleHeroSpotlight, heroFilter, heroProducts, heroSearchTerm, loadHeroProducts, loadingHeroProducts, setHeroFilter, setHeroSearchTerm, updatingHeroId }) {
    return (
        <div className="animate-fade-in">
            {/* Header Banner */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--accent-primary)', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '14px' }}>
                <div className="between wrap gap-16 row">
                    <div>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⭐</span>
                            <span>Hero Spotlight &amp; Promotional Deals Curator</span>
                        </h3>
                        <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '750px' }}>
                            Feature top-selling items directly on the homepage Hero Carousel. Pin products to the Hero Spotlight or activate promotional discounts with live strikethrough badges.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={loadHeroProducts}
                        disabled={loadingHeroProducts}
                        variant="secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: '700' }}
                    >
                        <span>{loadingHeroProducts ? '⏳' : '🔄'}</span>
                        <span>{loadingHeroProducts ? 'Refreshing...' : 'Refresh Catalog'}</span>
                    </Button>
                </div>

                {/* Quick Stats Pill Row */}
                <div style={{ display: 'flex', gap: '14px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '10px 18px', borderRadius: '10px', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="fs-18">⭐</span>
                        <div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#eab308', fontWeight: '700' }}>Pinned Spotlight</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#eab308' }}>
                                {heroProducts.filter(p => p.is_featured_hero).length} Products
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '10px 18px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="fs-18">🔥</span>
                        <div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--danger)', fontWeight: '700' }}>Active Deals</div>
                            <div className="fs-18 fw-800 text-danger">
                                {heroProducts.filter(p => p.is_promotion).length} Products
                            </div>
                        </div>
                    </div>

                    <div className="p-10-18 rounded-10 bg-secondary border gap-10 row">
                        <span className="fs-18">📦</span>
                        <div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: '700' }}>Loaded Catalog</div>
                            <div className="fs-18 fw-800 text-primary">
                                {heroProducts.length} Items
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="between mb-20 wrap gap-14 row">
                <div className="flex gap-8 wrap">
                    <button
                        type="button"
                        onClick={() => setHeroFilter('all')}
                        className={heroFilter === 'all' ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}
                    >
                        All Products ({heroProducts.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setHeroFilter('spotlight')}
                        className={heroFilter === 'spotlight' ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}
                    >
                        ⭐ Pinned Spotlight ({heroProducts.filter(p => p.is_featured_hero).length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setHeroFilter('promotions')}
                        className={heroFilter === 'promotions' ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}
                    >
                        🔥 Promotions ({heroProducts.filter(p => p.is_promotion).length})
                    </button>
                </div>

                <div style={{ flex: 1, maxWidth: '360px', minWidth: '240px' }}>
                    <input
                        type="text"
                        value={heroSearchTerm}
                        onChange={e => setHeroSearchTerm(e.target.value)}
                        placeholder="🔍 Search product title, SKU, or category..."
                        style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="ui-table-wrap">
                    <table className="ui-table">
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <th className="p-14-18 fw-600">Product</th>
                                <th className="p-14-18 fw-600">Price (USD &amp; ZiG)</th>
                                <th className="p-14-18 fw-600">Hero Status</th>
                                <th className="p-14-18 fw-600 text-center">Spotlight Pin</th>
                                <th className="p-14-18 fw-600 text-right">Promotion &amp; Discount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const filtered = heroProducts.filter(p => {
                                    if (heroFilter === 'spotlight' && !p.is_featured_hero) return false;
                                    if (heroFilter === 'promotions' && !p.is_promotion) return false;
                                    if (heroSearchTerm.trim()) {
                                        const term = heroSearchTerm.toLowerCase();
                                        const matchTitle = (p.title || '').toLowerCase().includes(term);
                                        const matchSku = (p.item_no || '').toLowerCase().includes(term);
                                        const matchCat = (p.category || '').toLowerCase().includes(term);
                                        return matchTitle || matchSku || matchCat;
                                    }
                                    return true;
                                });

                                if (loadingHeroProducts && filtered.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                ⏳ Loading marketplace catalog products...
                                            </td>
                                        </tr>
                                    );
                                }

                                if (filtered.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No products found matching the current filter or search criteria.
                                            </td>
                                        </tr>
                                    );
                                }

                                return filtered.map(product => {
                                    const isUpdating = updatingHeroId === product.id;
                                    const priceUsd = (product.price_cents || 0) / 100;
                                    const priceZig = (priceUsd * adminZigRate).toFixed(2);
                                    const discPercent = product.promo_discount_percent || 15;

                                    return (
                                        <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s', backgroundColor: product.is_featured_hero ? 'rgba(234, 179, 8, 0.05)' : (product.is_promotion ? 'rgba(239, 68, 68, 0.03)' : 'transparent') }}>
                                            <td className="p-14-18">
                                                <div className="gap-12 row">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.title}
                                                            style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                                                        />
                                                    ) : (
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                                                            📦
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="fw-700 text-primary fs-14">
                                                            {product.title}
                                                        </div>
                                                        <div className="fs-12 text-muted">
                                                            <span>{product.category || 'General'}</span>
                                                            {product.sub_category && <span> › {product.sub_category}</span>}
                                                            <span style={{ marginLeft: '6px', fontFamily: 'monospace' }}>[{product.item_no || 'NO-SKU'}]</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-14-18">
                                                <div className="fw-700 text-success fs-14">
                                                    ${priceUsd.toFixed(2)}
                                                </div>
                                                <div className="fs-12 text-muted">
                                                    ≈ ZiG {priceZig}
                                                </div>
                                            </td>

                                            <td className="p-14-18">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                    {product.is_featured_hero ? (
                                                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308', border: '1px solid #eab308' }}>
                                                            ⭐ SPOTLIGHT PINNED
                                                        </span>
                                                    ) : null}
                                                    {product.is_promotion ? (
                                                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                                            🔥 PROMO -{discPercent}%
                                                        </span>
                                                    ) : null}
                                                    {!product.is_featured_hero && !product.is_promotion && (
                                                        <span className="fs-12 text-muted">
                                                            Standard Catalog
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-14-18 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleHeroSpotlight(product)}
                                                    disabled={isUpdating}
                                                    className={product.is_featured_hero ? 'btn-primary' : 'btn-secondary'}
                                                    style={{
                                                        padding: '6px 14px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        borderRadius: '8px',
                                                        backgroundColor: product.is_featured_hero ? '#eab308' : 'transparent',
                                                        color: product.is_featured_hero ? '#000' : 'var(--text-primary)',
                                                        borderColor: product.is_featured_hero ? '#eab308' : 'var(--border)'
                                                    }}
                                                >
                                                    {product.is_featured_hero ? '⭐ Pinned' : 'Pin to Hero'}
                                                </button>
                                            </td>

                                            <td className="p-14-18 text-right">
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleHeroPromo(product)}
                                                        disabled={isUpdating}
                                                        className={product.is_promotion ? 'btn-primary' : 'btn-secondary'}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            borderRadius: '8px',
                                                            backgroundColor: product.is_promotion ? 'var(--danger)' : 'transparent',
                                                            color: product.is_promotion ? '#fff' : 'var(--text-secondary)',
                                                            borderColor: product.is_promotion ? 'var(--danger)' : 'var(--border)'
                                                        }}
                                                    >
                                                        {product.is_promotion ? '🔥 Promo On' : 'Set Promo'}
                                                    </button>

                                                    {product.is_promotion && (
                                                        <div className="gap-4 row">
                                                            {[10, 15, 20, 25].map(pct => (
                                                                <button
                                                                    key={pct}
                                                                    type="button"
                                                                    onClick={() => handleSetHeroDiscount(product, pct)}
                                                                    disabled={isUpdating}
                                                                    style={{
                                                                        padding: '3px 6px',
                                                                        fontSize: '11px',
                                                                        fontWeight: '700',
                                                                        borderRadius: '4px',
                                                                        border: discPercent === pct ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                                        backgroundColor: discPercent === pct ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
                                                                        color: discPercent === pct ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {pct}%
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
