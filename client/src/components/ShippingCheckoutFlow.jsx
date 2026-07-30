import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { CheckoutForm } from './CheckoutForm.jsx';

export function ShippingCheckoutFlow({ 
    buyerId, 
    cartArray, 
    totalCents, 
    currency = 'USD',
    formatPrice,
    onCancel, 
    onPaymentInitiated 
}) {
    const getFormattedPrice = (cents) => {
        if (formatPrice) return formatPrice(cents, currency);
        return `$${((cents || 0) / 100).toFixed(2)}`;
    };

    const [step, setStep] = useState(1); // 1 = Address, 2 = Payment
    const [loading, setLoading] = useState(false);
    
    const [fullName, setFullName] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('Harare');
    const [phone, setPhone] = useState('');
    
    const [checkoutOrderId, setCheckoutOrderId] = useState(null);
    const [orderTotalWithShipping, setOrderTotalWithShipping] = useState(totalCents);

    useEffect(() => {
        async function fetchRecentAddress() {
            try {
                const { data } = await supabase
                    .from('buyer_addresses')
                    .select('*')
                    .eq('buyer_id', buyerId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (data) {
                    setFullName(data.full_name || '');
                    setStreet(data.street_address || '');
                    setCity(data.city || '');
                    setProvince(data.province || 'Harare');
                    setPhone(data.phone_number || '');
                }
            } catch (err) {
                // No address found, silent fail
            }
        }
        fetchRecentAddress();
    }, [buyerId]);

    const shippingFeeCents = 500; // Flat $5.00 shipping

    const handleContinueToPayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Guard: Check if vendor is trying to checkout their own item
            const containsOwnProduct = cartArray.some(item => item.product.shop_id === buyerId);
            if (containsOwnProduct) {
                alert("🏪 Your cart contains items from your own store. Please remove your items before checking out.");
                setLoading(false);
                return;
            }

            // 1. Save or get the address
            const { data: addressData, error: addressError } = await supabase
                .from('buyer_addresses')
                .insert([{
                    buyer_id: buyerId,
                    full_name: fullName,
                    street_address: street,
                    city: city,
                    province: province,
                    phone_number: phone
                }])
                .select()
                .single();

            if (addressError) throw addressError;

            // 2. Create the order with shipping
            const finalTotal = totalCents + shippingFeeCents;
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    buyer_id: buyerId,
                    total_amount_cents: finalTotal,
                    currency: currency === 'ZiG' ? 'ZWG' : 'USD', 
                    status: 'pending',
                    shipping_address_id: addressData.id,
                    shipping_fee_cents: shippingFeeCents
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 3. Create order items
            const orderItemsPayload = cartArray.map(item => ({
                order_id: orderData.id,
                product_id: item.product.id,
                shop_id: item.product.shop_id,
                quantity: item.quantity,
                price_at_purchase_cents: item.product.price_cents,
                selected_color: item.selectedColor || null,
                selected_size: item.selectedSize || null
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsPayload);

            if (itemsError) throw itemsError;

            setCheckoutOrderId(orderData.id);
            setOrderTotalWithShipping(finalTotal);
            setStep(2);

        } catch (err) {
            alert(`Failed to prepare order: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (step === 2 && checkoutOrderId) {
        return (
            <div className="animate-fade-in-up">
                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--success)' }}>Delivery Details Saved</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {fullName} • {street}, {city} • Shipping: {getFormattedPrice(shippingFeeCents)}
                    </p>
                </div>
                <CheckoutForm 
                    orderId={checkoutOrderId} 
                    totalAmount={orderTotalWithShipping} 
                    buyerEmail="customer@zimmarket.co.zw"
                    currency={currency}
                    formatPrice={getFormattedPrice}
                    onPaymentInitiated={onPaymentInitiated}
                />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up">
            <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Shipping Details</h4>
            
            <form onSubmit={handleContinueToPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label>
                    <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Full Name</span>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </label>
                
                <label>
                    <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Street Address</span>
                    <input type="text" required value={street} onChange={e => setStreet(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </label>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>City</span>
                        <input type="text" required value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    </label>
                    <label style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Province</span>
                        <select required value={province} onChange={e => setProvince(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                            <option>Harare</option>
                            <option>Bulawayo</option>
                            <option>Manicaland</option>
                            <option>Midlands</option>
                            <option>Masvingo</option>
                            <option>Matabeleland North</option>
                            <option>Matabeleland South</option>
                            <option>Mashonaland Central</option>
                            <option>Mashonaland East</option>
                            <option>Mashonaland West</option>
                        </select>
                    </label>
                </div>

                <label>
                    <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Phone Number</span>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="0771234567" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </label>

                <div style={{ margin: '16px 0', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <span>Subtotal:</span>
                        <span>{getFormattedPrice(totalCents)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <span>Shipping Fee:</span>
                        <span>{getFormattedPrice(shippingFeeCents)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                        <span>Total:</span>
                        <span>{getFormattedPrice(totalCents + shippingFeeCents)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2, padding: '12px' }}>
                        {loading ? 'Processing...' : 'Continue to Payment'}
                    </button>
                </div>
            </form>
        </div>
    );
}
