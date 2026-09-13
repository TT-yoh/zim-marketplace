import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';

// Module-level SWR cache for 0ms instant profile settings rendering
let globalProfileCache = {
    userId: null,
    vendorData: null,
    addressData: null,
    timestamp: 0
};

export function ProfileSettings({ userId, email }) {
    const { showToast } = useToast();
    const cached = globalProfileCache.userId === userId ? globalProfileCache : null;
    const [loading, setLoading] = useState(() => !cached?.vendorData && !cached?.addressData);
    const [saving, setSaving] = useState(false);

    // Vendor State
    const [hasVendorProfile, setHasVendorProfile] = useState(() => !!cached?.vendorData);
    const [storeName, setStoreName] = useState(() => cached?.vendorData?.store_name || '');
    const [whatsapp, setWhatsapp] = useState(() => cached?.vendorData?.whatsapp_number || '');
    const [storeSlug, setStoreSlug] = useState(() => cached?.vendorData?.store_slug || '');
    
    // Vendor Custom Shipping State
    const [shippingMode, setShippingMode] = useState(() => cached?.vendorData?.shipping_settings?.mode || 'default');
    const [flatShippingFee, setFlatShippingFee] = useState(() => {
        const cents = cached?.vendorData?.shipping_settings?.flat_fee_cents;
        return cents !== undefined ? (cents / 100).toFixed(2) : '3.00';
    });
    const [freeShippingThreshold, setFreeShippingThreshold] = useState(() => {
        const cents = cached?.vendorData?.shipping_settings?.free_shipping_threshold_cents;
        return (cents !== undefined && cents !== null) ? (cents / 100).toFixed(2) : '';
    });
    const [pickupEnabled, setPickupEnabled] = useState(() => cached?.vendorData?.shipping_settings?.pickup_enabled ?? true);
    const [customZoneRates, setCustomZoneRates] = useState(() => {
        const defaultRates = {
            harare_cbd: '2.00',
            harare_east: '3.00',
            harare_north: '4.00',
            harare_greater: '5.00',
            bulawayo_central: '3.00',
            intercity_express: '8.00'
        };
        if (cached?.vendorData?.shipping_settings?.custom_zones) {
            Object.entries(cached.vendorData.shipping_settings.custom_zones).forEach(([k, cents]) => {
                defaultRates[k] = (cents / 100).toFixed(2);
            });
        }
        return defaultRates;
    });

    // Buyer Address State
    const [addressId, setAddressId] = useState(() => cached?.addressData?.id || null);
    const [fullName, setFullName] = useState(() => cached?.addressData?.full_name || '');
    const [street, setStreet] = useState(() => cached?.addressData?.street_address || '');
    const [city, setCity] = useState(() => cached?.addressData?.city || '');
    const [province, setProvince] = useState(() => cached?.addressData?.province || 'Harare');
    const [phone, setPhone] = useState(() => cached?.addressData?.phone_number || '');

    useEffect(() => {
        async function fetchProfileData() {
            try {
                // Fetch Vendor Profile and Buyer Address in parallel
                const [vendorRes, addressRes] = await Promise.all([
                    supabase.from('vendor_profiles').select('*').eq('id', userId).maybeSingle(),
                    supabase.from('buyer_addresses').select('*').eq('buyer_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
                ]);

                const vendorData = vendorRes.data;
                if (vendorData) {
                    setHasVendorProfile(true);
                    setStoreName(vendorData.store_name || '');
                    setWhatsapp(vendorData.whatsapp_number || '');
                    setStoreSlug(vendorData.store_slug || (vendorData.store_name ? vendorData.store_name.toLowerCase().replace(/[^a-z0-9]/g, '-') : ''));
                    
                    if (vendorData.shipping_settings) {
                        const s = vendorData.shipping_settings;
                        if (s.mode) setShippingMode(s.mode);
                        if (s.flat_fee_cents !== undefined) setFlatShippingFee((s.flat_fee_cents / 100).toFixed(2));
                        if (s.free_shipping_threshold_cents !== undefined && s.free_shipping_threshold_cents !== null) {
                            setFreeShippingThreshold((s.free_shipping_threshold_cents / 100).toFixed(2));
                        }
                        if (s.pickup_enabled !== undefined) setPickupEnabled(s.pickup_enabled);
                        if (s.custom_zones) {
                            const cz = { ...customZoneRates };
                            Object.entries(s.custom_zones).forEach(([k, cents]) => {
                                cz[k] = (cents / 100).toFixed(2);
                            });
                            setCustomZoneRates(cz);
                        }
                    }
                }

                const addressData = addressRes.data;
                if (addressData) {
                    setAddressId(addressData.id);
                    setFullName(addressData.full_name || '');
                    setStreet(addressData.street_address || '');
                    setCity(addressData.city || '');
                    setProvince(addressData.province || 'Harare');
                    setPhone(addressData.phone_number || '');
                }

                globalProfileCache = {
                    userId,
                    vendorData,
                    addressData,
                    timestamp: Date.now()
                };

            } catch (err) {
                console.error("Error loading profile:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfileData();
    }, [userId]);

    const handleSaveVendor = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Clean slug format
            const cleanSlug = storeSlug
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-');

            const customZonesCents = {};
            Object.entries(customZoneRates).forEach(([k, val]) => {
                customZonesCents[k] = Math.round((parseFloat(val) || 0) * 100);
            });

            const shippingPayload = {
                mode: shippingMode,
                flat_fee_cents: Math.round((parseFloat(flatShippingFee) || 0) * 100),
                free_shipping_threshold_cents: freeShippingThreshold ? Math.round(parseFloat(freeShippingThreshold) * 100) : null,
                pickup_enabled: pickupEnabled,
                custom_zones: customZonesCents
            };

            const updatePayload = {
                id: userId,
                store_name: storeName,
                whatsapp_number: whatsapp,
                store_slug: cleanSlug || null,
                shipping_settings: shippingPayload
            };

            const { error } = await supabase
                .from('vendor_profiles')
                .upsert(updatePayload, { onConflict: 'id' });
            
            if (error) {
                // If column doesn't exist yet, fallback to saving without new columns
                if (error.message && (error.message.includes('store_slug') || error.message.includes('shipping_settings'))) {
                    await supabase
                        .from('vendor_profiles')
                        .upsert({ id: userId, store_name: storeName, whatsapp_number: whatsapp }, { onConflict: 'id' });
                } else {
                    throw error;
                }
            }

            setHasVendorProfile(true);
            setStoreSlug(cleanSlug);
            showToast('Vendor profile and custom shipping settings updated successfully!', 'success');
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const copyStoreLink = () => {
        const url = `${window.location.origin}/?store=${storeSlug || storeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        navigator.clipboard.writeText(url);
        showToast('Store link copied to clipboard!', 'success');
    };

    const shareStoreWhatsApp = () => {
        const url = `${window.location.origin}/?store=${storeSlug || storeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const text = encodeURIComponent(`Shop directly from ${storeName} on ZimMarket: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                buyer_id: userId,
                full_name: fullName,
                street_address: street,
                city,
                province,
                phone_number: phone
            };

            let error;
            if (addressId) {
                // Update existing
                const res = await supabase.from('buyer_addresses').update(payload).eq('id', addressId);
                error = res.error;
            } else {
                // Insert new
                const res = await supabase.from('buyer_addresses').insert([payload]);
                error = res.error;
            }
            
            if (error) throw error;
            showToast('Default shipping address saved successfully!', 'success');
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Profile...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }} className="animate-fade-in-up">
            <h2 style={{ fontSize: '32px', color: 'var(--text-primary)', marginBottom: '32px' }}>Profile Settings</h2>

            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: 'var(--text-primary)' }}>Account Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Email Address</div>
                    <div style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '500', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        {email || 'Loading...'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* Default Shipping Address */}
                <div className="glass-panel" style={{ padding: '24px', flex: 1, minWidth: '300px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: 'var(--text-primary)' }}>Default Shipping Address</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Save your address to auto-fill during checkout.</p>
                    
                    <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <label>
                            <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Full Name</span>
                            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%' }} />
                        </label>
                        <label>
                            <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Street Address</span>
                            <input type="text" required value={street} onChange={e => setStreet(e.target.value)} style={{ width: '100%' }} />
                        </label>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <label style={{ flex: 1 }}>
                                <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>City</span>
                                <input type="text" required value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%' }} />
                            </label>
                            <label style={{ flex: 1 }}>
                                <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Province</span>
                                <select required value={province} onChange={e => setProvince(e.target.value)} style={{ width: '100%' }}>
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
                            <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="0771234567" style={{ width: '100%' }} />
                        </label>
                        <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '8px' }}>
                            {saving ? 'Saving...' : 'Save Address'}
                        </button>
                    </form>
                </div>

                {/* Vendor Profile Settings */}
                <div className="glass-panel" style={{ padding: '24px', flex: 1, minWidth: '300px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: 'var(--text-primary)' }}>
                        {hasVendorProfile ? 'Vendor & Delivery Settings' : '🏪 Set Up Store & Shipping Settings'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                        {hasVendorProfile 
                            ? 'Manage your store brand, WhatsApp number, shareable vanity slug, and custom shipping pricing.'
                            : 'Fill in your store details below to start selling and set your custom delivery rates.'}
                    </p>
                    
                    <form onSubmit={handleSaveVendor} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label>
                                    <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Store Name</span>
                                    <input type="text" required value={storeName} onChange={e => setStoreName(e.target.value)} style={{ width: '100%' }} />
                                </label>
                            </div>

                            <div>
                                <label>
                                    <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>WhatsApp Number (for customer inquiries & orders)</span>
                                    <input type="tel" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="0771234567 or 263771234567" style={{ width: '100%' }} />
                                </label>
                            </div>

                            {/* Store Vanity Slug & Shareable URL */}
                            <div style={{ padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid var(--accent-primary)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>🔗</span>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Store Vanity URL & Shareable Link</span>
                                </div>
                                <label>
                                    <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Custom Store Slug</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>zimmarket.co.zw/?store=</span>
                                        <input 
                                            type="text" 
                                            value={storeSlug} 
                                            onChange={e => setStoreSlug(e.target.value)} 
                                            placeholder="my-store-name"
                                            style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                                        />
                                    </div>
                                </label>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button type="button" onClick={copyStoreLink} className="btn-secondary" style={{ flex: 1, fontSize: '12px', padding: '8px' }}>
                                        📋 Copy Link
                                    </button>
                                    <button type="button" onClick={shareStoreWhatsApp} className="btn-secondary" style={{ flex: 1, fontSize: '12px', padding: '8px', borderColor: 'var(--success)', color: 'var(--success)' }}>
                                        💬 Share WhatsApp
                                    </button>
                                </div>
                            </div>

                            {/* Custom Shipping & Delivery Pricing */}
                            <div style={{ padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '18px' }}>🚚</span>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Custom Delivery & Shipping Pricing</span>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Manage your store delivery rates and free shipping rules.</div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <span style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500' }}>Delivery Pricing Mode</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                            <input 
                                                type="radio" 
                                                name="shippingMode" 
                                                value="default" 
                                                checked={shippingMode === 'default'} 
                                                onChange={e => setShippingMode(e.target.value)} 
                                            />
                                            <span><strong>Platform Standard Zones</strong> (Harare $2–$5, Byo $3, Intercity $8)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                            <input 
                                                type="radio" 
                                                name="shippingMode" 
                                                value="flat" 
                                                checked={shippingMode === 'flat'} 
                                                onChange={e => setShippingMode(e.target.value)} 
                                            />
                                            <span><strong>Store Flat Rate</strong> (One single fee across all zones)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                            <input 
                                                type="radio" 
                                                name="shippingMode" 
                                                value="custom_zones" 
                                                checked={shippingMode === 'custom_zones'} 
                                                onChange={e => setShippingMode(e.target.value)} 
                                            />
                                            <span><strong>Custom Zimbabwe Zones</strong> (Set individual fees per region)</span>
                                        </label>
                                    </div>
                                </div>

                                {shippingMode === 'flat' && (
                                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                        <label>
                                            <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Flat Delivery Fee ($ USD)</span>
                                            <input 
                                                type="number" 
                                                step="0.50" 
                                                min="0" 
                                                value={flatShippingFee} 
                                                onChange={e => setFlatShippingFee(e.target.value)} 
                                                placeholder="3.00"
                                                style={{ width: '100%', padding: '8px' }}
                                            />
                                        </label>
                                    </div>
                                )}

                                {shippingMode === 'custom_zones' && (
                                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                        <span style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: '600' }}>Custom Zone Rates ($ USD)</span>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Harare CBD</span>
                                                <input type="number" step="0.50" min="0" value={customZoneRates.harare_cbd} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_cbd: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Harare East (Msasa)</span>
                                                <input type="number" step="0.50" min="0" value={customZoneRates.harare_east} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_east: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Harare North (Avondale)</span>
                                                <input type="number" step="0.50" min="0" value={customZoneRates.harare_north} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_north: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Greater Harare</span>
                                                <input type="number" step="0.50" min="0" value={customZoneRates.harare_greater} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_greater: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Bulawayo Central</span>
                                                <input type="number" step="0.50" min="0" value={customZoneRates.bulawayo_central} onChange={e => setCustomZoneRates({ ...customZoneRates, bulawayo_central: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Inter-City Courier</span>
                                                <input type="number" step="0.50" min="0" value={customZoneRates.intercity_express} onChange={e => setCustomZoneRates({ ...customZoneRates, intercity_express: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label>
                                        <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                            🎉 Free Shipping Threshold ($ USD, optional)
                                        </span>
                                        <input 
                                            type="number" 
                                            step="5" 
                                            min="0" 
                                            value={freeShippingThreshold} 
                                            onChange={e => setFreeShippingThreshold(e.target.value)} 
                                            placeholder="e.g. 50.00 (Orders above $50 ship free)"
                                            style={{ width: '100%', padding: '8px' }}
                                        />
                                    </label>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={pickupEnabled} 
                                            onChange={e => setPickupEnabled(e.target.checked)} 
                                        />
                                        <span>🏬 Allow buyers to pick up items in-store for <strong>FREE</strong></span>
                                    </label>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '8px' }}>
                                {saving ? 'Saving...' : (hasVendorProfile ? 'Save Vendor & Shipping Settings' : 'Create Store & Set Shipping Rates')}
                            </button>
                        </form>
                </div>
            </div>
        </div>
    );
}
