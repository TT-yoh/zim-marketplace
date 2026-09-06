// client/src/components/BuyerStorefront.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { CheckoutForm } from './CheckoutForm.jsx';
import { ShippingCheckoutFlow } from './ShippingCheckoutFlow.jsx';
import { useToast } from './ToastContext.jsx';
import { useChat } from './ChatContext.jsx';

// Synchronous persistent cache helper for 0ms instant cold-boot & tab switching
const getInitialStorefrontCache = () => {
    try {
        const saved = localStorage.getItem('zimmarket_storefront_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
    return {
        products: null,
        vendorProfiles: null,
        reviewsByProduct: null,
        dbCategories: null,
        timestamp: 0
    };
};

let globalStorefrontCache = getInitialStorefrontCache();

export function BuyerStorefront({ buyerId, currency = 'USD', zigRate = 26.5, formatPrice }) {
    const { showToast } = useToast();
    const { startChatWithVendor } = useChat();
    const [products, setProducts] = useState(() => globalStorefrontCache.products || []);
    const [vendorProfiles, setVendorProfiles] = useState(() => globalStorefrontCache.vendorProfiles || {});
    const [dbCategories, setDbCategories] = useState(() => globalStorefrontCache.dbCategories || []);
    const [loading, setLoading] = useState(() => !globalStorefrontCache.products || globalStorefrontCache.products.length === 0);

    // Fallback formatPrice helper if not passed
    const getFormattedPrice = (cents) => {
        if (formatPrice) return formatPrice(cents, currency);
        const usd = (cents || 0) / 100;
        if (currency === 'ZiG') {
            return `ZiG ${(usd * zigRate).toFixed(2)}`;
        }
        return `$${usd.toFixed(2)}`;
    };

    const getColorHex = (name) => {
        if (!name) return null;
        const lower = name.trim().toLowerCase();
        const map = {
            'black': '#18181b',
            'white': '#ffffff',
            'red': '#ef4444',
            'blue': '#3b82f6',
            'navy': '#1e3a8a',
            'green': '#10b981',
            'yellow': '#f59e0b',
            'pink': '#ec4899',
            'purple': '#8b5cf6',
            'orange': '#f97316',
            'grey': '#71717a',
            'gray': '#71717a',
            'silver': '#cbd5e1',
            'gold': '#eab308',
            'brown': '#78350f'
        };
        return map[lower] || null;
    };
    
    // Cart State
    const [cart, setCart] = useState({}); 
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [quotationCustomerName, setQuotationCustomerName] = useState('');
    const [selectedVariations, setSelectedVariations] = useState({});

    // Filters, Sorting & Wishlist
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubCategory, setSelectedSubCategory] = useState('All');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [selectedCondition, setSelectedCondition] = useState('All');
    const [selectedVendorShopId, setSelectedVendorShopId] = useState('All');
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
    
    const presetCategories = dbCategories.length > 0
        ? dbCategories.map(c => c.name)
        : ['Electronics', 'Fashion', 'Auto Parts', 'Solar & Energy', 'Agriculture', 'Home & Hardware', 'Vehicles', 'Other'];

    const customProductCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const uniqueCategories = Array.from(new Set([...presetCategories, ...customProductCategories]));
    const categories = ['All', '❤️ Favorites', ...uniqueCategories];
    const conditions = ['All', 'New', 'Used', 'Refurbished'];

    const categoryIconMap = React.useMemo(() => {
        const map = {
            'All': '🌐',
            '❤️ Favorites': '❤️',
            'Electronics': '📱',
            'Fashion': '👕',
            'Auto Parts': '🚗',
            'Solar & Energy': '⚡',
            'Agriculture': '🌾',
            'Home & Hardware': '🏡',
            'Vehicles': '🚙',
            'Beauty & Health': '💄',
            'Other': '📦'
        };
        dbCategories.forEach(c => {
            if (c.name && c.icon) map[c.name] = c.icon;
        });
        return map;
    }, [dbCategories]);

    const subCategoriesMap = React.useMemo(() => {
        const map = {
            'Electronics': ['Phones & Tablets', 'Laptops & Computers', 'Audio & Speakers', 'TV & Home Entertainment', 'Accessories'],
            'Fashion': ["Men's Wear", "Women's Wear", 'Footwear', 'Watches & Jewelry', 'Accessories'],
            'Auto Parts': ['Batteries & Electrical', 'Engine Parts', 'Tires & Wheels', 'Brakes & Suspension', 'Accessories']
        };
        dbCategories.forEach(c => {
            if (c.name && Array.isArray(c.sub_categories) && c.sub_categories.length > 0) {
                map[c.name] = c.sub_categories;
            }
        });
        return map;
    }, [dbCategories]);

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('All');
        setSelectedSubCategory('All');
        setMinPrice('');
        setMaxPrice('');
        setSelectedCondition('All');
        setSelectedVendorShopId('All');
        setSortBy('newest');
        setDisplayLimit(24);
    };

    const [displayLimit, setDisplayLimit] = useState(24);

    const [reviewsByProduct, setReviewsByProduct] = useState({});
    const [selectedReviewProduct, setSelectedReviewProduct] = useState(null);
    const [quickViewProduct, setQuickViewProduct] = useState(null);

    useEffect(() => {
        async function loadStorefront() {
            try {
                // Fetch Products, Vendor Profiles, Categories, and Reviews concurrently in parallel
                const [productsRes, vendorsRes, reviewsRes, categoriesRes] = await Promise.all([
                    supabase
                        .from('products')
                        .select('id, item_no, title, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit')
                        .gt('stock_quantity', 0)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('vendor_profiles')
                        .select('id, store_name, whatsapp_number, is_verified, is_active'),
                    supabase
                        .from('reviews')
                        .select('vendor_id, product_id, rating'),
                    supabase
                        .from('categories')
                        .select('*')
                        .order('display_order', { ascending: true })
                ]);

                if (categoriesRes.data) {
                    setDbCategories(categoriesRes.data);
                }

                if (productsRes.error) throw productsRes.error;

                const vendorMap = {};
                if (vendorsRes.data) {
                    vendorsRes.data.forEach(v => vendorMap[v.id] = v);
                }

                // Exclude products from suspended/inactive stores
                const activeProducts = (productsRes.data || []).filter(p => {
                    const v = vendorMap[p.shop_id];
                    return !v || v.is_active !== false;
                });

                setProducts(activeProducts);

                if (reviewsRes.data) {
                    const vendorRatings = {}; // { vendor_id: { sum, count } }
                    const prodReviews = {};   // { product_id: Array }

                    reviewsRes.data.forEach(r => {
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

                // Update global SWR and persistent cache
                const updatedCache = {
                    products: activeProducts,
                    vendorProfiles: vendorMap,
                    reviewsByProduct: reviewsRes.data ? prodReviews : (globalStorefrontCache.reviewsByProduct || {}),
                    dbCategories: categoriesRes.data || globalStorefrontCache.dbCategories || [],
                    timestamp: Date.now()
                };
                globalStorefrontCache = updatedCache;
                try {
                    localStorage.setItem('zimmarket_storefront_cache', JSON.stringify(updatedCache));
                } catch (e) {
                    console.warn('Could not save storefront cache to localStorage:', e);
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
            showToast("🏪 This product belongs to your store. Vendors cannot purchase their own items.", "warning");
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

    const handleWhatsAppCartOrder = () => {
        if (cartArray.length === 0) return;
        const vendorIds = Array.from(new Set(cartArray.map(item => item.product.shop_id)));
        const primaryVendor = vendorProfiles[vendorIds[0]];
        const phone = primaryVendor?.whatsapp_number || '263772123456';
        
        let msg = `🛒 *NEW ORDER INQUIRY - ZIMMARKET*\n`;
        msg += `------------------------------------\n`;
        cartArray.forEach((item, idx) => {
            const variation = [item.selectedColor, item.selectedSize].filter(Boolean).join('/');
            msg += `${idx + 1}. *${item.product.title}* ${variation ? `(${variation})` : ''}\n`;
            msg += `   Qty: ${item.quantity} × $${(item.product.price_cents / 100).toFixed(2)} = $${((item.product.price_cents * item.quantity) / 100).toFixed(2)}\n`;
        });
        msg += `------------------------------------\n`;
        msg += `Subtotal (Excl. VAT): $${((totalCents / 1.15) / 100).toFixed(2)}\n`;
        msg += `VAT (15%): $${((totalCents - (totalCents / 1.15)) / 100).toFixed(2)}\n`;
        msg += `*Total Amount: $${(totalCents / 100).toFixed(2)} (≈ ZiG ${((totalCents / 100) * zigRate).toFixed(2)})*\n\n`;
        msg += `Please confirm availability and delivery timeframe. Thank you!`;

        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };



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
        const matchesVendor = selectedVendorShopId === 'All' || product.shop_id === selectedVendorShopId;

        return matchesSearch && matchesCategory && matchesSubCategory && matchesCondition && matchesVendor && matchesMinPrice && matchesMaxPrice;
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
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setSelectedCategory(cat);
                                    setSelectedSubCategory('All');
                                }}
                                className={selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}
                                style={{
                                    borderRadius: '20px',
                                    padding: '8px 16px',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}
                            >
                                <span>{categoryIconMap[cat] || '🏷️'}</span>
                                <span>{cat}</span>
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
                            
                            {/* Company / Store Filter */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: '600' }}>Company:</span>
                                <select 
                                    value={selectedVendorShopId}
                                    onChange={(e) => setSelectedVendorShopId(e.target.value)}
                                    style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                >
                                    <option value="All">All Companies ({Object.keys(vendorProfiles).length})</option>
                                    {Object.entries(vendorProfiles).map(([shopId, profile]) => (
                                        <option key={shopId} value={shopId}>
                                            {profile.store_name} {profile.is_verified ? '✔' : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

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
                            {(searchTerm || selectedCategory !== 'All' || selectedSubCategory !== 'All' || minPrice || maxPrice || selectedCondition !== 'All' || selectedVendorShopId !== 'All' || sortBy !== 'newest') && (
                                <button 
                                    onClick={resetFilters}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                >
                                    ✕ Reset
                                </button>
                            )}

                            {/* Live Counter Badge */}
                            <span style={{ fontSize: '12px', fontWeight: '600', padding: '6px 14px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} across {Object.keys(vendorProfiles).length} {Object.keys(vendorProfiles).length === 1 ? 'company' : 'companies'}
                            </span>
                        </div>
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No products found for your search.
                        </div>
                    ) : (
                        <>
                            <div className="product-grid">
                                {filteredProducts.slice(0, displayLimit).map(product => {
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
                                        <div onClick={() => setQuickViewProduct(product)} style={{ height: '140px', width: '100%', backgroundColor: 'var(--bg-tertiary)', position: 'relative', cursor: 'pointer' }}>
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No Image</div>
                                            )}

                                            {/* Wishlist Heart Button */}
                                            <button 
                                                onClick={(e) => toggleFavorite(product.id, e)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    left: '8px',
                                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '28px',
                                                    height: '28px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                    transition: 'transform 0.2s'
                                                }}
                                                title={isFav ? "Remove from Favorites" : "Save to Favorites"}
                                            >
                                                {isFav ? '❤️' : '🤍'}
                                            </button>

                                            {product.condition && (
                                                <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                                                    {product.condition}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content Area */}
                                        <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {product.category || 'Uncategorized'} {product.sub_category ? `› ${product.sub_category}` : ''}
                                                </div>
                                                <h4 
                                                    onClick={() => setQuickViewProduct(product)}
                                                    style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.3', cursor: 'pointer', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                                                >
                                                    {product.title}
                                                </h4>
                                                
                                                {vendor && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏪 {vendor.store_name}</span>
                                                        {vendor.is_verified && <span title="Verified Seller" style={{ color: 'var(--success)' }}>✔</span>}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div style={{ marginTop: '8px' }}>
                                                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>
                                                    {getFormattedPrice(product.price_cents)}
                                                </div>
                                                
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    
                                                    {/* Interactive Size Pills & Color Swatches */}
                                                    {(product.colors?.length > 0 || product.sizes?.length > 0) && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                                            {/* Color Swatches */}
                                                            {product.colors?.length > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Color:</span>
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
                                                                                    width: '22px',
                                                                                    height: '22px',
                                                                                    borderRadius: '50%',
                                                                                    border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                                                                    backgroundColor: hex || 'var(--bg-tertiary)',
                                                                                    cursor: 'pointer',
                                                                                    boxShadow: isSelected ? '0 0 8px var(--accent-glow)' : 'none',
                                                                                    transition: 'all 0.2s',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    fontSize: '9px',
                                                                                    color: hex === '#ffffff' ? '#000' : '#fff',
                                                                                    fontWeight: '700'
                                                                                }}
                                                                            >
                                                                                {!hex && color.slice(0, 2).toUpperCase()}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {/* Size Pills */}
                                                            {product.sizes?.length > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Size:</span>
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
                                                                                    padding: '3px 8px',
                                                                                    borderRadius: '6px',
                                                                                    border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                                                                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
                                                                                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                                                    fontWeight: isSelected ? '700' : '500',
                                                                                    fontSize: '11px',
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s'
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
                                                    <div style={{ display: 'grid', gridTemplateColumns: vendor?.whatsapp_number ? '1fr 1fr' : '1fr', gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startChatWithVendor(product.shop_id, product);
                                                            }}
                                                            className="btn-secondary"
                                                            style={{ fontSize: '13px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                        >
                                                            💬 Live Chat
                                                        </button>

                                                        {vendor?.whatsapp_number && (
                                                            <a 
                                                                href={`https://wa.me/${vendor.whatsapp_number}?text=${haggleText}`} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="btn-secondary"
                                                                style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', padding: '8px 10px' }}
                                                            >
                                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                                                </svg>
                                                                WhatsApp
                                                            </a>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() => setSelectedReviewProduct(product)}
                                                        className="btn-secondary"
                                                        style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                                                    >
                                                        ⭐ Reviews ({reviewsByProduct[product.id]?.length || 0})
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            
                            {/* Load More Button if results exceed current display limit */}
                            {filteredProducts.length > displayLimit && (
                                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                                    <button
                                        onClick={() => setDisplayLimit(prev => prev + 24)}
                                        className="btn-secondary"
                                        style={{ padding: '12px 32px', fontSize: '15px', borderRadius: '30px' }}
                                    >
                                        Load More Products ({filteredProducts.length - displayLimit} remaining)
                                    </button>
                                </div>
                            )}
                        </>
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

                                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '20px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                        <span>Subtotal (Excl. VAT):</span>
                                        <span>${((totalCents / 1.15) / 100).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                        <span>VAT (15%):</span>
                                        <span>${((totalCents - (totalCents / 1.15)) / 100).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px', color: 'var(--text-primary)', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                                        <span>Total Amount:</span>
                                        <span style={{ color: 'var(--accent-primary)' }}>{getFormattedPrice(totalCents)}</span>
                                    </div>
                                    {currency === 'USD' && (
                                        <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            ≈ ZiG {((totalCents / 100) * zigRate).toFixed(2)}
                                        </div>
                                    )}
                                </div>

                                {!isCheckingOut ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <button 
                                            onClick={() => setIsCheckingOut(true)}
                                            className="btn-primary"
                                            style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '10px', fontWeight: '700' }}
                                        >
                                            🔒 Checkout Securely (EcoCash / Card)
                                        </button>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowQuotationModal(true)}
                                                className="btn-secondary"
                                                style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                📄 Pro-Forma PDF
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleWhatsAppCartOrder}
                                                className="btn-secondary"
                                                style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: '#25D366', color: '#25D366' }}
                                            >
                                                💬 WhatsApp Order
                                            </button>
                                        </div>
                                    </div>
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
            )}

            {/* Pro-Forma Tax Quotation Modal */}
            {showQuotationModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
                    <div className="glass-panel animate-fade-in-up quotation-print-container" style={{ width: '100%', maxWidth: '750px', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '16px', padding: '36px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }}>
                        
                        {/* Action Header - Hidden on Print */}
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>📄</span>
                                <div>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Official Pro-Forma Tax Quotation</h3>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>ZIMRA 15% VAT Compliant Dual-Currency Quote</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => window.print()}
                                    style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    🖨️ Print / Save PDF
                                </button>
                                <button 
                                    onClick={() => setShowQuotationModal(false)}
                                    style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>

                        {/* Printable Quote Sheet */}
                        <div style={{ border: '2px solid #0f172a', borderRadius: '8px', padding: '24px', backgroundColor: '#ffffff' }}>
                            
                            {/* Company Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                                <div>
                                    <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>ZimMarket Marketplace</h1>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>Harare CBD & Nationwide Multi-Vendor Network</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#475569' }}>Zimbabwe • www.zimmarket.co.zw • info@zimmarket.co.zw</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>VAT Reg: 10048291 • BP No: 0200194821</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '4px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: '800', display: 'inline-block', marginBottom: '8px' }}>
                                        PRO-FORMA QUOTATION
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Quote #: QT-{Date.now().toString().slice(-7)}</div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', marginTop: '4px' }}>Valid For: 14 Calendar Days</div>
                                </div>
                            </div>

                            {/* Client & Vendor Information */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>Quotation Issued To:</div>
                                    <div className="no-print" style={{ marginBottom: '6px' }}>
                                        <input 
                                            type="text"
                                            placeholder="Enter Customer / Company Name"
                                            value={quotationCustomerName}
                                            onChange={(e) => setQuotationCustomerName(e.target.value)}
                                            style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                                        {quotationCustomerName || 'Valued ZimMarket Buyer'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>Delivery Destination: Zimbabwe (CBD / Express)</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>Fulfillment Store:</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                                        {vendorProfiles[cartArray[0]?.product.shop_id]?.store_name || 'Verified ZimMarket Vendor'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>
                                        Contact: {vendorProfiles[cartArray[0]?.product.shop_id]?.whatsapp_number ? `+${vendorProfiles[cartArray[0]?.product.shop_id].whatsapp_number}` : 'Via ZimMarket Escrow'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>✔ ZimMarket Escrow Buyer Protected</div>
                                </div>
                            </div>

                            {/* Itemized Quotation Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                                        <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                                        <th style={{ padding: '8px 10px' }}>Description / SKU</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Unit (USD)</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (USD)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartArray.map((item, idx) => {
                                        const variation = [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ');
                                        const itemTotal = item.product.price_cents * item.quantity;
                                        return (
                                            <tr key={item.cartItemId} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.product.title}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                        {item.product.item_no ? `SKU: ${item.product.item_no} • ` : ''}
                                                        {variation ? `Options: ${variation}` : 'Standard Unit'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>{item.quantity}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>${(item.product.price_cents / 100).toFixed(2)}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>${(itemTotal / 100).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Totals & Tax Breakdown */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                                <div style={{ width: '280px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                                        <span>Subtotal (Excl. VAT):</span>
                                        <span style={{ fontWeight: '600' }}>${((totalCents / 1.15) / 100).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                                        <span>VAT (15% Standard):</span>
                                        <span style={{ fontWeight: '600' }}>${((totalCents - (totalCents / 1.15)) / 100).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900', color: '#0f172a', borderTop: '2px solid #0f172a', paddingTop: '8px', marginBottom: '4px' }}>
                                        <span>TOTAL (USD):</span>
                                        <span style={{ color: '#059669' }}>${(totalCents / 100).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', color: '#1e40af', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                                        <span>TOTAL (ZiG @ {zigRate}):</span>
                                        <span>ZiG {((totalCents / 100) * zigRate).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Instructions & Banking */}
                            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', fontSize: '11px', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>💳 Accepted Payment Methods:</div>
                                    <div>• EcoCash Merchant: <strong>*151*2*2*91823#</strong></div>
                                    <div>• Stanbic / CABS USD Nostro & ZiG RTGS</div>
                                    <div>• ZimMarket Escrow Protection Included</div>
                                </div>
                                <div>
                                    <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>📌 Quotation Terms:</div>
                                    <div>• Prices valid for 14 calendar days from date above.</div>
                                    <div>• All goods inspected prior to customer dispatch.</div>
                                    <div>• Full refund if item not delivered as described.</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}