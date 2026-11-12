import { getStoreEffectiveZigRate } from '../../utils/exchangeRateService.js';
import { Button } from '../ui/index.js';

export function ProductList({ addToCart, buyerId, categoryIconMap, displayLimit, favorites, filteredProducts, getColorHex, getFormattedPrice, handleVariationChange, recentlyAddedId, reviewsByProduct, selectedVariations, setQuickViewProduct, setSelectedReviewProduct, setStorefrontModalVendor, startChatWithVendor, toggleFavorite, vendorProfiles, zigRate }) {
    return (
        <div className="product-list">
            {filteredProducts.slice(0, displayLimit).map(product => {
                const vendor = vendorProfiles[product.shop_id];

                const selectedColor = selectedVariations[product.id]?.color || (product.colors?.length > 0 ? product.colors[0] : null);
                const selectedSize = selectedVariations[product.id]?.size || (product.sizes?.length > 0 ? product.sizes[0] : null);
                const variationText = [selectedColor, selectedSize].filter(Boolean).join(' / ');

                const isFav = favorites.includes(product.id);
                const haggleText = encodeURIComponent(
                    `Hi! I'm interested in buying ${product.title}${variationText ? ` (${variationText})` : ''} listed for ${getFormattedPrice(product.price_cents, null, product.shop_id)} on ZimMarket.`
                );

                // Store effective ZiG rate & converted values
                const effectiveRate = vendor ? getStoreEffectiveZigRate(vendor, zigRate) : zigRate;
                const usdAmount = (product.price_cents || 0) / 100;
                const zigAmount = usdAmount * effectiveRate;

                // Deal & Promo calculation
                const hasPromo = product.is_promotion || (product.promo_discount_percent > 0);
                const discountPercent = product.promo_discount_percent || (hasPromo ? 15 : 0);
                const wasPriceCents = hasPromo ? Math.round(product.price_cents / (1 - (discountPercent / 100))) : null;

                // Reviews & Ratings
                const prodReviews = reviewsByProduct[product.id] || [];
                const prodRatingAvg = prodReviews.length > 0 
                    ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1)
                    : (vendor?.avgRating || null);
                const reviewCount = prodReviews.length > 0 ? prodReviews.length : (vendor?.reviewCount || 0);

                // Stock status
                const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

                return (
                    <div key={product.id} className="market-list-card animate-fade-in-up">
                        {/* Column 1: Media Stage */}
                        <div 
                            className="market-list-media"
                            onClick={() => setQuickViewProduct(product)}
                            title={`Click for Quick View: ${product.title}`}
                        >
                            {product.image_url ? (
                                <img 
                                    src={product.image_url} 
                                    alt={product.title} 
                                    loading="lazy" 
                                    decoding="async" 
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="stack items-center justify-center text-muted">
                                    <span className="fs-32">📦</span>
                                    <span className="fs-11">No Image</span>
                                </div>
                            )}

                            {/* Floating Badges */}
                            <div className="market-badge-stack-left">
                                {hasPromo && (
                                    <span className="market-deal-badge">
                                        ⚡ {discountPercent}% OFF
                                    </span>
                                )}
                                {product.condition && (
                                    <span className="market-condition-badge">
                                        {product.condition}
                                    </span>
                                )}
                            </div>

                            {/* Wishlist Heart */}
                            <button 
                                type="button"
                                className="market-fav-btn"
                                onClick={(e) => toggleFavorite(product.id, e)}
                                title={isFav ? "Remove from Favorites" : "Save to Favorites"}
                                aria-label="Wishlist"
                            >
                                {isFav ? '❤️' : '🤍'}
                            </button>
                        </div>

                        {/* Column 2: Content & Specs */}
                        <div className="market-list-content">
                            <div>
                                {/* Category Breadcrumb */}
                                <div className="market-card-category">
                                    <span>{categoryIconMap[product.category] || '🏷️'}</span>
                                    <span>{product.category || 'General'}</span>
                                    {product.sub_category && <span>› {product.sub_category}</span>}
                                    {product.item_no && <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>SKU: {product.item_no}</span>}
                                </div>

                                {/* Title */}
                                <h3 
                                    className="market-list-title"
                                    onClick={() => setQuickViewProduct(product)}
                                    title={product.title}
                                >
                                    {product.title}
                                </h3>

                                {/* Merchant & Rating Row */}
                                <div className="gap-12 mt-4 wrap row">
                                    {vendor && (
                                        <span 
                                            className="market-card-store-chip"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setStorefrontModalVendor(vendor);
                                                const slug = vendor.store_slug || vendor.store_name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                                if (slug) window.history.pushState({}, '', `?store=${slug}`);
                                            }}
                                            title={`View ${vendor.store_name}'s Storefront Profile & Catalog`}
                                        >
                                            🏪 {vendor.store_name}
                                            {vendor.is_verified && <span title="Verified Merchant" className="text-success">✔</span>}
                                        </span>
                                    )}

                                    {prodRatingAvg && (
                                        <span className="market-card-rating-badge">
                                            ★ {prodRatingAvg} ({reviewCount} reviews)
                                        </span>
                                    )}

                                    {/* Stock Scarcity Status */}
                                    {isLowStock ? (
                                        <div className="market-card-stock-indicator market-card-stock-low">
                                            <span className="market-card-stock-dot"></span>
                                            <span>Only {product.stock_quantity} remaining!</span>
                                        </div>
                                    ) : product.stock_quantity > 0 ? (
                                        <div className="market-card-stock-indicator market-card-stock-in">
                                            <span className="market-card-stock-dot"></span>
                                            <span>In Stock ({product.stock_quantity})</span>
                                        </div>
                                    ) : (
                                        <div className="market-card-stock-indicator" style={{ color: 'var(--danger)' }}>
                                            <span className="market-card-stock-dot" style={{ background: 'var(--danger)' }}></span>
                                            <span>Out of Stock</span>
                                        </div>
                                    )}
                                </div>

                                {/* Description Snippet */}
                                {product.description && (
                                    <p className="market-list-description" style={{ marginTop: '8px' }}>
                                        {product.description}
                                    </p>
                                )}
                            </div>

                            {/* Variations Row */}
                            {(product.colors?.length > 0 || product.sizes?.length > 0) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {product.colors?.length > 0 && (
                                        <div className="gap-6 row">
                                            <span className="fs-11 text-secondary fw-600">Color:</span>
                                            {product.colors.map(color => {
                                                const isSelected = (selectedVariations[product.id]?.color || product.colors[0]) === color;
                                                const hex = getColorHex(color);
                                                return (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        title={color}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVariationChange(product.id, 'color', color);
                                                        }}
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '50%',
                                                            border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                                            backgroundColor: hex || 'var(--bg-tertiary)',
                                                            cursor: 'pointer',
                                                            boxShadow: isSelected ? '0 0 6px var(--accent-glow)' : 'none',
                                                            padding: 0
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                    {product.sizes?.length > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span className="fs-11 text-secondary fw-600">Size:</span>
                                            {product.sizes.map(size => {
                                                const isSelected = (selectedVariations[product.id]?.size || product.sizes[0]) === size;
                                                return (
                                                    <button
                                                        key={size}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVariationChange(product.id, 'size', size);
                                                        }}
                                                        style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
                                                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                            fontWeight: isSelected ? '700' : '500',
                                                            fontSize: '11px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {size}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Column 3: Buy Box */}
                        <div className="market-list-buy-box">
                            {/* Pricing Box */}
                            <div className="market-card-pricing" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                                <div className="market-card-price-primary-row">
                                    <span className="market-card-price-usd" style={{ fontSize: '22px' }}>
                                        {product.price_cents > 0 ? `$${usdAmount.toFixed(2)}` : 'Price on Request'}
                                    </span>
                                    {wasPriceCents && (
                                        <span className="market-card-price-was">
                                            ${(wasPriceCents / 100).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                {product.price_cents > 0 && (
                                    <div className="market-card-price-sub-row" style={{ marginTop: '2px' }}>
                                        <span className="market-card-price-zig" style={{ fontSize: '13px' }}>
                                            ≈ ZiG {zigAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        {hasPromo && (
                                            <span className="market-card-save-chip">
                                                SAVE {discountPercent}%
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="fs-11 text-muted mt-4">
                                    {product.price_incl_vat_cents ? '✓ Inclusive of standard VAT' : '✓ Zero VAT / Export Rate'}
                                </div>
                            </div>

                            {/* Actions in Buy Box */}
                            <div className="gap-8 stack">
                                {buyerId && product.shop_id === buyerId ? (
                                    <Button 
                                        disabled
                                        variant="secondary"
                                        style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed', fontSize: '12px' }}
                                    >
                                        🏪 Your Product
                                    </Button>
                                ) : (
                                    <Button 
                                        type="button"
                                        onClick={() => addToCart(product)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px 14px', 
                                            fontSize: '13px', 
                                            fontWeight: '700',
                                            backgroundColor: recentlyAddedId === product.id ? 'var(--success)' : undefined,
                                            borderColor: recentlyAddedId === product.id ? 'var(--success)' : undefined
                                        }}
                                    >
                                        {recentlyAddedId === product.id ? '✓ Added to Cart!' : '🛒 Add to Cart'}
                                    </Button>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: vendor?.whatsapp_number ? '1fr 1fr' : '1fr', gap: '6px' }}>
                                    <Button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startChatWithVendor(product.shop_id, product);
                                        }}
                                        variant="secondary"
                                        style={{ fontSize: '12px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        💬 Chat
                                    </Button>

                                    {vendor?.whatsapp_number && (
                                        <a 
                                            href={`https://wa.me/${vendor.whatsapp_number}?text=${haggleText}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="btn-secondary"
                                            style={{ fontSize: '12px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            📱 WhatsApp
                                        </a>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedReviewProduct(product);
                                    }}
                                    variant="secondary"
                                    style={{ width: '100%', fontSize: '11px', padding: '6px', color: 'var(--text-secondary)' }}
                                >
                                    ⭐ Reviews ({reviewCount})
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
