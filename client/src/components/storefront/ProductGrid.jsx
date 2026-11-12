import { getStoreEffectiveZigRate } from '../../utils/exchangeRateService.js';

export function ProductGrid({ addToCart, buyerId, cart, categoryIconMap, displayLimit, favorites, filteredProducts, getColorHex, getFormattedPrice, handleVariationChange, loading, recentlyAddedId, reviewsByProduct, selectedVariations, setQuickViewProduct, setSelectedReviewProduct, setStorefrontModalVendor, startChatWithVendor, toggleFavorite, vendorProfiles, zigRate }) {
    return (
        <div className="product-grid">
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
                    <div key={product.id} className="market-card animate-fade-in-up">
                        {/* Media Stage: 1:1 Aspect Ratio with Hover Zoom */}
                        <div 
                            className="market-card-media" 
                            onClick={() => setQuickViewProduct(product)}
                            title={`Click for Quick View: ${product.title}`}
                        >
                            {product.image_url ? (
                                <>
                                    <img 
                                        src={product.image_url} 
                                        alt={product.title} 
                                        className="market-card-img"
                                        loading="lazy" 
                                        decoding="async" 
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.style.display = 'none';
                                            if (e.currentTarget.nextElementSibling) {
                                                e.currentTarget.nextElementSibling.style.display = 'flex';
                                            }
                                        }}
                                    />
                                    <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '32px' }}>
                                        📦
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '6px' }}>
                                    <span style={{ fontSize: '30px' }}>📦</span>
                                    <span style={{ fontSize: '11px' }}>No Image</span>
                                </div>
                            )}

                            {/* Hover Quick View Pill Overlay */}
                            <div className="market-card-quickview-overlay">
                                <span className="market-card-quickview-pill">
                                    👁 Quick View
                                </span>
                            </div>

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

                            {/* Floating Wishlist Heart */}
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

                        {/* Card Body */}
                        <div className="market-card-body">
                            <div>
                                {/* Category Breadcrumb */}
                                <div className="market-card-category">
                                    <span>{categoryIconMap[product.category] || '🏷️'}</span>
                                    <span>{product.category || 'General'}</span>
                                    {product.sub_category && <span>› {product.sub_category}</span>}
                                </div>

                                {/* Product Title */}
                                <h4 
                                    className="market-card-title"
                                    onClick={() => setQuickViewProduct(product)}
                                    title={product.title}
                                >
                                    {product.title}
                                </h4>

                                {/* Merchant Row & Rating */}
                                <div className="market-card-merchant-row">
                                    {vendor ? (
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
                                            {vendor.is_verified && <span title="Verified Merchant" style={{ color: 'var(--success)', fontWeight: 'bold' }}>✔</span>}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🏪 ZimMarket Verified</span>
                                    )}

                                    {prodRatingAvg ? (
                                        <span className="market-card-rating-badge" title={`${reviewCount} reviews`}>
                                            ★ {prodRatingAvg} ({reviewCount})
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>★ New</span>
                                    )}
                                </div>

                                {/* Stock Scarcity Status */}
                                <div style={{ marginTop: '6px' }}>
                                    {isLowStock ? (
                                        <div className="market-card-stock-indicator market-card-stock-low">
                                            <span className="market-card-stock-dot"></span>
                                            <span>Only {product.stock_quantity} left in stock!</span>
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
                            </div>

                            <div>
                                {/* Dual Currency Pricing Box */}
                                <div className="market-card-pricing">
                                    <div className="market-card-price-primary-row">
                                        <span className="market-card-price-usd">
                                            {product.price_cents > 0 ? `$${usdAmount.toFixed(2)}` : 'Price on Request'}
                                        </span>
                                        {wasPriceCents && (
                                            <span className="market-card-price-was">
                                                ${(wasPriceCents / 100).toFixed(2)}
                                            </span>
                                        )}
                                        {hasPromo && (
                                            <span className="market-card-save-chip">
                                                SAVE {discountPercent}%
                                            </span>
                                        )}
                                    </div>
                                    {product.price_cents > 0 && (
                                        <div className="market-card-price-sub-row">
                                            <span className="market-card-price-zig">
                                                ≈ ZiG {zigAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="market-card-vat-tag">
                                                {product.price_incl_vat_cents ? 'VAT Incl.' : 'Tax Free'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Variation Selection (Colors & Sizes) */}
                                {(product.colors?.length > 0 || product.sizes?.length > 0) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0 2px 0' }}>
                                        {product.colors?.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>Color:</span>
                                                {product.colors.slice(0, 5).map(color => {
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
                                                                width: '18px',
                                                                height: '18px',
                                                                borderRadius: '50%',
                                                                border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                                                backgroundColor: hex || 'var(--bg-tertiary)',
                                                                cursor: 'pointer',
                                                                boxShadow: isSelected ? '0 0 6px var(--accent-glow)' : 'none',
                                                                fontSize: '8px',
                                                                padding: 0
                                                            }}
                                                        />
                                                    );
                                                })}
                                                {product.colors.length > 5 && (
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{product.colors.length - 5}</span>
                                                )}
                                            </div>
                                        )}
                                        {product.sizes?.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>Size:</span>
                                                {product.sizes.slice(0, 4).map(size => {
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
                                                                padding: '2px 6px',
                                                                borderRadius: '5px',
                                                                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
                                                                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                                fontWeight: isSelected ? '700' : '500',
                                                                fontSize: '10px',
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

                                {/* Action Area */}
                                <div className="market-card-actions">
                                    {buyerId && product.shop_id === buyerId ? (
                                        <button 
                                            disabled
                                            className="btn-secondary"
                                            style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed', fontSize: '12px', padding: '8px 12px' }}
                                        >
                                            🏪 Your Product
                                        </button>
                                    ) : (
                                        <button 
                                            type="button"
                                            onClick={() => addToCart(product)}
                                            className="market-btn-add-cart btn-primary"
                                            style={{ 
                                                backgroundColor: recentlyAddedId === product.id ? 'var(--success)' : undefined,
                                                borderColor: recentlyAddedId === product.id ? 'var(--success)' : undefined
                                            }}
                                        >
                                            {recentlyAddedId === product.id ? '✓ Added to Cart!' : '🛒 Add to Cart'}
                                        </button>
                                    )}

                                    {/* Sub-actions Strip: Live Chat, WhatsApp, and Reviews */}
                                    <div className="market-card-sub-actions">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startChatWithVendor(product.shop_id, product);
                                            }}
                                            className="market-btn-sub"
                                            title="Live Chat with Merchant"
                                        >
                                            💬 Chat
                                        </button>

                                        {vendor?.whatsapp_number ? (
                                            <a 
                                                href={`https://wa.me/${vendor.whatsapp_number}?text=${haggleText}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="market-btn-sub"
                                                title="Negotiate or inquire on WhatsApp"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                📱 WhatsApp
                                            </a>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setQuickViewProduct(product)}
                                                className="market-btn-sub"
                                                title="Quick View Specs"
                                            >
                                                👁 Details
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedReviewProduct(product);
                                            }}
                                            className="market-btn-sub"
                                            title="Read or write buyer reviews"
                                        >
                                            ⭐ Reviews
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
