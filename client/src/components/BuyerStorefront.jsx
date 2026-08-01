// client/src/components/BuyerStorefront.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { CheckoutForm } from './CheckoutForm.jsx';
import { ShippingCheckoutFlow } from './ShippingCheckoutFlow.jsx';

export function BuyerStorefront({ buyerId, currency = 'USD', zigRate = 26.5, formatPrice }) {
    const [products, setProducts] = useState([]);
    const [vendorProfiles, setVendorProfiles] = useState({});
    const [loading, setLoading] = useState(true);

    // Fallback formatPrice helper if not passed
    const getFormattedPrice = (cents) => {
        if (formatPrice) return formatPrice(cents, currency);
        const usd = (cents || 0) / 100;
        if (currency === 'ZiG') {
            return `ZiG ${(usd * zigRate).toFixed(2)}`;
        }
        return `$${usd.toFixed(2)}`;
    };
    
    // Cart State
    const [cart, setCart] = useState({}); 
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [selectedVariations, setSelectedVariations] = useState({});

    // Filters, Sorting & Wishlist
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubCategory, setSelectedSubCategory] = useState('All');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [selectedCondition, setSelectedCondition] = useState('All');
    const [sortBy, setSortBy] = useState('newest');

    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem('zimmarket_favorites');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const toggleFavorite = (productId, e) => {
        if (e) e.stopPropagation();
        setFavorites(prev => {
            const updated = prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId];
            try {
                localStorage.setItem('zimmarket_favorites', JSON.stringify(updated));
            } catch (err) {
                console.error('Failed to save favorites:', err);
            }
            return updated;
        });
    };
    
    const presetCategories = ['Electronics', 'Fashion', 'Auto Parts', 'Home & Garden', 'Vehicles', 'Other'];
    const customProductCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const uniqueCategories = Array.from(new Set([...presetCategories, ...customProductCategories]));
    const categories = ['All', '❤️ Favorites', ...uniqueCategories];
    const conditions = ['All', 'New', 'Used', 'Refurbished'];

    const subCategoriesMap = {
        'Electronics': ['Phones & Tablets', 'Laptops & Computers', 'Audio & Accessories'],
        'Fashion': ["Men's Wear", "Women's Wear", 'Footwear', 'Accessories'],
        'Auto Parts': ['Batteries & Electrical', 'Engine Parts', 'Tires & Wheels', 'Accessories'],
        'Home & Garden': ['Furniture', 'Appliances', 'Decor']
    };

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('All');
        setSelectedSubCategory('All');
        setMinPrice('');
        setMaxPrice('');
        setSelectedCondition('All');
        setSortBy('newest');
    };

    const [reviewsByProduct, setReviewsByProduct] = useState({});
    const [selectedReviewProduct, setSelectedReviewProduct] = useState(null);
    const [quickViewProduct, setQuickViewProduct] = useState(null);

    useEffect(() => {
        async function loadStorefront() {
            try {
                // Fetch Products
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .gt('stock_quantity', 0) 
                    .order('created_at', { ascending: false });

                if (productsError) throw productsError;
                setProducts(productsData || []);

                // Fetch Vendor Profiles to get WhatsApp Numbers and Store Names
                const { data: vendorsData, error: vendorsError } = await supabase
                    .from('vendor_profiles')
                    .select('*');

                if (!vendorsError && vendorsData) {
                    const vendorMap = {};
                    vendorsData.forEach(v => vendorMap[v.id] = v);

                    // Fetch all reviews for vendor & product ratings
                    const { data: reviewsData } = await supabase.from('reviews').select('*');
                    if (reviewsData) {
                        const vendorRatings = {}; // { vendor_id: { sum, count } }
                        const prodReviews = {};   // { product_id: Array }

                        reviewsData.forEach(r => {
                            if (!vendorRatings[r.vendor_id]) vendorRatings[r.vendor_id] = { sum: 0, count: 0 };
                            vendorRatings[r.vendor_id].sum += r.rating;
                            vendorRatings[r.vendor_id].count += 1;

                            if (r.product_id) {
                                if (!prodReviews[r.product_id]) prodReviews[r.product_id] = [];
                                prodReviews[r.product_id].push(r);
                            }
                        });

                        Object.keys(vendorRatings).forEach(vid => {
                            if (vendorMap[vid]) {
                                vendorMap[vid].avgRating = (vendorRatings[vid].sum / vendorRatings[vid].count).toFixed(1);
                                vendorMap[vid].reviewCount = vendorRatings[vid].count;
                            }
                        });

                        setReviewsByProduct(prodReviews);
                    }

                    setVendorProfiles(vendorMap);
                }
            } catch (err) {
                console.error("Failed loading buyer catalog:", err.message);
            } finally {
                setLoading(false);
            }
        }
        loadStorefront();
    }, []);

    const handleVariationChange = (productId, type, value) => {
        setSelectedVariations(prev => ({
            ...prev,
            [productId]: {
                ...(prev[productId] || {}),
                [type]: value
            }
        }));
    };

    const addToCart = (product) => {
        if (buyerId && product.shop_id === buyerId) {
            alert("🏪 This product belongs to your store. Vendors cannot purchase their own items.");
            return;
        }

        const hasColors = product.colors && product.colors.length > 0;
        const hasSizes = product.sizes && product.sizes.length > 0;
        
        const selectedColor = selectedVariations[product.id]?.color || (hasColors ? product.colors[0] : null);
        const selectedSize = selectedVariations[product.id]?.size || (hasSizes ? product.sizes[0] : null);

        const cartItemId = `${product.id}-${selectedColor || 'none'}-${selectedSize || 'none'}`;

        setCart(prev => {
            const existing = prev[cartItemId];
            const currentQty = existing ? existing.quantity : 0;
            if (currentQty >= product.stock_quantity) return prev; 
            return {
                ...prev,
                [cartItemId]: { product, quantity: currentQty + 1, selectedColor, selectedSize, cartItemId }
            };
        });
    };

    const removeFromCart = (cartItemId) => {
        setCart(prev => {
            const updated = { ...prev };
            if (!updated[cartItemId]) return prev;
            updated[cartItemId].quantity -= 1;
            if (updated[cartItemId].quantity <= 0) {
                delete updated[cartItemId];
            }
            return updated;
        });
    };

    const cartArray = Object.values(cart);
    const totalCents = cartArray.reduce((sum, item) => sum + (item.product.price_cents * item.quantity), 0);



    // Filter & Sort Logic
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (product.item_no && product.item_no.toLowerCase().includes(searchTerm.toLowerCase()));
        
        let matchesCategory = true;
        if (selectedCategory === '❤️ Favorites') {
            matchesCategory = favorites.includes(product.id);
        } else if (selectedCategory !== 'All') {
            matchesCategory = product.category === selectedCategory;
        }

        const matchesSubCategory = selectedSubCategory === 'All' || product.sub_category === selectedSubCategory;
        const matchesCondition = selectedCondition === 'All' || product.condition === selectedCondition;
        
        const priceUsd = product.price_cents / 100;
        const matchesMinPrice = minPrice === '' || priceUsd >= parseFloat(minPrice);
        const matchesMaxPrice = maxPrice === '' || priceUsd <= parseFloat(maxPrice);

        return matchesSearch && matchesCategory && matchesSubCategory && matchesCondition && matchesMinPrice && matchesMaxPrice;
    }).sort((a, b) => {
        if (sortBy === 'price_asc') return a.price_cents - b.price_cents;
        if (sortBy === 'price_desc') return b.price_cents - a.price_cents;
        if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
        // Default: newest
        return new Date(b.created_at) - new Date(a.created_at);
    });

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading ZimMarket...</div>;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
            
            {/* Hero Section */}
            <div className="glass-panel hero-section" style={{ padding: '40px', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)' }}>
                <h2 style={{ fontSize: '36px', marginBottom: '16px', color: 'var(--text-primary)' }}>Discover Local Goods</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', marginBottom: '24px' }}>
                    Shop directly from verified local vendors. Securely checkout with EcoCash or negotiate on WhatsApp.
                </p>
                <div style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
                    <input 
                        type="text" 
                        className="glass-panel" 
                        placeholder="Search for anything by name or SKU..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '16px 24px', fontSize: '16px', borderRadius: '30px' }}
                    />

                    {/* Instant Search Autocomplete Dropdown */}
                    {searchTerm.trim().length >= 2 && (
                        <div className="glass-panel animate-fade-in-up" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', zIndex: 500, backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                            {products
                                .filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || p.item_no?.toLowerCase().includes(searchTerm.toLowerCase()))
                                .slice(0, 5)
                                .map(item => (
                                    <div 
                                        key={item.id}
                                        onClick={() => setSearchTerm(item.title)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.title}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.category || 'Product'} {item.item_no ? `• SKU: ${item.item_no}` : ''}</div>
                                        </div>
                                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--accent-primary)' }}>
                                            {getFormattedPrice(item.price_cents)}
                                        </div>
                                    </div>
                                ))}
                            {products.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>
                                    No matching products found for "{searchTerm}"
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="storefront-layout">
                
                {/* Main Storefront Area */}
                <div className="storefront-products">
                    
                    {/* Category Chips */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setSelectedCategory(cat);
                                    setSelectedSubCategory('All');
                                }}
                                className={selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}
                                style={{ borderRadius: '20px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Sub-Category Chips (if available for selected main category) */}
                    {subCategoriesMap[selectedCategory] && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '6px' }}>
                            <button
                                onClick={() => setSelectedSubCategory('All')}
                                className={selectedSubCategory === 'All' ? 'btn-primary' : 'btn-secondary'}
                                style={{ borderRadius: '14px', padding: '4px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                            >
                                All {selectedCategory}
                            </button>
                            {subCategoriesMap[selectedCategory].map(subCat => (
                                <button
                                    key={subCat}
                                    onClick={() => setSelectedSubCategory(subCat)}
                                    className={selectedSubCategory === subCat ? 'btn-primary' : 'btn-secondary'}
                                    style={{ borderRadius: '14px', padding: '4px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                                >
                                    {subCat}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Advanced Filter Bar */}
                    <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                        
                        {/* Price Range */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Price ($):</span>
                            <input 
                                type="number" 
                                placeholder="Min" 
                                min="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                style={{ width: '80px', padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>–</span>
                            <input 
                                type="number" 
                                placeholder="Max" 
                                min="0"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                style={{ width: '80px', padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Condition & Sort Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            
                            {/* Condition */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: '600' }}>Condition:</span>
                                <select 
                                    value={selectedCondition}
                                    onChange={(e) => setSelectedCondition(e.target.value)}
                                    style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                >
                                    {conditions.map(cond => (
                                        <option key={cond} value={cond}>{cond === 'All' ? 'All Conditions' : cond}</option>
                                    ))}
                                </select>
                            </label>

                            {/* Sort By */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: '600' }}>Sort By:</span>
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="title_asc">Name: A–Z</option>
                                </select>
                            </label>

                            {/* Reset Button */}
                            {(searchTerm || selectedCategory !== 'All' || selectedSubCategory !== 'All' || minPrice || maxPrice || selectedCondition !== 'All' || sortBy !== 'newest') && (
                                <button 
                                    onClick={resetFilters}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                >
                                    ✕ Reset
                                </button>
                            )}

                            {/* Matching Count Badge */}
                            <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
                                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                            </span>
                        </div>
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No products found for your search.
                        </div>
                    ) : (
                        <div className="product-grid">
                            {filteredProducts.map(product => {
                                const vendor = vendorProfiles[product.shop_id];

                                const selectedColor = selectedVariations[product.id]?.color || (product.colors?.length > 0 ? product.colors[0] : null);
                                const selectedSize = selectedVariations[product.id]?.size || (product.sizes?.length > 0 ? product.sizes[0] : null);
                                const variationText = [selectedColor, selectedSize].filter(Boolean).join(' / ');
                                
                                const isFav = favorites.includes(product.id);
                                const haggleText = encodeURIComponent(
                                    `Hi! I'm interested in buying ${product.title}${variationText ? ` (${variationText})` : ''} listed for ${getFormattedPrice(product.price_cents)} on ZimMarket.`
                                );
                                
                                return (
                                <div key={product.id} className="glass-panel animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'transform 0.3s ease', cursor: 'pointer', position: 'relative' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    
                                    {/* Image Area */}
                                    <div onClick={() => setQuickViewProduct(product)} style={{ height: '200px', width: '100%', backgroundColor: 'var(--bg-tertiary)', position: 'relative', cursor: 'pointer' }}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No Image</div>
                                        )}

                                        {/* Wishlist Heart Button */}
                                        <button 
                                            onClick={(e) => toggleFavorite(product.id, e)}
                                            style={{
                                                position: 'absolute',
                                                top: '12px',
                                                left: '12px',
                                                backgroundColor: 'rgba(0,0,0,0.6)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                transition: 'transform 0.2s'
                                            }}
                                            title={isFav ? "Remove from Favorites" : "Save to Favorites"}
                                        >
                                            {isFav ? '❤️' : '🤍'}
                                        </button>

                                        {product.condition && (
                                            <span style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                                                {product.condition}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content Area */}
                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {product.category || 'Uncategorized'} {product.sub_category ? `› ${product.sub_category}` : ''} {product.item_no ? `• SKU: ${product.item_no}` : ''}
                                            </div>
                                            <h4 
                                                onClick={() => setQuickViewProduct(product)}
                                                style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-primary)', lineHeight: '1.3', cursor: 'pointer' }}
                                            >
                                                {product.title}
                                            </h4>
                                            
                                            {vendor && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    <span>🏪 {vendor.store_name}</span>
                                                    {vendor.is_verified && <span title="Verified Seller" style={{ color: 'var(--success)' }}>✔</span>}
                                                    {vendor.avgRating && (
                                                        <span style={{ marginLeft: '4px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                                                            ⭐ {vendor.avgRating} ({vendor.reviewCount})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div style={{ marginTop: '16px' }}>
                                            <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                {getFormattedPrice(product.price_cents)}
                                                <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }}>(Incl. VAT)</span>
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                
                                                {/* Variations */}
                                                {(product.colors?.length > 0 || product.sizes?.length > 0) && (
                                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                        {product.colors?.length > 0 && (
                                                            <select 
                                                                value={selectedVariations[product.id]?.color || product.colors[0]}
                                                                onChange={(e) => handleVariationChange(product.id, 'color', e.target.value)}
                                                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                            >
                                                                {product.colors.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                        )}
                                                        {product.sizes?.length > 0 && (
                                                            <select 
                                                                value={selectedVariations[product.id]?.size || product.sizes[0]}
                                                                onChange={(e) => handleVariationChange(product.id, 'size', e.target.value)}
                                                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                            >
                                                                {product.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        )}
                                                    </div>
                                                )}

                                                {buyerId && product.shop_id === buyerId ? (
                                                    <button 
                                                        disabled
                                                        className="btn-secondary"
                                                        style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                                    >
                                                        🏪 Your Product
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => addToCart(product)}
                                                        className="btn-primary"
                                                        style={{ width: '100%' }}
                                                    >
                                                        Add to Cart
                                                    </button>
                                                )}
                                                {vendor?.whatsapp_number && (
                                                    <a 
                                                        href={`https://wa.me/${vendor.whatsapp_number}?text=${haggleText}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="btn-secondary"
                                                        style={{ width: '100%', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                    >
                                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                                        </svg>
                                                        Haggle
                                                    </a>
                                                )}

                                                <button
                                                    onClick={() => setSelectedReviewProduct(product)}
                                                    className="btn-secondary"
                                                    style={{ width: '100%', fontSize: '13px', padding: '6px' }}
                                                >
                                                    💬 Reviews ({reviewsByProduct[product.id]?.length || 0})
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Cart Badge Button */}
            <button
                onClick={() => setIsCartOpen(true)}
                className="btn-primary glass-panel animate-fade-in-up"
                style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '24px',
                    zIndex: 990,
                    borderRadius: '30px',
                    padding: '14px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '15px'
                }}
            >
                <span style={{ fontSize: '20px' }}>🛒</span>
                <span>Cart</span>
                {cartArray.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                    <span style={{
                        backgroundColor: '#fff',
                        color: '#000',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: '800'
                    }}>
                        {cartArray.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                )}
            </button>

            {/* Slide-Out Cart Drawer Modal */}
            {isCartOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'flex-end', zIndex: 1100 }}>
                    <div 
                        className="glass-panel animate-fade-in-up" 
                        style={{ 
                            width: '100%', 
                            maxWidth: '460px', 
                            height: '100%', 
                            backgroundColor: 'var(--bg-secondary)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            padding: '28px',
                            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🛒 Shopping Cart</span>
                                {cartArray.length > 0 && <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>({cartArray.reduce((s, i) => s + i.quantity, 0)} items)</span>}
                            </h3>
                            <button 
                                onClick={() => {
                                    setIsCartOpen(false);
                                    setIsCheckingOut(false);
                                }} 
                                style={{ border: 'none', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                ✕
                            </button>
                        </div>

                        {cartArray.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ fontSize: '50px', marginBottom: '16px' }}>🛒</div>
                                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Your cart is empty</h4>
                                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Browse products and tap "Add to Cart" to start shopping.</p>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                                <div style={{ marginBottom: '24px', flex: 1, overflowY: 'auto' }}>
                                    {cartArray.map(item => (
                                        <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ flex: 1, paddingRight: '16px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{item.product.title}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                    {[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Qty: {item.quantity} × {getFormattedPrice(item.product.price_cents)}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                    {getFormattedPrice(item.product.price_cents * item.quantity)}
                                                </div>
                                                <button 
                                                    onClick={() => removeFromCart(item.cartItemId)}
                                                    style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0 }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '20px', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px', color: 'var(--text-primary)' }}>
                                        <span>Total:</span>
                                        <span>{getFormattedPrice(totalCents)}</span>
                                    </div>
                                </div>

                                {!isCheckingOut ? (
                                    <button 
                                        onClick={() => setIsCheckingOut(true)}
                                        className="btn-primary"
                                        style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px' }}
                                    >
                                        Checkout Securely
                                    </button>
                                ) : (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                        <ShippingCheckoutFlow 
                                            buyerId={buyerId}
                                            cartArray={cartArray}
                                            totalCents={totalCents}
                                            currency={currency}
                                            formatPrice={getFormattedPrice}
                                            onCancel={() => setIsCheckingOut(false)}
                                            onPaymentInitiated={() => {
                                                setCart({});
                                                setIsCheckingOut(false);
                                                setIsCartOpen(false);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Product Reviews Modal */}
            {selectedReviewProduct && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="glass-panel animate-fade-in-up" style={{ padding: '32px', width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-secondary)', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Customer Reviews</h3>
                            <button onClick={() => setSelectedReviewProduct(null)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
                        </div>

                        <div style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {selectedReviewProduct.title}
                        </div>

                        {(!reviewsByProduct[selectedReviewProduct.id] || reviewsByProduct[selectedReviewProduct.id].length === 0) ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                                No reviews yet for this product. Be the first to leave a review after your order is delivered!
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {reviewsByProduct[selectedReviewProduct.id].map((rev, i) => (
                                    <div key={i} style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                            <div style={{ fontSize: '16px' }}>
                                                {'⭐'.repeat(rev.rating)}
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {new Date(rev.created_at || Date.now()).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                            "{rev.comment}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <button onClick={() => setSelectedReviewProduct(null)} className="btn-secondary" style={{ width: '100%', marginTop: '24px' }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Quick View Product Detail Modal */}
            {quickViewProduct && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
                    <div className="glass-panel animate-fade-in-up" style={{ padding: '32px', width: '100%', maxWidth: '650px', backgroundColor: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', position: 'relative' }}>
                        
                        <button 
                            onClick={() => setQuickViewProduct(null)} 
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
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>🏪 {vendorProfiles[quickViewProduct.shop_id].store_name}</span>
                                            {vendorProfiles[quickViewProduct.shop_id].is_verified && <span style={{ color: 'var(--success)' }}>✔ Verified</span>}
                                        </div>
                                    )}

                                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                        {getFormattedPrice(quickViewProduct.price_cents)}
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '6px' }}>(Stock: {quickViewProduct.stock_quantity})</span>
                                    </div>

                                    {quickViewProduct.description && (
                                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                                            {quickViewProduct.description}
                                        </p>
                                    )}

                                    {/* Color & Size selectors */}
                                    {(quickViewProduct.colors?.length > 0 || quickViewProduct.sizes?.length > 0) && (
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                            {quickViewProduct.colors?.length > 0 && (
                                                <select 
                                                    value={selectedVariations[quickViewProduct.id]?.color || quickViewProduct.colors[0]}
                                                    onChange={(e) => handleVariationChange(quickViewProduct.id, 'color', e.target.value)}
                                                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                >
                                                    {quickViewProduct.colors.map(c => <option key={c} value={c}>Color: {c}</option>)}
                                                </select>
                                            )}
                                            {quickViewProduct.sizes?.length > 0 && (
                                                <select 
                                                    value={selectedVariations[quickViewProduct.id]?.size || quickViewProduct.sizes[0]}
                                                    onChange={(e) => handleVariationChange(quickViewProduct.id, 'size', e.target.value)}
                                                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                >
                                                    {quickViewProduct.sizes.map(s => <option key={s} value={s}>Size: {s}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                                    {buyerId && quickViewProduct.shop_id === buyerId ? (
                                        <button disabled className="btn-secondary" style={{ width: '100%', opacity: 0.7 }}>🏪 Your Product</button>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                addToCart(quickViewProduct);
                                                setQuickViewProduct(null);
                                            }}
                                            className="btn-primary"
                                            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
                                        >
                                            🛒 Add to Cart
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setSelectedReviewProduct(quickViewProduct);
                                            setQuickViewProduct(null);
                                        }}
                                        className="btn-secondary"
                                        style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                                    >
                                        💬 View Customer Reviews ({reviewsByProduct[quickViewProduct.id]?.length || 0})
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}