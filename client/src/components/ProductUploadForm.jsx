// client/src/components/ProductUploadForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';
import { useToast } from './ToastContext.jsx';

export function ProductUploadForm({ shopId, onUploadSuccess }) {
    const [itemNo, setItemNo] = useState('');
    const [title, setTitle] = useState('');
    const [unit, setUnit] = useState('EA');
    const [priceExcl, setPriceExcl] = useState('');
    const [priceIncl, setPriceIncl] = useState('');
    
    const [description, setDescription] = useState('');
    const [stock, setStock] = useState(1);
    
    const [categoriesList, setCategoriesList] = useState([]);
    const [category, setCategory] = useState('Electronics');
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');
    const [subCategory, setSubCategory] = useState('Phones & Tablets');
    const [isCustomSubCategory, setIsCustomSubCategory] = useState(false);
    const [customSubCategory, setCustomSubCategory] = useState('');
    const [condition, setCondition] = useState('New');
    const [colors, setColors] = useState('');
    const [sizes, setSizes] = useState('');
    
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [directImageUrl, setDirectImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        async function fetchCategories() {
            try {
                const { data } = await supabase
                    .from('categories')
                    .select('*')
                    .order('display_order', { ascending: true });
                if (data && data.length > 0) {
                    setCategoriesList(data);
                    setCategory(data[0].name);
                    if (data[0].sub_categories && data[0].sub_categories.length > 0) {
                        setSubCategory(data[0].sub_categories[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to load categories:", err.message);
            }
        }
        fetchCategories();
    }, []);

    const handleCategoryChange = (val) => {
        if (val === 'CUSTOM') {
            setIsCustomCategory(true);
            setCategory('');
            setSubCategory('');
        } else {
            setIsCustomCategory(false);
            setCategory(val);
            const found = categoriesList.find(c => c.name === val);
            if (found && Array.isArray(found.sub_categories) && found.sub_categories.length > 0) {
                setSubCategory(found.sub_categories[0]);
                setIsCustomSubCategory(false);
            } else {
                setSubCategory('General');
            }
        }
    };

    const handleFileChange = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setImageFile(file);
            try {
                setPreviewUrl(URL.createObjectURL(file));
            } catch (err) {
                console.warn("Preview generation notice:", err);
            }
        }
    };

    const handleRemovePreview = () => {
        setImageFile(null);
        setPreviewUrl(null);
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageUrl = directImageUrl.trim() || null;

            if (imageFile) {
                imageUrl = await uploadImageToStorage(imageFile, 'product-images', shopId);
            }

            const priceExclCents = Math.round(parseFloat(priceExcl) * 100);
            const priceInclCents = Math.round(parseFloat(priceIncl) * 100);
            if (isNaN(priceInclCents)) throw new Error('Invalid Incl VAT price format');

            const finalCategory = isCustomCategory ? customCategory : category;
            const finalSubCategory = isCustomSubCategory ? customSubCategory : subCategory;

            const { error: insertError } = await supabase
                .from('products')
                .insert([{
                    shop_id: shopId,
                    item_no: itemNo,
                    title,
                    unit,
                    price_excl_vat_cents: isNaN(priceExclCents) ? 0 : priceExclCents,
                    price_incl_vat_cents: priceInclCents,
                    price_cents: priceInclCents, // Map to final cart price
                    description,
                    stock_quantity: parseInt(stock, 10) || 1,
                    image_url: imageUrl,
                    category: finalCategory,
                    sub_category: finalSubCategory,
                    condition,
                    colors: colors.split(',').map(c => c.trim()).filter(Boolean),
                    sizes: sizes.split(',').map(s => s.trim()).filter(Boolean)
                }]);

            if (insertError) throw insertError;

            setItemNo('');
            setTitle('');
            setUnit('EA');
            setPriceExcl('');
            setPriceIncl('');
            setDescription('');
            setStock(1);
            setCategory('Electronics');
            setIsCustomCategory(false);
            setCustomCategory('');
            setSubCategory(subCategoriesMap['Electronics'] ? subCategoriesMap['Electronics'][0] : '');
            setIsCustomSubCategory(false);
            setCustomSubCategory('');
            setCondition('New');
            setColors('');
            setSizes('');
            setImageFile(null);
            
            if (onUploadSuccess) onUploadSuccess();

        } catch (err) {
            console.error(err);
            showToast(`Upload error: ${err.message}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <form onSubmit={handleProductSubmit} className="glass-panel animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>➕ Add New Product</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Item / SKU No. (Optional)</span>
                        <input 
                            type="text" 
                            value={itemNo}
                            onChange={e => setItemNo(e.target.value)}
                            placeholder="e.g. ELEC-001"
                            style={{ width: '100%' }}
                        />
                    </label>
                    <label style={{ flex: 2 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Product Title *</span>
                        <input 
                            type="text" 
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Wireless Noise-Canceling Headphones"
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Price Incl VAT ($) *</span>
                        <input 
                            type="number" 
                            step="0.01"
                            required
                            value={priceIncl}
                            onChange={e => setPriceIncl(e.target.value)}
                            placeholder="115.00"
                            style={{ width: '100%' }}
                        />
                    </label>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Price Excl VAT ($) (Optional)</span>
                        <input 
                            type="number" 
                            step="0.01"
                            value={priceExcl}
                            onChange={e => setPriceExcl(e.target.value)}
                            placeholder="100.00"
                            style={{ width: '100%' }}
                        />
                    </label>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Unit (e.g. EA, KG)</span>
                        <input 
                            type="text" 
                            value={unit}
                            onChange={e => setUnit(e.target.value)}
                            placeholder="EA"
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Stock Qty (Optional)</span>
                        <input 
                            type="number" 
                            min="0"
                            value={stock}
                            onChange={e => setStock(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </label>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Category</span>
                        {!isCustomCategory ? (
                            <select 
                                value={category} 
                                onChange={e => handleCategoryChange(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                {categoriesList.map(cat => (
                                    <option key={cat.id} value={cat.name}>
                                        {cat.icon || '🏷️'} {cat.name}
                                    </option>
                                ))}
                                <option value="CUSTOM">✏️ Add New Category...</option>
                            </select>
                        ) : (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <input 
                                    type="text"
                                    required
                                    value={customCategory}
                                    onChange={e => setCustomCategory(e.target.value)}
                                    placeholder="Enter new category..."
                                    style={{ width: '100%' }}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => handleCategoryChange(categoriesList[0]?.name || 'Electronics')}
                                    title="Back to preset categories"
                                    style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    ↩
                                </button>
                            </div>
                        )}
                    </label>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Sub-Category</span>
                        {(() => {
                            const currentCatObj = categoriesList.find(c => c.name === category);
                            const availableSubCats = currentCatObj?.sub_categories || [];

                            if (availableSubCats.length > 0 && !isCustomSubCategory) {
                                return (
                                    <select 
                                        value={subCategory}
                                        onChange={e => {
                                            if (e.target.value === 'CUSTOM') {
                                                setIsCustomSubCategory(true);
                                                setSubCategory('');
                                            } else {
                                                setIsCustomSubCategory(false);
                                                setSubCategory(e.target.value);
                                            }
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        {availableSubCats.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                        <option value="CUSTOM">✏️ Custom / Enter New...</option>
                                    </select>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <input 
                                        type="text"
                                        value={isCustomSubCategory ? customSubCategory : subCategory}
                                        onChange={e => {
                                            if (isCustomSubCategory) {
                                                setCustomSubCategory(e.target.value);
                                            } else {
                                                setSubCategory(e.target.value);
                                            }
                                        }}
                                        placeholder="Enter sub-category..."
                                        style={{ width: '100%' }}
                                    />
                                    {availableSubCats.length > 0 && (
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setIsCustomSubCategory(false);
                                                setSubCategory(availableSubCats[0]);
                                            }}
                                            title="Back to preset sub-categories"
                                            style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            ↩
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Colors (Optional)</span>
                        <input 
                            type="text" 
                            value={colors}
                            onChange={e => setColors(e.target.value)}
                            placeholder="e.g. Red, Blue, Black (or leave empty)"
                            style={{ width: '100%' }}
                        />
                    </label>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Sizes (Optional — leave blank if no size variations)</span>
                        <input 
                            type="text" 
                            value={sizes}
                            onChange={e => setSizes(e.target.value)}
                            placeholder="e.g. S, M, L (or leave empty)"
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>

                <label>
                    <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Description (Optional)</span>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Detail the features, flaws, etc."
                        rows="2"
                        style={{ width: '100%', resize: 'vertical' }}
                    />
                </label>

                <div>
                    <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Product Image (Photo Upload or URL)</span>
                    
                    {/* Live Preview Box if image is chosen */}
                    {previewUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', border: '1px solid var(--success)', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', marginBottom: '12px' }}>
                            <img src={previewUrl} alt="Preview" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--success)' }}>✓ Photo Selected</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{imageFile?.name}</div>
                            </div>
                            <button 
                                type="button" 
                                onClick={handleRemovePreview}
                                className="btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            >
                                ✕ Remove
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ width: '100%', padding: '10px', border: '1px dashed var(--accent-primary)', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '6px', cursor: 'pointer' }}
                            />
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>— or paste direct image URL —</div>
                            <input 
                                type="url" 
                                value={directImageUrl}
                                onChange={e => setDirectImageUrl(e.target.value)}
                                placeholder="https://example.com/photo.jpg"
                                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)' }}
                            />
                        </div>
                    )}
                </div>

                <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={uploading}
                    style={{ marginTop: '16px', padding: '14px', fontSize: '16px' }}
                >
                    {uploading ? 'Uploading Product...' : 'List Product'}
                </button>
            </div>
        </form>
    );
}