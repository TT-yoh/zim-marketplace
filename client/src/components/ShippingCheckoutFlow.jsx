import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { CheckoutForm } from './CheckoutForm.jsx';
import { useToast } from './ToastContext.jsx';

const POLL_INTERVAL_MS = 3000;
const SLOW_AFTER_MS = 60 * 1000;      // offer "resend prompt" after a minute
const GIVE_UP_AFTER_MS = 10 * 60 * 1000;

// Shown after the payment prompt is sent: waits for the order to be marked paid by the
// Paynow webhook (or the mock), instead of assuming the payment worked.
function PaymentStatusPanel({ orderId, totalCents, formatPrice, onPaid, onRetry, onCancel, onViewOrders, onClose }) {
    const [status, setStatus] = useState('waiting'); // waiting | paid | failed | unknown
    const [elapsedMs, setElapsedMs] = useState(0);
    const paidReported = React.useRef(false);

    useEffect(() => {
        let stopped = false;
        const startedAt = Date.now();

        const check = async () => {
            if (stopped) return;
            const { data } = await supabase
                .from('orders')
                .select('status')
                .eq('id', orderId)
                .maybeSingle();
            if (stopped) return;

            const elapsed = Date.now() - startedAt;
            setElapsedMs(elapsed);

            if (data?.status === 'paid') {
                setStatus('paid');
                if (!paidReported.current) {
                    paidReported.current = true;
                    onPaid?.();
                }
                return;
            }
            if (data?.status === 'cancelled' || data?.status === 'refunded') {
                setStatus('failed');
                return;
            }
            if (elapsed >= GIVE_UP_AFTER_MS) {
                setStatus('unknown');
                return;
            }
            timer = setTimeout(check, POLL_INTERVAL_MS);
        };

        let timer = setTimeout(check, 1000);
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [orderId]);

    const amount = formatPrice ? formatPrice(totalCents) : `$${(totalCents / 100).toFixed(2)}`;
    const box = { padding: '24px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' };

    if (status === 'paid') {
        return (
            <div className="animate-fade-in-up" style={{ ...box, borderColor: 'var(--success)' }} role="status" aria-live="polite">
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
                <h3 style={{ margin: '0 0 6px 0', color: 'var(--success)' }}>Payment received</h3>
                <p style={{ margin: '0 0 18px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {amount} is held safely in escrow. The seller is paid only after you confirm delivery.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button className="btn-primary" onClick={onViewOrders} style={{ padding: '12px' }}>View my order</button>
                    <button className="btn-secondary" onClick={onClose} style={{ padding: '10px' }}>Continue shopping</button>
                </div>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="animate-fade-in-up" style={{ ...box, borderColor: 'var(--danger)' }} role="alert">
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚠️</div>
                <h3 style={{ margin: '0 0 6px 0', color: 'var(--danger)' }}>Payment not completed</h3>
                <p style={{ margin: '0 0 18px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    This order expired before payment arrived. Your cart is still saved, so you can check out again.
                </p>
                <button className="btn-primary" onClick={onCancel} style={{ padding: '12px', width: '100%' }}>Back to cart</button>
            </div>
        );
    }

    if (status === 'unknown') {
        return (
            <div className="animate-fade-in-up" style={box} role="status">
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>🕒</div>
                <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>Still no confirmation</h3>
                <p style={{ margin: '0 0 18px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    If money left your wallet, the order will show as paid in My Orders once Paynow confirms it. Otherwise, try again.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button className="btn-primary" onClick={onRetry} style={{ padding: '12px' }}>Try paying again</button>
                    <button className="btn-secondary" onClick={onViewOrders} style={{ padding: '10px' }}>Check My Orders</button>
                </div>
            </div>
        );
    }

    const slow = elapsedMs >= SLOW_AFTER_MS;
    return (
        <div className="animate-fade-in-up" style={box} role="status" aria-live="polite">
            <div className="animate-pulse-glow" style={{ fontSize: '40px', marginBottom: '8px' }}>📱</div>
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>Approve the payment on your phone</h3>
            <p style={{ margin: '0 0 14px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Enter your PIN in the prompt to pay {amount}. This page updates automatically. Keep it open.
            </p>
            <div style={{ height: '4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
                <div className="shimmer" style={{ width: '100%', height: '100%' }} />
            </div>
            {slow && (
                <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Didn't get a prompt, or it timed out?
                </p>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
                {slow && (
                    <button className="btn-primary" onClick={onRetry} style={{ flex: 1, padding: '10px' }}>Resend prompt</button>
                )}
                <button className="btn-secondary" onClick={onCancel} style={{ flex: 1, padding: '10px' }}>Cancel</button>
            </div>
        </div>
    );
}

export function ShippingCheckoutFlow({
    buyerId,
    cartArray,
    totalCents,
    currency = 'USD',
    formatPrice,
    onCancel,
    onPaymentComplete,
    onClose,
    onViewOrders
}) {
    const { showToast } = useToast();
    const getFormattedPrice = (cents) => {
        if (formatPrice) return formatPrice(cents, currency);
        return `$${((cents || 0) / 100).toFixed(2)}`;
    };

    const [step, setStep] = useState(1); // 1 = Address, 2 = Payment, 3 = Waiting for confirmation
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
    const isFreeShippingPromo = appliedPromo?.kind === 'free_shipping';
    const shippingFeeCents = isFreeShippingPromo ? 0 : baseShippingFeeCents;
    const discountCents = appliedPromo && !isFreeShippingPromo ? appliedPromo.discountCents : 0;
    const finalTotal = Math.max(0, totalCents + shippingFeeCents - discountCents);

    // Preview only: the database applies the same promo_codes rules when the order is created
    const handleApplyPromo = async (e) => {
        e.preventDefault();
        setPromoError('');
        const code = promoCodeInput.trim().toUpperCase();
        if (!code) return;

        const { data: promo, error } = await supabase
            .from('promo_codes')
            .select('code, label, kind, percent_off, max_discount_cents')
            .eq('code', code)
            .maybeSingle();

        if (error || !promo) {
            setPromoError('Invalid or expired promo code.');
            return;
        }

        if (promo.kind === 'free_shipping') {
            setAppliedPromo({ code, kind: promo.kind, discountCents: baseShippingFeeCents, label: promo.label || 'Free Shipping' });
        } else {
            let discount = Math.round(totalCents * promo.percent_off / 100);
            if (promo.max_discount_cents) discount = Math.min(discount, promo.max_discount_cents);
            setAppliedPromo({ code, kind: promo.kind, discountCents: discount, label: promo.label || `${promo.percent_off}% Off Subtotal` });
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

            // 2. Create the order. Totals, shipping and discounts are computed by the
            //    database from the items, zone and promo code (migration 035).
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    buyer_id: buyerId,
                    shipping_address_id: addressData.id,
                    fulfillment_type: fulfillmentType,
                    delivery_zone: fulfillmentType === 'pickup' ? null : deliveryZone,
                    promo_code: appliedPromo?.code || null
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

            // 4. Read back the authoritative total the buyer will be charged
            const { data: pricedOrder, error: pricedError } = await supabase
                .from('orders')
                .select('total_amount_cents')
                .eq('id', orderData.id)
                .single();

            if (pricedError) throw pricedError;

            const serverTotal = pricedOrder.total_amount_cents;
            if (serverTotal !== finalTotal) {
                showToast(`Your order total was updated to ${getFormattedPrice(serverTotal)} based on current prices and shipping rules.`, "info");
            }

            setCheckoutOrderId(orderData.id);
            setOrderTotalWithShipping(serverTotal);
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
                    currency={currency}
                    formatPrice={getFormattedPrice}
                    onPaymentInitiated={() => setStep(3)}
                />
            </div>
        );
    }

    if (step === 3 && checkoutOrderId) {
        return (
            <PaymentStatusPanel
                orderId={checkoutOrderId}
                totalCents={orderTotalWithShipping}
                formatPrice={getFormattedPrice}
                onPaid={onPaymentComplete}
                onRetry={() => setStep(2)}
                onCancel={onCancel}
                onViewOrders={onViewOrders}
                onClose={onClose}
            />
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
                    {appliedPromo && !isFreeShippingPromo && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--success)' }}>
                            <span>Discount ({appliedPromo.code}):</span>
                            <span>-{getFormattedPrice(appliedPromo.discountCents)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                        <span>Total:</span>
                        <span>{getFormattedPrice(finalTotal)}</span>
                    </div>
                    {currency === 'ZiG' && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                            You will be charged ${(finalTotal / 100).toFixed(2)} USD. ZiG amounts are estimates at today's rate.
                        </div>
                    )}
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
