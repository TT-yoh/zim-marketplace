export function QuickViewModal({ addToCart, buyerId, getColorHex, getFormattedPrice, handleShareProduct, handleVariationChange, quickViewProduct, reviewsByProduct, selectedVariations, setQuickViewProduct, setSelectedReviewProduct, setStorefrontModalVendor, startChatWithVendor, vendorProfiles }) {
    return (
        <div 
            onClick={(e) => {
                if (e.target === e.currentTarget) setQuickViewProduct(null);
            }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            className="animate-fade-in"
        >
            <div className="glass-panel animate-scale-up" style={{ padding: '32px', width: '100%', maxWidth: '650px', backgroundColor: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', position: 'relative' }}>

                <button
                    onClick={() => handleShareProduct(quickViewProduct)}
                    aria-label="Share this product"
                    title="Share this product"
                    style={{ position: 'absolute', top: '20px', right: '64px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', height: '36px', padding: '0 12px', borderRadius: '18px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    🔗 Share
                </button>
                <button
                    onClick={() => setQuickViewProduct(null)}
                    aria-label="Close product details"
                    style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    ✕
                </button>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Image Section */}
                    <div style={{ flex: '1', minWidth: '240px', height: '260px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden' }}>
                        {quickViewProduct.image_url ? (
                            <img src={quickViewProduct.image_url} alt={quickViewProduct.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '32px' }}>📦</div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                                {quickViewProduct.category} {quickViewProduct.sub_category ? `› ${quickViewProduct.sub_category}` : ''}
                            </div>

                            <h3 style={{ margin: '0 0 12px 0', fontSize: '22px', color: 'var(--text-primary)' }}>{quickViewProduct.title}</h3>

                            {vendorProfiles[quickViewProduct.shop_id] && (
                                <div 
                                    onClick={() => {
                                        const vp = vendorProfiles[quickViewProduct.shop_id];
                                        setQuickViewProduct(null);
                                        setStorefrontModalVendor(vp);
                                        const slug = vp.store_slug || vp.store_name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                        if (slug) window.history.pushState({}, '', `?store=${slug}`);
                                    }}
                                    style={{ 
                                        fontSize: '13px', 
                                        color: 'var(--accent-primary)', 
                                        marginBottom: '12px', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        cursor: 'pointer',
                                        padding: '4px 10px',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderRadius: '20px',
                                        width: 'fit-content'
                                    }}
                                    title="View Merchant Storefront Profile"
                                >
                                    <span>🏪 {vendorProfiles[quickViewProduct.shop_id].store_name}</span>
                                    {vendorProfiles[quickViewProduct.shop_id].is_verified && <span style={{ color: 'var(--success)' }}>✔ Verified</span>}
                                    <span style={{ fontSize: '11px', opacity: 0.8 }}>›</span>
                                </div>
                            )}

                            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                {getFormattedPrice(quickViewProduct.price_cents, null, quickViewProduct.shop_id)}
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '6px' }}>(Stock: {quickViewProduct.stock_quantity})</span>
                            </div>

                            {quickViewProduct.description && (
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                                    {quickViewProduct.description}
                                </p>
                            )}

                            {/* Interactive Size Pills & Color Swatches */}
                            {(quickViewProduct.colors?.length > 0 || quickViewProduct.sizes?.length > 0) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                    {/* Color Swatches */}
                                    {quickViewProduct.colors?.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Color:</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                {quickViewProduct.colors.map(color => {
                                                    const isSelected = (selectedVariations[quickViewProduct.id]?.color || quickViewProduct.colors[0]) === color;
                                                    const hex = getColorHex(color);
                                                    return (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            title={color}
                                                            onClick={() => handleVariationChange(quickViewProduct.id, 'color', color)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-primary)',
                                                                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                                fontWeight: isSelected ? '700' : '500',
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <span style={{
                                                                width: '12px',
                                                                height: '12px',
                                                                borderRadius: '50%',
                                                                backgroundColor: hex || 'var(--accent-primary)',
                                                                border: '1px solid rgba(255,255,255,0.3)'
                                                            }} />
                                                            <span>{color}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Size Pills */}
                                    {quickViewProduct.sizes?.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Size:</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                {quickViewProduct.sizes.map(size => {
                                                    const isSelected = (selectedVariations[quickViewProduct.id]?.size || quickViewProduct.sizes[0]) === size;
                                                    return (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            onClick={() => handleVariationChange(quickViewProduct.id, 'size', size)}
                                                            style={{
                                                                padding: '6px 14px',
                                                                borderRadius: '8px',
                                                                border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-primary)',
                                                                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                                fontWeight: isSelected ? '700' : '500',
                                                                fontSize: '13px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {size}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                            {buyerId && quickViewProduct.shop_id === buyerId ? (
                                <button disabled className="btn-secondary" style={{ width: '100%', opacity: 0.7 }}>🏪 Your Product</button>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        onClick={() => {
                                            addToCart(quickViewProduct);
                                            setQuickViewProduct(null);
                                        }}
                                        className="btn-primary"
                                        style={{ flex: 1, padding: '12px', fontSize: '15px' }}
                                    >
                                        🛒 Add to Cart
                                    </button>
                                    <button 
                                        onClick={() => {
                                            startChatWithVendor(quickViewProduct.shop_id, quickViewProduct);
                                            setQuickViewProduct(null);
                                        }}
                                        className="btn-secondary"
                                        style={{ padding: '12px 18px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        💬 Chat with Seller
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={() => {
                                    setSelectedReviewProduct(quickViewProduct);
                                    setQuickViewProduct(null);
                                }}
                                className="btn-secondary"
                                style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                            >
                                ⭐ View Customer Reviews ({reviewsByProduct[quickViewProduct.id]?.length || 0})
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
