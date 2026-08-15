import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { ProductUploadForm } from './ProductUploadForm.jsx';
import { VendorProfileSetup } from './VendorProfileSetup.jsx';
import { BulkProductUpload } from './BulkProductUpload.jsx';
import { VendorWallet } from './VendorWallet.jsx';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';
import { useToast } from './ToastContext.jsx';
import { useModal } from './ModalContext.jsx';

export function VendorInventory({ shopId, setCurrentView, currency = 'USD', formatPrice }) {
    const { showToast } = useToast();
    const { showConfirm, showPrompt } = useModal();
    const getFormattedPrice = (cents) => {
        if (formatPrice) return formatPrice(cents, currency);
        return `$${((cents || 0) / 100).toFixed(2)}`;
    };

    const [products, setProducts] = useState([]);
    const [hasProfile, setHasProfile] = useState(null);
    const [vendorProfile, setVendorProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'bulk'
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [salesStats, setSalesStats] = useState({
        totalRevenue: 0,
        completedOrdersCount: 0,
        topProducts: []
    });

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        priceIncl: '',
        stockQuantity: 1,
        colors: '',
        sizes: '',
        unit: 'EA',
        imageUrl: ''
    });
    const [savingEdit, setSavingEdit] = useState(false);

    const handleStartEdit = (product) => {
        setEditingId(product.id);
        setEditForm({
            title: product.title || '',
            priceIncl: (product.price_cents / 100).toFixed(2),
            stockQuantity: product.stock_quantity ?? 1,
            colors: Array.isArray(product.colors) ? product.colors.join(', ') : '',
            sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
            unit: product.unit || 'EA',
            imageUrl: product.image_url || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleEditFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            try {
                const uploadedUrl = await uploadImageToStorage(file, 'product-images', shopId);
                if (uploadedUrl) {
                    setEditForm(prev => ({ ...prev, imageUrl: uploadedUrl }));
                }
            } catch (err) {
                console.error('File edit upload failed:', err);
            }
        }
    };

    const handleSaveEdit = async (productId) => {
        setSavingEdit(true);
        try {
            const priceInclCents = Math.round(parseFloat(editForm.priceIncl) * 100);
            if (isNaN(priceInclCents)) throw new Error('Invalid price format');

            const parsedColors = editForm.colors.split(',').map(c => c.trim()).filter(Boolean);
            const parsedSizes = editForm.sizes.split(',').map(s => s.trim()).filter(Boolean);

            const { error } = await supabase
                .from('products')
                .update({
                    title: editForm.title,
                    price_cents: priceInclCents,
                    price_incl_vat_cents: priceInclCents,
                    stock_quantity: parseInt(editForm.stockQuantity, 10) || 0,
                    colors: parsedColors,
                    sizes: parsedSizes,
                    unit: editForm.unit,
                    image_url: editForm.imageUrl || null
                })
                .eq('id', productId);

            if (error) throw error;

            setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                    return {
                        ...p,
                        title: editForm.title,
                        price_cents: priceInclCents,
                        price_incl_vat_cents: priceInclCents,
                        stock_quantity: parseInt(editForm.stockQuantity, 10) || 0,
                        colors: parsedColors,
                        sizes: parsedSizes,
                        unit: editForm.unit,
                        image_url: editForm.imageUrl || null
                    };
                }
                return p;
            }));

            setEditingId(null);
        } catch (err) {
            showToast(`Failed saving edit: ${err.message}`, 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const loadInventoryAndProfile = async () => {
        try {
            // Parallelize profile check, product list fetch, and sales analytics fetch
            const [profileRes, productsRes, salesRes] = await Promise.all([
                supabase
                    .from('vendor_profiles')
                    .select('*')
                    .eq('id', shopId)
                    .maybeSingle(),
                supabase
                    .from('products')
                    .select('id, item_no, title, price_cents, price_excl_vat_cents, price_incl_vat_cents, stock_quantity, image_url, category, sub_category, condition, colors, sizes, shop_id, created_at, unit')
                    .eq('shop_id', shopId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('order_items')
                    .select('quantity, price_at_purchase_cents, status')
                    .eq('shop_id', shopId)
            ]);

            if (profileRes.error && profileRes.error.code !== 'PGRST116') {
                throw profileRes.error;
            }

            if (profileRes.data) {
                setHasProfile(true);
                setVendorProfile(profileRes.data);
            } else {
                setHasProfile(false);
            }

            if (productsRes.error) throw productsRes.error;
            setProducts(productsRes.data || []);

            if (salesRes.data && salesRes.data.length > 0) {
                const totalRevenue = salesRes.data
                    .filter(item => item.status === 'delivered')
                    .reduce((sum, item) => sum + (item.price_at_purchase_cents * item.quantity), 0) / 100;
                
                const completedOrdersCount = salesRes.data.filter(item => item.status === 'delivered').length;

                setSalesStats({
                    totalRevenue,
                    completedOrdersCount,
                    topProducts: []
                });
            }
        } catch (err) {
            console.error("Failed loading inventory or profile:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventoryAndProfile();
    }, [shopId]);

    const handleDelete = async (productId) => {
        showConfirm({
            title: "Delete Product",
            message: "Are you sure you want to delete this product listing from your store?",
            type: "warning",
            confirmText: "Delete Item",
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('products')
                        .delete()
                        .eq('id', productId);
                    
                    if (error) throw error;
                    setProducts(prev => prev.filter(p => p.id !== productId));
                    showToast("Product deleted successfully", "success");
                } catch (err) {
                    showToast(`Delete failed: ${err.message}`, "error");
                }
            }
        });
    };

    const handleDeleteAllProducts = async () => {
        if (!products || products.length === 0) {
            showToast("Your inventory is already empty.", "info");
            return;
        }

        showPrompt({
            title: "⚠️ DANGER: Delete All Inventory",
            message: `Are you sure you want to permanently delete ALL ${products.length} products from your store? This action cannot be undone!`,
            type: "danger",
            expectedText: "DELETE ALL",
            placeholder: 'Type "DELETE ALL" to confirm',
            confirmText: "Delete All Products",
            onConfirm: async () => {
                setLoading(true);
                try {
                    const { error } = await supabase
                        .from('products')
                        .delete()
                        .eq('shop_id', shopId);

                    if (error) throw error;

                    setProducts([]);
                    showToast("🗑️ All products have been permanently deleted from your store.", "success");
                } catch (err) {
                    showToast(`Delete All failed: ${err.message}`, "error");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading Dashboard...</div>;

    if (hasProfile === false) {
        return <VendorProfileSetup userId={shopId} onProfileCreated={loadInventoryAndProfile} />;
    }

    const exportToCSV = () => {
        if (!products || products.length === 0) {
            showToast("No products available to export.", "info");
            return;
        }

        const headers = ["Item SKU", "Title", "Category", "Sub-Category", "Condition", "Stock Qty", "Unit Price", "Est. Total Value", "Created Date"];
        const rows = products.map(p => {
            const title = `"${(p.title || '').replace(/"/g, '""')}"`;
            const cat = `"${(p.category || '').replace(/"/g, '""')}"`;
            const subCat = `"${(p.sub_category || '').replace(/"/g, '""')}"`;
            const priceFormatted = getFormattedPrice(p.price_cents);
            const estValueFormatted = getFormattedPrice(p.price_cents * (p.stock_quantity || 0));
            const date = new Date(p.created_at || Date.now()).toLocaleDateString();

            return [
                p.item_no || p.id.split('-')[0],
                title,
                cat,
                subCat,
                p.condition || 'New',
                p.stock_quantity || 0,
                `"${priceFormatted}"`,
                `"${estValueFormatted}"`,
                date
            ].join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ZimMarket_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalProducts = products.length;
    const outOfStock = products.filter(p => p.stock_quantity <= 0).length;
    const totalInventoryValueCents = products.reduce((sum, p) => sum + (p.price_cents * p.stock_quantity), 0);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '32px', color: 'var(--text-primary)', margin: 0 }}>Vendor Dashboard</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => { setUploadMode('single'); setShowUploadModal(true); }}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px' }}
                    >
                        ➕ Add New Product
                    </button>
                    <button
                        onClick={() => { setUploadMode('bulk'); setShowUploadModal(true); }}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px' }}
                    >
                        📁 Bulk CSV Import
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px' }}
                    >
                        📥 Export CSV Report
                    </button>
                    {products.length > 0 && (
                        <button
                            onClick={handleDeleteAllProducts}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '600', fontSize: '14px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            title="Delete all products in your inventory"
                        >
                            🗑️ Clear All Products
                        </button>
                    )}
                </div>
            </div>

            {vendorProfile && !vendorProfile.is_verified && (
                <div style={{ backgroundColor: 'var(--warning-bg, rgba(241, 196, 15, 0.2))', color: 'var(--warning, #f1c40f)', padding: '16px', borderRadius: '8px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong>Your account is unverified.</strong> Buyers trust verified sellers more.
                    </div>
                    <button 
                        className="btn-primary" 
                        onClick={() => setCurrentView('vendor-verification')} 
                        style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'var(--warning)', color: '#000', border: 'none' }}
                    >
                        Get Verified
                    </button>
                </div>
            )}

            {/* Metrics Row */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Total Active Products</div>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)' }}>{totalProducts}</div>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Completed Earnings</div>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--success)' }}>{getFormattedPrice(salesStats.totalRevenue * 100)}</div>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '24px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Est. Inventory Value</div>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-primary)' }}>{getFormattedPrice(totalInventoryValueCents)}</div>
                </div>
                <VendorWallet shopId={shopId} />
            </div>

            {/* Analytics Performance & Low Stock Row */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '40px', flexWrap: 'wrap' }}>
                
                {/* Top Selling Products */}
                <div className="glass-panel" style={{ flex: 1, minWidth: '280px', padding: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🏆 Top Best-Sellers
                    </h4>
                    {salesStats.topProducts.length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No completed sales recorded yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {salesStats.topProducts.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.title}</span>
                                    <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{item.qty} sold</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Low Stock Warning Panel */}
                <div className="glass-panel" style={{ flex: 1, minWidth: '280px', padding: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⚠️ Low Stock Alerts (≤ 2 left)
                    </h4>
                    {products.filter(p => p.stock_quantity <= 2).length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--success)' }}>✔ All products have healthy stock levels.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                            {products.filter(p => p.stock_quantity <= 2).map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 10px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                                    <span>{p.title}</span>
                                    <span style={{ fontWeight: 'bold' }}>{p.stock_quantity === 0 ? 'Out of Stock' : `${p.stock_quantity} left`}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Full Width Inventory Products Table */}
            <div style={{ marginTop: '24px' }}>
                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>Your Listed Inventory ({totalProducts})</h3>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Est. Inventory Value: <strong style={{ color: 'var(--accent-primary)' }}>{getFormattedPrice(totalInventoryValueCents)}</strong>
                        </div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Item No</th>
                                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Name</th>
                                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Unit</th>
                                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Excl VAT</th>
                                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Incl VAT</th>
                                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Stock</th>
                                    <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No products listed yet. Click <strong>"➕ Add New Product"</strong> above to list your first item!
                                        </td>
                                    </tr>
                                ) : (
                                    products.map(product => {
                                        const isEditing = editingId === product.id;

                                        return (
                                            <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isEditing ? 'rgba(59, 130, 246, 0.05)' : 'transparent', transition: 'background-color 0.2s' }}>
                                                <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                    {product.item_no || 'N/A'}
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {product.image_url ? (
                                                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                                                                <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', flexShrink: 0 }} />
                                                        )}
                                                        <div style={{ flex: 1 }}>
                                                            {!isEditing ? (
                                                                <>
                                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{product.title}</div>
                                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product.category || 'Uncategorized'}</div>
                                                                    {(product.colors?.length > 0 || product.sizes?.length > 0) && (
                                                                        <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                                                                            {product.colors?.length > 0 && `Colors: ${product.colors.join(', ')}`}
                                                                            {product.colors?.length > 0 && product.sizes?.length > 0 && ' | '}
                                                                            {product.sizes?.length > 0 && `Sizes: ${product.sizes.join(', ')}`}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-secondary)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                                                        {editForm.imageUrl ? (
                                                                            <img src={editForm.imageUrl} alt="Preview" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                                                                        ) : (
                                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No Photo</span>
                                                                        )}
                                                                        <input 
                                                                            type="file" 
                                                                            accept="image/*"
                                                                            onChange={handleEditFileChange}
                                                                            style={{ fontSize: '11px', flex: 1 }}
                                                                        />
                                                                    </div>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.title}
                                                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                                                        placeholder="Product Title"
                                                                        style={{ padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--border)', width: '100%' }}
                                                                    />
                                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                                        <input 
                                                                            type="text" 
                                                                            value={editForm.colors}
                                                                            onChange={e => setEditForm({ ...editForm, colors: e.target.value })}
                                                                            placeholder="Colors: e.g. Red, Blue"
                                                                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', flex: 1 }}
                                                                        />
                                                                        <input 
                                                                            type="text" 
                                                                            value={editForm.sizes}
                                                                            onChange={e => setEditForm({ ...editForm, sizes: e.target.value })}
                                                                            placeholder="Sizes: e.g. S, M, L"
                                                                            style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', flex: 1 }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                                                    {!isEditing ? (
                                                        product.unit || 'EA'
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            value={editForm.unit}
                                                            onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                                                            style={{ width: '50px', padding: '4px', fontSize: '12px' }}
                                                        />
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                                                    ${(product.price_excl_vat_cents / 100).toFixed(2)}
                                                </td>
                                                <td style={{ padding: '16px 24px', color: 'var(--success)', fontWeight: 'bold' }}>
                                                    {!isEditing ? (
                                                        `$${(product.price_cents / 100).toFixed(2)}`
                                                    ) : (
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            min="0"
                                                            value={editForm.priceIncl}
                                                            onChange={e => setEditForm({ ...editForm, priceIncl: e.target.value })}
                                                            style={{ width: '70px', padding: '4px', fontSize: '12px' }}
                                                        />
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    {!isEditing ? (
                                                        <span style={{ color: product.stock_quantity <= 0 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: '600' }}>
                                                            {product.stock_quantity}
                                                        </span>
                                                    ) : (
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            value={editForm.stockQuantity}
                                                            onChange={e => setEditForm({ ...editForm, stockQuantity: e.target.value })}
                                                            style={{ width: '60px', padding: '4px', fontSize: '12px' }}
                                                        />
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                    {!isEditing ? (
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button 
                                                                onClick={() => handleStartEdit(product)}
                                                                className="btn-secondary"
                                                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(product.id)}
                                                                className="btn-secondary"
                                                                style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                            <button 
                                                                onClick={() => handleSaveEdit(product.id)}
                                                                disabled={savingEdit}
                                                                className="btn-primary"
                                                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                                            >
                                                                {savingEdit ? 'Saving...' : '💾 Save'}
                                                            </button>
                                                            <button 
                                                                onClick={handleCancelEdit}
                                                                disabled={savingEdit}
                                                                className="btn-secondary"
                                                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Product / Bulk CSV Import Modal Window */}
            {showUploadModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100,
                        padding: '20px'
                    }}
                    onClick={() => setShowUploadModal(false)}
                >
                    <div 
                        style={{
                            width: '100%',
                            maxWidth: '720px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            position: 'relative'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    className={uploadMode === 'single' ? 'btn-primary' : 'btn-secondary'} 
                                    style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px' }}
                                    onClick={() => setUploadMode('single')}
                                >
                                    ➕ Add Single Product
                                </button>
                                <button 
                                    className={uploadMode === 'bulk' ? 'btn-primary' : 'btn-secondary'} 
                                    style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px' }}
                                    onClick={() => setUploadMode('bulk')}
                                >
                                    📁 Bulk CSV Import
                                </button>
                            </div>
                            <button 
                                onClick={() => setShowUploadModal(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', padding: '4px' }}
                                title="Close Modal"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        {uploadMode === 'single' ? (
                            <ProductUploadForm 
                                shopId={shopId} 
                                onUploadSuccess={() => {
                                    loadInventoryAndProfile();
                                    setShowUploadModal(false);
                                }} 
                            />
                        ) : (
                            <BulkProductUpload 
                                shopId={shopId} 
                                onUploadSuccess={() => {
                                    loadInventoryAndProfile();
                                    setShowUploadModal(false);
                                }} 
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}