// Inline product edit state and handlers for the vendor inventory table.
import { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { uploadImageToStorage } from '../../utils/imageUploadHelper.js';

export function useProductEditor({ shopId, setProducts, showToast }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        category: 'Electronics',
        subCategory: '',
        condition: 'New',
        itemNo: '',
        description: '',
        priceIncl: '',
        stockQuantity: 1,
        colors: '',
        sizes: '',
        unit: 'EA',
        imageUrl: '',
        isPromotion: false,
        promoDiscountPercent: 15
    });
    const [savingEdit, setSavingEdit] = useState(false);

    const handleStartEdit = (product) => {
        setEditingId(product.id);
        setEditForm({
            title: product.title || '',
            brand: product.brand || '',
            category: product.category || 'Electronics',
            subCategory: product.sub_category || '',
            condition: product.condition || 'New',
            itemNo: product.item_no || '',
            description: product.description || '',
            priceIncl: (product.price_cents / 100).toFixed(2),
            stockQuantity: product.stock_quantity ?? 1,
            colors: Array.isArray(product.colors) ? product.colors.join(', ') : '',
            sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
            unit: product.unit || 'EA',
            imageUrl: product.image_url || '',
            isPromotion: product.is_promotion === true,
            promoDiscountPercent: product.promo_discount_percent || 15
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

            const priceExclCents = Math.round(priceInclCents / 1.15);
            const updatePayload = {
                title: editForm.title.trim(),
                brand: editForm.brand ? editForm.brand.trim() : '',
                category: editForm.category,
                sub_category: editForm.subCategory ? editForm.subCategory.trim() : null,
                condition: editForm.condition,
                item_no: editForm.itemNo ? editForm.itemNo.trim() : null,
                description: editForm.description ? editForm.description.trim() : null,
                price_cents: priceInclCents,
                price_incl_vat_cents: priceInclCents,
                price_excl_vat_cents: priceExclCents,
                stock_quantity: parseInt(editForm.stockQuantity, 10) || 0,
                colors: parsedColors,
                sizes: parsedSizes,
                unit: editForm.unit || 'EA',
                image_url: editForm.imageUrl || null,
                is_promotion: editForm.isPromotion === true,
                promo_discount_percent: editForm.isPromotion ? (parseInt(editForm.promoDiscountPercent, 10) || 0) : 0
            };

            let { error } = await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', productId);

            if (error && error.message && (error.message.toLowerCase().includes('brand') || error.message.toLowerCase().includes('promotion') || error.message.toLowerCase().includes('promo_discount'))) {
                const { brand: _b, is_promotion: _ip, promo_discount_percent: _pdp, ...fallbackPayload } = updatePayload;
                const { error: retryError } = await supabase
                    .from('products')
                    .update(fallbackPayload)
                    .eq('id', productId);
                if (retryError) throw retryError;
            } else if (error) {
                throw error;
            }

            setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                    return {
                        ...p,
                        ...updatePayload
                    };
                }
                return p;
            }));

            setEditingId(null);
            showToast('✓ Product variables updated successfully!', 'success');
        } catch (err) {
            showToast(`Failed saving edit: ${err.message}`, 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    return {
        editingId, setEditingId, editForm, setEditForm, savingEdit,
        handleStartEdit, handleCancelEdit, handleEditFileChange, handleSaveEdit
    };
}
