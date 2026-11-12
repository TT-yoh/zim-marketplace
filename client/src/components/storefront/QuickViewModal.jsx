import { Modal, Button } from '../ui/index.js';

export function QuickViewModal({ addToCart, buyerId, getColorHex, getFormattedPrice, handleShareProduct, handleVariationChange, quickViewProduct, reviewsByProduct, selectedVariations, setQuickViewProduct, setSelectedReviewProduct, setStorefrontModalVendor, startChatWithVendor, vendorProfiles }) {
    return (
        <Modal size="md" ariaLabel={quickViewProduct.title || 'Product details'} onClose={() => setQuickViewProduct(null)}>

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
                className="ui-icon-btn"
                style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px', fontSize: '18px' }}
            >
                ✕
            </button>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* Image Section */}
                <div style={{ flex: '1', minWidth: '240px', height: '260px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden' }}>
                    {quickViewProduct.image_url ? (
                        <img src={quickViewProduct.image_url} alt={quickViewProduct.title} className="img-cover" />
                    ) : (
                        <div className="justify-center h-full text-muted fs-32 row">📦</div>
                    )}
                </div>

                {/* Details Section */}
                <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div className="fs-12 text-accent fw-600 uppercase mb-4">
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
                                {vendorProfiles[quickViewProduct.shop_id].is_verified && <span className="text-success">✔ Verified</span>}
                                <span style={{ fontSize: '11px', opacity: 0.8 }}>›</span>
                            </div>
                        )}

                        <div className="fs-24 fw-800 text-primary mb-16">
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
                            <div className="gap-12 mb-16 stack">
                                {/* Color Swatches */}
                                {quickViewProduct.colors?.length > 0 && (
                                    <div>
                                        <div className="fs-12 text-secondary fw-600 mb-6">Color:</div>
                                        <div className="gap-8 wrap row">
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
                                        <div className="fs-12 text-secondary fw-600 mb-6">Size:</div>
                                        <div className="gap-8 wrap row">
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
                            <Button disabled variant="secondary" style={{ width: '100%', opacity: 0.7 }}>🏪 Your Product</Button>
                        ) : (
                            <div className="flex gap-10">
                                <Button 
                                    onClick={() => {
                                        addToCart(quickViewProduct);
                                        setQuickViewProduct(null);
                                    }}
                                    style={{ flex: 1, padding: '12px', fontSize: '15px' }}
                                >
                                    🛒 Add to Cart
                                </Button>
                                <Button 
                                    onClick={() => {
                                        startChatWithVendor(quickViewProduct.shop_id, quickViewProduct);
                                        setQuickViewProduct(null);
                                    }}
                                    variant="secondary"
                                    style={{ padding: '12px 18px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    💬 Chat with Seller
                                </Button>
                            </div>
                        )}
                        <Button 
                            onClick={() => {
                                setSelectedReviewProduct(quickViewProduct);
                                setQuickViewProduct(null);
                            }}
                            variant="secondary"
                            style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                        >
                            ⭐ View Customer Reviews ({reviewsByProduct[quickViewProduct.id]?.length || 0})
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
