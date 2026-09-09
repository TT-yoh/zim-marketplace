import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { CheckoutForm } from './CheckoutForm.jsx';
import { useToast } from './ToastContext.jsx';

export function ShippingCheckoutFlow({ 
    buyerId, 
    cartArray, 
    totalCents, 
    currency = 'USD',
    formatPrice,
    onCancel, 
    onPaymentInitiated 
}) {
    const { showToast } = useToast();
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

    // Fulfillment & Zimbabwe Delivery Zones
    const [fulfillmentType, setFulfillmentType] = useState('courier'); // 'courier' or 'pickup'
    const [deliveryZone, setDeliveryZone] = useState('harare_cbd');
    const [pickupPoint, setPickupPoint] = useState('Harare CBD - Joina City Pick-up Counter');
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null); // { code, discountCents, label }
    const [promoError, setPromoError] = useState('');
    
    const [checkoutOrderId, setCheckoutOrderId] = useState(null);
    const [orderTotalWithShipping, setOrderTotalWithShipping] = useState(totalCents);

    // Vendor Custom Shipping Rules
    const [vendorShippingSettings, setVendorShippingSettings] = useState(null);
    const [vendorStoreName, setVendorStoreName] = useState('');

    useEffect(() => {
        async function loadVendorShipping() {
            if (!cartArray || cartArray.length === 0) return;
            const vendorId = cartArray[0]?.product?.shop_id;
            if (!vendorId) return;

            try {
                const { data } = await supabase
                    .from('vendor_profiles')
                    .select('store_name, shipping_settings')
                    .eq('id', vendorId)
                    .maybeSingle();

                if (data) {
                    setVendorStoreName(data.store_name || '');
                    if (data.shipping_settings) {
                        setVendorShippingSettings(data.shipping_settings);
                        // If pickup is disabled by vendor, force courier
                        if (data.shipping_settings.pickup_enabled === false) {
                            setFulfillmentType('courier');
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not fetch vendor shipping settings:", err);
            }
        }
        loadVendorShipping();
    }, [cartArray]);

    const DELIVERY_ZONES = {
        'harare_cbd': { label: 'Harare CBD & Southerton Express Rider', feeCents: 200, city: 'Harare', province: 'Harare' },
        'harare_east': { label: 'Harare East (Msasa, Graniteside, Eastlea)', feeCents: 300, city: 'Harare', province: 'Harare' },
        'harare_north': { label: 'Harare North (Borrowdale, Avondale, Mt Pleasant)', feeCents: 400, city: 'Harare', province: 'Harare' },
        'harare_greater': { label: 'Greater Harare (Chitungwiza, Ruwa, Norton)', feeCents: 500, city: 'Harare', province: 'Harare' },
        'bulawayo_central': { label: 'Bulawayo CBD & Belmont Industrial', feeCents: 300, city: 'Bulawayo', province: 'Bulawayo' },
        'intercity_express': { label: 'Inter-City Courier (Mutare, Gweru, Masvingo, Vic Falls)', feeCents: 800, city: 'Inter-City', province: 'National' }
    };

    const isFreeShippingByThreshold = Boolean(
        vendorShippingSettings?.free_shipping_threshold_cents &&
        totalCents >= vendorShippingSettings.free_shipping_threshold_cents
    );

    const getZonePriceCents = (zoneKey) => {
        if (isFreeShippingByThreshold) return 0;
        if (vendorShippingSettings) {
            if (vendorShippingSettings.mode === 'flat' && vendorShippingSettings.flat_fee_cents !== undefined) {
                return vendorShippingSettings.flat_fee_cents;
            }
            if (vendorShippingSettings.mode === 'custom_zones' && vendorShippingSettings.custom_zones?.[zoneKey] !== undefined) {
                return vendorShippingSettings.custom_zones[zoneKey];
            }
        }
        return DELIVERY_ZONES[zoneKey]?.feeCents || 300;
    };

    const baseShippingFeeCents = fulfillmentType === 'pickup' ? 0 : getZonePriceCents(deliveryZone);
    const shippingFeeCents = appliedPromo?.code === 'FREESHIP' ? 0 : baseShippingFeeCents;
    const discountCents = appliedPromo && appliedPromo.code !== 'FREESHIP' ? appliedPromo.discountCents : 0;
    const finalTotal = Math.max(0, totalCents + shippingFeeCents - discountCents);

    const handleApplyPromo = (e) => {
        e.preventDefault();
        setPromoError('');
        const code = promoCodeInput.trim().toUpperCase();
        if (!code) return;
        
        if (code === 'ZIM10' || code === 'HARARE10') {
            const discount = Math.round(totalCents * 0.10);
            setAppliedPromo({ code, discountCents: discount, label: '10% Off Subtotal' });
        } else if (code === 'FREESHIP') {
            setAppliedPromo({ code, discountCents: baseShippingFeeCents, label: 'Free Shipping Promo' });
        } else {
            setPromoError('Invalid promo code. Try ZIM10 or FREESHIP');
        }
    };

    const handleContinueToPayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Guard: Check if vendor is trying to checkout their own item
            const containsOwnProduct = cartArray.some(item => item.product.shop_id === buyerId);
            if (containsOwnProduct) {
                showToast("🏪 Your cart contains items from your own store. Please remove your items before checking out.", "warning");
                setLoading(false);
                return;
            }

            const deliveryAddressText = fulfillmentType === 'pickup'
                ? `[PICKUP POINT] ${pickupPoint}`
                : street;

            // 1. Save or get the address
            const { data: addressData, error: addressError } = await supabase
                .from('buyer_addresses')
                .insert([{
                    buyer_id: buyerId,
                    full_name: fullName,
                    street_address: deliveryAddressText,
                    city: city,
                    province: province,
                    phone_number: phone
                }])
                .select()
                .single();

            if (addressError) throw addressError;

            // 2. Create the order with shipping & promo discount
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
            showToast(`Failed to prepare order: ${err.message}`, "error");
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
            <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Shipping & Delivery Details</h4>

            {isFreeShippingByThreshold && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎉</span>
                    <span>
                        <strong>Free Delivery Unlocked!</strong> Your cart exceeds {getFormattedPrice(vendorShippingSettings.free_shipping_threshold_cents)} from {vendorStoreName || 'this vendor'}.
                    </span>
                </div>
            )}
            
            <form onSubmit={handleContinueToPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Fulfillment Method Selection */}
                <div>
                    <span style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Fulfillment Method</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setFulfillmentType('courier')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '6px',
                                border: fulfillmentType === 'courier' ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                backgroundColor: fulfillmentType === 'courier' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            🚀 Doorstep Courier ({shippingFeeCents === 0 ? 'FREE' : getFormattedPrice(shippingFeeCents)})
                        </button>
                        
                        {vendorShippingSettings?.pickup_enabled !== false ? (
                            <button
                                type="button"
                                onClick={() => setFulfillmentType('pickup')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: fulfillmentType === 'pickup' ? '2px solid var(--success)' : '1px solid var(--border)',
                                    backgroundColor: fulfillmentType === 'pickup' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                🏢 Pickup Point (FREE)
                            </button>
                        ) : (
                            <div style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ℹ️ Store Pickup Unavailable
                            </div>
                        )}
                    </div>
                </div>

                {fulfillmentType === 'pickup' ? (
                    <label>
                        <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Select Pick-up Location</span>
                        <select 
                            value={pickupPoint} 
                            onChange={e => setPickupPoint(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        >
                            <option>Harare CBD - Joina City Pick-up Counter (FREE)</option>
                            <option>Avondale Shopping Centre Kiosk (FREE)</option>
                            <option>Msasa Industrial Depot (FREE)</option>
                            <option>Bulawayo CBD - Main Street Depot (FREE)</option>
                            <option>Mutare Main Street Pick-up Counter (FREE)</option>
                        </select>
                    </label>
                ) : (
                    <>
                        <label>
                            <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Delivery City & Neighborhood Zone</span>
                            <select
                                value={deliveryZone}
                                onChange={e => {
                                    setDeliveryZone(e.target.value);
                                    const zone = DELIVERY_ZONES[e.target.value];
                                    if (zone) {
                                        setCity(zone.city);
                                        setProvince(zone.province);
                                    }
                                }}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: '600' }}
                            >
                                {Object.entries(DELIVERY_ZONES).map(([key, zone]) => {
                                    const zonePrice = getZonePriceCents(key);
                                    return (
                                        <option key={key} value={key}>
                                            📍 {zone.label} — {zonePrice === 0 ? 'FREE' : getFormattedPrice(zonePrice)}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

                        <label>
                            <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Street & Building Address</span>
                            <input type="text" required value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g. Stand 42, Southerton Industrial Park" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                        </label>
                    </>
                )}

                <label>
                    <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Full Name</span>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }} />
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

                {/* Promo Code Input */}
                <div style={{ margin: '8px 0' }}>
                    <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Promo Code (Optional)</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            placeholder="e.g. ZIM10 or FREESHIP" 
                            value={promoCodeInput}
                            onChange={e => setPromoCodeInput(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                        <button type="button" onClick={handleApplyPromo} className="btn-secondary" style={{ padding: '0 16px', fontSize: '13px' }}>
                            Apply
                        </button>
                    </div>
                    {appliedPromo && (
                        <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px', fontWeight: '600' }}>
                            ✓ Promo '{appliedPromo.code}' applied: {appliedPromo.label} (-{getFormattedPrice(appliedPromo.discountCents)})
                        </div>
                    )}
                    {promoError && (
                        <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                            {promoError}
                        </div>
                    )}
                </div>

                {/* Summary Box */}
                <div style={{ margin: '16px 0', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <span>Subtotal:</span>
                        <span>{getFormattedPrice(totalCents)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <span>Fulfillment:</span>
                        <span>
                            {fulfillmentType === 'pickup' 
                                ? 'FREE (Pickup)' 
                                : (shippingFeeCents === 0 ? 'FREE (Courier)' : getFormattedPrice(shippingFeeCents))}
                        </span>
                    </div>
                    {appliedPromo && appliedPromo.code !== 'FREESHIP' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--success)' }}>
                            <span>Discount ({appliedPromo.code}):</span>
                            <span>-{getFormattedPrice(appliedPromo.discountCents)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                        <span>Total:</span>
                        <span>{getFormattedPrice(finalTotal)}</span>
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
