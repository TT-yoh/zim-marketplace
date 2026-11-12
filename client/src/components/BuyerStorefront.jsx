// client/src/components/BuyerStorefront.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';
import { useChat } from './ChatContext.jsx';
import { getEffectiveZigRate, getStoreEffectiveZigRate } from '../utils/exchangeRateService.js';
import { HeroSection } from './HeroSection.jsx';
import { GlobalSearchModal } from './GlobalSearchModal.jsx';
import { MerchantStorefrontModal } from './MerchantStorefrontModal.jsx';
import { setSearchParam } from '../utils/navigation.js';
import { VendorStoreBanner } from './storefront/VendorStoreBanner.jsx';
import { CatalogFilters } from './storefront/CatalogFilters.jsx';
import { ProductGrid } from './storefront/ProductGrid.jsx';
import { ProductList } from './storefront/ProductList.jsx';
import { CartDrawer } from './storefront/CartDrawer.jsx';
import { ReviewsModal } from './storefront/ReviewsModal.jsx';
import { QuickViewModal } from './storefront/QuickViewModal.jsx';
import { QuotationModal } from './storefront/QuotationModal.jsx';

const CART_STORAGE_KEY = 'zimmarket_cart';

function loadSavedCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

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

export function BuyerStorefront({ buyerId, currency = 'USD', zigRate = getEffectiveZigRate(), formatPrice, setCurrentView, isVendor = false }) {
    const { showToast } = useToast();
    const { startChatWithVendor } = useChat();
    const [products, setProducts] = useState(() => globalStorefrontCache.products || []);
    const [vendorProfiles, setVendorProfiles] = useState(() => globalStorefrontCache.vendorProfiles || {});
    const [dbCategories, setDbCategories] = useState(() => globalStorefrontCache.dbCategories || []);
    const [loading, setLoading] = useState(() => !globalStorefrontCache.products || globalStorefrontCache.products.length === 0);

    // Enhanced formatPrice helper with store-specific ZiG rate support
    const getFormattedPrice = (cents, targetCurrency = null, shopId = null) => {
        if (!cents || isNaN(cents) || cents <= 0) return 'Price on Request';
        const activeCurr = targetCurrency || currency;
        const usd = cents / 100;
        if (activeCurr === 'ZiG') {
            const sid = shopId || (selectedVendorShopId !== 'All' ? selectedVendorShopId : null);
            const vendor = sid ? vendorProfiles[sid] : null;
            const effectiveRate = vendor ? getStoreEffectiveZigRate(vendor, zigRate) : zigRate;
            return `ZiG ${(usd * effectiveRate).toFixed(2)}`;
        }
        if (formatPrice) return formatPrice(cents, activeCurr);
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
    // Persisted so the cart survives signing in, email confirmation and page refreshes
    const [cart, setCart] = useState(loadSavedCart);
    useEffect(() => {
        try {
            if (Object.keys(cart).length === 0) {
                localStorage.removeItem(CART_STORAGE_KEY);
            } else {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            }
        } catch (e) {
            // Storage full or blocked: the cart still works for this visit
        }
    }, [cart]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [quotationCustomerName, setQuotationCustomerName] = useState('');
    const [selectedVariations, setSelectedVariations] = useState({});
    const [recentlyAddedId, setRecentlyAddedId] = useState(null);
    const [cartBouncing, setCartBouncing] = useState(false);

    // Modal & Review States (declared before keydown listener to prevent TDZ ReferenceError)
    const [quickViewProduct, setQuickViewProduct] = useState(null);

    // Keep ?product=<id> in the URL while a product is open so it can be shared or bookmarked
    const quickViewOpenedRef = React.useRef(false);
    useEffect(() => {
        if (quickViewProduct?.id) {
            quickViewOpenedRef.current = true;
            setSearchParam('product', quickViewProduct.id);
        } else if (quickViewOpenedRef.current) {
            setSearchParam('product', null);
        }
    }, [quickViewProduct]);

    // Open a shared product link (?product=<id>) once products have loaded
    const sharedProductHandledRef = React.useRef(false);
    useEffect(() => {
        if (sharedProductHandledRef.current || products.length === 0) return;
        const productId = new URLSearchParams(window.location.search).get('product');
        if (!productId) {
            sharedProductHandledRef.current = true;
            return;
        }
        const shared = products.find(p => String(p.id) === productId);
        if (shared) {
            sharedProductHandledRef.current = true;
            setQuickViewProduct(shared);
        }
    }, [products]);

    const handleShareProduct = async (product) => {
        const url = `${window.location.origin}/product/${product.id}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: product.title, text: `${product.title} on ZimMarket`, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            showToast('🔗 Product link copied. Paste it into WhatsApp or anywhere.', 'success');
        } catch (e) {
            if (e?.name !== 'AbortError') showToast(`Share this link: ${url}`, 'info', 8000);
        }
    };
    const [selectedReviewProduct, setSelectedReviewProduct] = useState(null);
    const [reviewsByProduct, setReviewsByProduct] = useState({});

    // Global Search & Merchant Storefront States
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [storefrontModalVendor, setStorefrontModalVendor] = useState(null);

    // Filters, Sorting & Wishlist
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubCategory, setSelectedSubCategory] = useState('All');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [selectedCondition, setSelectedCondition] = useState('All');
    const [selectedVendorShopId, setSelectedVendorShopId] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [displayLimit, setDisplayLimit] = useState(24);

    // Modern Platform Display: Grid vs. List View Mode (Amazon / Takealot style)
    const [viewMode, setViewMode] = useState(() => {
        try {
            return localStorage.getItem('zimmarket_view_mode') || 'grid';
        } catch (e) {
            return 'grid';
        }
    });

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        try {
            localStorage.setItem('zimmarket_view_mode', mode);
        } catch (e) {
            console.warn('Could not save viewMode:', e);
        }
    };

    // Quick-filter states
    const [onlyPromos, setOnlyPromos] = useState(false);
    const [onlyVerified, setOnlyVerified] = useState(false);
    const [onlyInStock, setOnlyInStock] = useState(false);

    // Listen for search open requests from navbar or shortcuts
    useEffect(() => {
        const handleOpenSearch = () => {
            setIsSearchModalOpen(true);
        };
        window.addEventListener('zimmarket_open_search', handleOpenSearch);
        return () => window.removeEventListener('zimmarket_open_search', handleOpenSearch);
    }, []);

    // Check URL parameters for ?store=<slug> to automatically open merchant storefront modal
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const storeSlug = params.get('store');
        if (storeSlug && Object.keys(vendorProfiles).length > 0) {
            const foundVendor = Object.values(vendorProfiles).find(v => 
                v.store_slug === storeSlug || 
                v.store_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') === storeSlug
            );
            if (foundVendor) {
                setStorefrontModalVendor(foundVendor);
            }
        }
    }, [vendorProfiles]);

    // Global keyboard listener to dismiss open modals/drawers smoothly
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isSearchModalOpen) {
                    setIsSearchModalOpen(false);
                } else if (storefrontModalVendor) {
                    setStorefrontModalVendor(null);
                } else if (isCartOpen) {
                    setIsCartOpen(false);
                    setIsCheckingOut(false);
                } else if (quickViewProduct) {
                    setQuickViewProduct(null);
                } else if (selectedReviewProduct) {
                    setSelectedReviewProduct(null);
                } else if (showQuotationModal) {
                    setShowQuotationModal(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchModalOpen, storefrontModalVendor, isCartOpen, quickViewProduct, selectedReviewProduct, showQuotationModal]);

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
        setOnlyPromos(false);
        setOnlyVerified(false);
        setOnlyInStock(false);
    };

    useEffect(() => {
        async function loadStorefront() {
            try {
                const PROMO_COLS = 'id, item_no, title, description, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit, is_promotion, promo_discount_percent, is_featured_hero';
                const BASE_COLS = 'id, item_no, title, description, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit';

                let activeColumns = PROMO_COLS;

                // Fetch Products, Vendor Profiles, Reviews, and Categories
                let [productsRes, vendorsRes, reviewsRes, categoriesRes] = await Promise.all([
                    supabase
                        .from('products')
                        .select(activeColumns, { count: 'exact' })
                        .gt('stock_quantity', 0)
                        .order('price_cents', { ascending: false })
                        .range(0, 999),
                    supabase
                        .from('vendor_profiles')
                        .select('*'),
                    supabase
                        .from('reviews')
                        .select('vendor_id, product_id, rating'),
                    supabase
                        .from('categories')
                        .select('*')
                        .order('display_order', { ascending: true })
                ]);

                // Gracefully fallback to base columns if promotion columns are not present in schema
                if (productsRes.error && (productsRes.error.code === '42703' || productsRes.error.message?.includes('does not exist'))) {
                    console.warn("Notice: Promotion columns not found on products table, streaming base inventory:", productsRes.error.message);
                    activeColumns = BASE_COLS;
                    productsRes = await supabase
                        .from('products')
                        .select(activeColumns, { count: 'exact' })
                        .gt('stock_quantity', 0)
                        .order('price_cents', { ascending: false })
                        .range(0, 999);
                }

                if (categoriesRes.data) {
                    setDbCategories(categoriesRes.data);
                }

                if (productsRes.error) throw productsRes.error;

                const vendorMap = {};
                if (vendorsRes.data) {
                    vendorsRes.data.forEach(v => vendorMap[v.id] = v);
                }

                let allStorefrontProducts = (productsRes.data || []).map(p => {
                    const v = vendorMap[p.shop_id];
                    return {
                        ...p,
                        shop_name: v?.store_name || 'Store in App',
                        is_verified: v?.is_verified ?? false,
                        is_promotion: p.is_promotion ?? false,
                        promo_discount_percent: p.promo_discount_percent ?? 0,
                        is_featured_hero: p.is_featured_hero ?? false
                    };
                });
                const totalStorefrontCount = productsRes.count || allStorefrontProducts.length;

                let activeProducts = allStorefrontProducts.filter(p => {
                    const v = vendorMap[p.shop_id];
                    return !v || v.is_active !== false;
                });

                // Immediately display first batch
                setProducts(activeProducts);

                // If in-stock catalog exceeds 1,000 items, fetch remaining batches in parallel
                if (totalStorefrontCount > allStorefrontProducts.length) {
                    const storefrontPromises = [];
                    for (let offset = 1000; offset < totalStorefrontCount; offset += 1000) {
                        storefrontPromises.push(
                            supabase
                                .from('products')
                                .select(activeColumns)
                                .gt('stock_quantity', 0)
                                .order('price_cents', { ascending: false })
                                .range(offset, offset + 999)
                        );
                    }

                    try {
                        const batchResults = await Promise.all(storefrontPromises);
                        batchResults.forEach(res => {
                            if (res.data && res.data.length > 0) {
                                const enrichedBatch = res.data.map(p => {
                                    const v = vendorMap[p.shop_id];
                                    return {
                                        ...p,
                                        shop_name: v?.store_name || 'Store in App',
                                        is_verified: v?.is_verified ?? false,
                                        is_promotion: p.is_promotion ?? false,
                                        promo_discount_percent: p.promo_discount_percent ?? 0,
                                        is_featured_hero: p.is_featured_hero ?? false
                                    };
                                });
                                allStorefrontProducts = allStorefrontProducts.concat(enrichedBatch);
                            }
                        });

                        // Update with complete inventory
                        activeProducts = allStorefrontProducts.filter(p => {
                            const v = vendorMap[p.shop_id];
                            return !v || v.is_active !== false;
                        });
                        setProducts(activeProducts);
                    } catch (batchErr) {
                        console.warn("Storefront batch fetching notice:", batchErr);
                    }
                }

                let prodReviews = {};
                if (reviewsRes.data) {
                    const vendorRatings = {}; // { vendor_id: { sum, count } }

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

                // Auto-detect vanity store slug or vendor id from URL (e.g. ?store=mms-autoparts)
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const storeSlugParam = urlParams.get('store');
                    const vendorIdParam = urlParams.get('vendor');

                    if (storeSlugParam || vendorIdParam) {
                        const matched = Object.values(vendorMap).find(v => {
                            if (vendorIdParam && v.id === vendorIdParam) return true;
                            if (storeSlugParam) {
                                const cleanSlug = storeSlugParam.toLowerCase().trim();
                                if (v.store_slug && v.store_slug.toLowerCase() === cleanSlug) return true;
                                if (v.store_name && v.store_name.toLowerCase().replace(/[^a-z0-9]/g, '-') === cleanSlug) return true;
                            }
                            return false;
                        });
                        if (matched) {
                            setSelectedVendorShopId(matched.id);
                        }
                    }
                } catch (e) {
                    console.warn("Could not parse store URL params:", e);
                }

                // Update global SWR and persistent cache for instant 0ms tab switching
                const updatedCache = {
                    products: activeProducts,
                    vendorProfiles: vendorMap,
                    reviewsByProduct: reviewsRes.data ? prodReviews : (globalStorefrontCache.reviewsByProduct || {}),
                    dbCategories: categoriesRes.data || globalStorefrontCache.dbCategories || [],
                    timestamp: Date.now()
                };
                globalStorefrontCache = updatedCache;
                try {
                    // Save lightweight slice in localStorage to guarantee 0ms instant warm boots
                    const lightweightCache = {
                        products: activeProducts.slice(0, 150),
                        vendorProfiles: vendorMap,
                        reviewsByProduct: reviewsRes.data ? prodReviews : (globalStorefrontCache.reviewsByProduct || {}),
                        dbCategories: categoriesRes.data || globalStorefrontCache.dbCategories || [],
                        timestamp: Date.now()
                    };
                    localStorage.setItem('zimmarket_storefront_cache', JSON.stringify(lightweightCache));
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
            if (currentQty >= product.stock_quantity) {
                showToast(`⚠️ Maximum available stock (${product.stock_quantity}) reached for this item.`, "warning");
                return prev;
            }

            // Tactile visual feedback
            setRecentlyAddedId(product.id);
            setTimeout(() => setRecentlyAddedId(null), 1200);

            setCartBouncing(true);
            setTimeout(() => setCartBouncing(false), 500);

            const shortTitle = product.title.length > 28 ? `${product.title.slice(0, 28)}...` : product.title;
            showToast(`🛒 Added "${shortTitle}" to your cart!`, "success", 2500);

            return {
                ...prev,
                [cartItemId]: { product, quantity: currentQty + 1, selectedColor, selectedSize, cartItemId }
            };
        });
    };

    const updateCartQuantity = (cartItemId, delta) => {
        setCart(prev => {
            const existing = prev[cartItemId];
            if (!existing) return prev;
            const newQty = existing.quantity + delta;
            if (newQty <= 0) {
                const updated = { ...prev };
                delete updated[cartItemId];
                showToast(`Removed "${existing.product.title.slice(0, 24)}..." from cart.`, "info", 2000);
                return updated;
            }
            if (newQty > existing.product.stock_quantity) {
                showToast(`⚠️ Only ${existing.product.stock_quantity} available in stock.`, "warning");
                return prev;
            }
            return {
                ...prev,
                [cartItemId]: { ...existing, quantity: newQty }
            };
        });
    };

    const removeCartItem = (cartItemId) => {
        setCart(prev => {
            const existing = prev[cartItemId];
            const updated = { ...prev };
            delete updated[cartItemId];
            if (existing) {
                showToast(`Removed "${existing.product.title.slice(0, 24)}..." from cart.`, "info", 2000);
            }
            return updated;
        });
    };

    const removeFromCart = (cartItemId) => {
        updateCartQuantity(cartItemId, -1);
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
        const firstShopId = cartArray[0]?.product?.shop_id || (selectedVendorShopId !== 'All' ? selectedVendorShopId : null);
        const firstVendor = firstShopId ? vendorProfiles[firstShopId] : null;
        const activeStoreRate = firstVendor ? getStoreEffectiveZigRate(firstVendor, zigRate) : zigRate;
        msg += `*Total Amount: $${(totalCents / 100).toFixed(2)} (≈ ZiG ${((totalCents / 100) * activeStoreRate).toFixed(2)})*\n\n`;
        msg += `Please confirm availability and delivery timeframe. Thank you!`;

        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const copyStoreLink = (vendor) => {
        if (!vendor) return;
        const slug = vendor.store_slug || vendor.store_name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const url = `${window.location.origin}/?store=${slug}`;
        navigator.clipboard.writeText(url);
        showToast(`Store link for "${vendor.store_name}" copied to clipboard!`, 'success');
    };

    const shareStoreWhatsApp = (vendor) => {
        if (!vendor) return;
        const slug = vendor.store_slug || vendor.store_name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const url = `${window.location.origin}/?store=${slug}`;
        const text = encodeURIComponent(`Shop directly from ${vendor.store_name} on ZimMarket: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    // Memoized Filter & Sort Logic for instant UI rendering and smooth typing
    const filteredProducts = React.useMemo(() => {
        const cleanSearch = searchTerm.trim().toLowerCase();
        const minP = minPrice !== '' ? parseFloat(minPrice) : null;
        const maxP = maxPrice !== '' ? parseFloat(maxPrice) : null;

        return products.filter(product => {
            if (cleanSearch) {
                const matchTitle = product.title && product.title.toLowerCase().includes(cleanSearch);
                const matchItemNo = product.item_no && product.item_no.toLowerCase().includes(cleanSearch);
                if (!matchTitle && !matchItemNo) return false;
            }
            
            if (selectedCategory === '❤️ Favorites') {
                if (!favorites.includes(product.id)) return false;
            } else if (selectedCategory !== 'All') {
                if (product.category !== selectedCategory) return false;
            }

            if (selectedSubCategory !== 'All' && product.sub_category !== selectedSubCategory) return false;
            if (selectedCondition !== 'All' && product.condition !== selectedCondition) return false;
            if (selectedVendorShopId !== 'All' && product.shop_id !== selectedVendorShopId) return false;

            // Quick Filters (Hot Deals, Verified Stores, In-Stock Only)
            if (onlyPromos && !product.is_promotion && !(product.promo_discount_percent > 0)) return false;
            if (onlyVerified) {
                const v = vendorProfiles[product.shop_id];
                if (!v?.is_verified && !product.is_verified) return false;
            }
            if (onlyInStock && (!product.stock_quantity || product.stock_quantity <= 0)) return false;

            const priceUsd = (product.price_cents || 0) / 100;
            if (minP !== null && !isNaN(minP) && priceUsd < minP) return false;
            if (maxP !== null && !isNaN(maxP) && priceUsd > maxP) return false;

            return true;
        }).sort((a, b) => {
            // Prioritize items with active set prices so priced inventory always appears first
            const aHasPrice = (a.price_cents || 0) > 0 ? 1 : 0;
            const bHasPrice = (b.price_cents || 0) > 0 ? 1 : 0;
            if (aHasPrice !== bHasPrice) return bHasPrice - aHasPrice;

            if (sortBy === 'price_asc') return (a.price_cents || 0) - (b.price_cents || 0);
            if (sortBy === 'price_desc') return (b.price_cents || 0) - (a.price_cents || 0);
            if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }, [products, searchTerm, selectedCategory, selectedSubCategory, selectedCondition, selectedVendorShopId, minPrice, maxPrice, sortBy, favorites, onlyPromos, onlyVerified, onlyInStock, vendorProfiles]);

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading ZimMarket...</div>;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
            
            {/* High-Performance Glassmorphic Hero Section */}
            <HeroSection
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categories={uniqueCategories}
                products={products}
                vendorProfiles={vendorProfiles}
                onSelectStore={(shopId) => {
                    const vp = vendorProfiles[shopId];
                    if (vp) {
                        setStorefrontModalVendor(vp);
                    } else {
                        setSelectedVendorShopId(shopId);
                        document.getElementById('storefront-catalog')?.scrollIntoView({ behavior: 'smooth' });
                    }
                }}
                currency={currency}
                zigRate={zigRate}
                formatPrice={getFormattedPrice}
                setCurrentView={setCurrentView}
                isVendor={isVendor}
                onOpenQuotation={() => setShowQuotationModal(true)}
                onQuickView={setQuickViewProduct}
                onAddToCart={addToCart}
                onSelectSort={setSortBy}
            />

            <div className="storefront-layout" id="storefront-catalog">
                
                {/* Main Storefront Area */}
                <div className="storefront-products">
                    
                    {/* Interactive Global Search Hero Bar */}
                    <div 
                        className="storefront-search-hero-bar"
                        onClick={() => setIsSearchModalOpen(true)}
                        title="Click to search products, brands, or verified Zimbabwe stores (Ctrl + K)"
                    >
                        <span style={{ fontSize: '18px', color: 'var(--accent-primary)' }}>🔍</span>
                        <span style={{ fontSize: '13.5px', color: 'var(--text-muted)', flex: 1, fontWeight: '500' }}>
                            {searchTerm ? `Active Search: "${searchTerm}" • Tap to search or browse categories` : 'Search 100+ items across Harare & Bulawayo... (Press Ctrl + K or Click here)'}
                        </span>
                        {searchTerm ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchTerm('');
                                }}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear "{searchTerm}" ✕
                            </button>
                        ) : (
                            <kbd style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border)',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontWeight: '700'
                            }}>
                                Ctrl K
                            </kbd>
                        )}
                    </div>
                    
                    {/* Branded Vendor Store Banner when filtered by store */}
                    <VendorStoreBanner
                        copyStoreLink={copyStoreLink}
                        filteredProducts={filteredProducts}
                        selectedVendorShopId={selectedVendorShopId}
                        setSelectedVendorShopId={setSelectedVendorShopId}
                        shareStoreWhatsApp={shareStoreWhatsApp}
                        vendorProfiles={vendorProfiles}
                        zigRate={zigRate}
                    />
                    
                    <CatalogFilters
                        categories={categories}
                        categoryIconMap={categoryIconMap}
                        conditions={conditions}
                        filteredProducts={filteredProducts}
                        handleViewModeChange={handleViewModeChange}
                        maxPrice={maxPrice}
                        minPrice={minPrice}
                        onlyInStock={onlyInStock}
                        onlyPromos={onlyPromos}
                        onlyVerified={onlyVerified}
                        products={products}
                        resetFilters={resetFilters}
                        searchTerm={searchTerm}
                        selectedCategory={selectedCategory}
                        selectedCondition={selectedCondition}
                        selectedSubCategory={selectedSubCategory}
                        selectedVendorShopId={selectedVendorShopId}
                        setMaxPrice={setMaxPrice}
                        setMinPrice={setMinPrice}
                        setOnlyInStock={setOnlyInStock}
                        setOnlyPromos={setOnlyPromos}
                        setOnlyVerified={setOnlyVerified}
                        setSelectedCategory={setSelectedCategory}
                        setSelectedCondition={setSelectedCondition}
                        setSelectedSubCategory={setSelectedSubCategory}
                        setSelectedVendorShopId={setSelectedVendorShopId}
                        setSortBy={setSortBy}
                        sortBy={sortBy}
                        subCategoriesMap={subCategoriesMap}
                        vendorProfiles={vendorProfiles}
                        viewMode={viewMode}
                    />

                    {filteredProducts.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>No products match your criteria</h3>
                            <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>Try clearing filters or adjusting your price range and search keywords.</p>
                            <button 
                                type="button"
                                onClick={resetFilters}
                                className="btn-primary"
                                style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px' }}
                            >
                                Reset All Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'grid' ? (
                                <ProductGrid
                                    addToCart={addToCart}
                                    buyerId={buyerId}
                                    cart={cart}
                                    categoryIconMap={categoryIconMap}
                                    displayLimit={displayLimit}
                                    favorites={favorites}
                                    filteredProducts={filteredProducts}
                                    getColorHex={getColorHex}
                                    getFormattedPrice={getFormattedPrice}
                                    handleVariationChange={handleVariationChange}
                                    loading={loading}
                                    recentlyAddedId={recentlyAddedId}
                                    reviewsByProduct={reviewsByProduct}
                                    selectedVariations={selectedVariations}
                                    setQuickViewProduct={setQuickViewProduct}
                                    setSelectedReviewProduct={setSelectedReviewProduct}
                                    setStorefrontModalVendor={setStorefrontModalVendor}
                                    startChatWithVendor={startChatWithVendor}
                                    toggleFavorite={toggleFavorite}
                                    vendorProfiles={vendorProfiles}
                                    zigRate={zigRate}
                                />
                            ) : (
                                <ProductList
                                    addToCart={addToCart}
                                    buyerId={buyerId}
                                    categoryIconMap={categoryIconMap}
                                    displayLimit={displayLimit}
                                    favorites={favorites}
                                    filteredProducts={filteredProducts}
                                    getColorHex={getColorHex}
                                    getFormattedPrice={getFormattedPrice}
                                    handleVariationChange={handleVariationChange}
                                    loading={loading}
                                    recentlyAddedId={recentlyAddedId}
                                    reviewsByProduct={reviewsByProduct}
                                    selectedVariations={selectedVariations}
                                    setQuickViewProduct={setQuickViewProduct}
                                    setSelectedReviewProduct={setSelectedReviewProduct}
                                    setStorefrontModalVendor={setStorefrontModalVendor}
                                    startChatWithVendor={startChatWithVendor}
                                    toggleFavorite={toggleFavorite}
                                    vendorProfiles={vendorProfiles}
                                    zigRate={zigRate}
                                />
                            )}
                            
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
                className={`btn-primary glass-panel ${cartBouncing ? 'animate-cart-bounce' : 'animate-fade-in-up'}`}
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
                    fontSize: '15px',
                    transition: 'all 0.2s ease'
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
                <CartDrawer
                    buyerId={buyerId}
                    cart={cart}
                    cartArray={cartArray}
                    currency={currency}
                    formatPrice={formatPrice}
                    getFormattedPrice={getFormattedPrice}
                    handleWhatsAppCartOrder={handleWhatsAppCartOrder}
                    isCheckingOut={isCheckingOut}
                    products={products}
                    removeCartItem={removeCartItem}
                    selectedVendorShopId={selectedVendorShopId}
                    setCart={setCart}
                    setCurrentView={setCurrentView}
                    setIsCartOpen={setIsCartOpen}
                    setIsCheckingOut={setIsCheckingOut}
                    setShowQuotationModal={setShowQuotationModal}
                    totalCents={totalCents}
                    updateCartQuantity={updateCartQuantity}
                    vendorProfiles={vendorProfiles}
                    zigRate={zigRate}
                />
            )}

            {/* Product Reviews Modal */}
            {selectedReviewProduct && (
                <ReviewsModal reviewsByProduct={reviewsByProduct} selectedReviewProduct={selectedReviewProduct} setSelectedReviewProduct={setSelectedReviewProduct} />
            )}

            {/* Quick View Product Detail Modal */}
            {quickViewProduct && (
                <QuickViewModal
                    addToCart={addToCart}
                    buyerId={buyerId}
                    getColorHex={getColorHex}
                    getFormattedPrice={getFormattedPrice}
                    handleShareProduct={handleShareProduct}
                    handleVariationChange={handleVariationChange}
                    quickViewProduct={quickViewProduct}
                    reviewsByProduct={reviewsByProduct}
                    selectedVariations={selectedVariations}
                    setQuickViewProduct={setQuickViewProduct}
                    setSelectedReviewProduct={setSelectedReviewProduct}
                    setStorefrontModalVendor={setStorefrontModalVendor}
                    startChatWithVendor={startChatWithVendor}
                    vendorProfiles={vendorProfiles}
                />
            )}

            {/* Pro-Forma Tax Quotation Modal */}
            {showQuotationModal && (
                <QuotationModal
                    cart={cart}
                    cartArray={cartArray}
                    quotationCustomerName={quotationCustomerName}
                    selectedVendorShopId={selectedVendorShopId}
                    setQuotationCustomerName={setQuotationCustomerName}
                    setShowQuotationModal={setShowQuotationModal}
                    totalCents={totalCents}
                    vendorProfiles={vendorProfiles}
                    zigRate={zigRate}
                />
            )}

            {/* Interactive Global Search & Command Palette Modal */}
            <GlobalSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                products={products}
                vendorProfiles={vendorProfiles}
                categories={uniqueCategories}
                formatPrice={getFormattedPrice}
                currency={currency}
                onSelectProduct={setQuickViewProduct}
                onSelectStore={(shopId) => {
                    const v = vendorProfiles[shopId];
                    if (v) {
                        setStorefrontModalVendor(v);
                        const slug = v.store_slug || v.store_name?.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        if (slug) window.history.pushState({}, '', `?store=${slug}`);
                    }
                }}
                onApplySearch={(term) => {
                    setSearchTerm(term);
                    document.getElementById('storefront-catalog')?.scrollIntoView({ behavior: 'smooth' });
                }}
                onAddToCart={addToCart}
            />

            {/* Merchant Storefront Profile & Catalog Modal */}
            <MerchantStorefrontModal
                isOpen={Boolean(storefrontModalVendor)}
                onClose={() => {
                    setStorefrontModalVendor(null);
                    if (window.location.search.includes('store=')) {
                        window.history.pushState({}, '', window.location.pathname);
                    }
                }}
                vendor={storefrontModalVendor}
                products={products}
                formatPrice={getFormattedPrice}
                currency={currency}
                zigRate={zigRate}
                onAddToCart={addToCart}
                onQuickView={setQuickViewProduct}
                onViewInCatalog={(shopId) => {
                    setSelectedVendorShopId(shopId);
                    document.getElementById('storefront-catalog')?.scrollIntoView({ behavior: 'smooth' });
                }}
            />
        </div>
    );
}