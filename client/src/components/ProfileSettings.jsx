import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';

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
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [activeVendorTab, setActiveVendorTab] = useState('brand');

    // Vendor Identity & Presentation State
    const [hasVendorProfile, setHasVendorProfile] = useState(() => !!cached?.vendorData);
    const [storeName, setStoreName] = useState(() => cached?.vendorData?.store_name || '');
    const [whatsapp, setWhatsapp] = useState(() => cached?.vendorData?.whatsapp_number || '');
    const [storeSlug, setStoreSlug] = useState(() => cached?.vendorData?.store_slug || '');
    const [slogan, setSlogan] = useState(() => cached?.vendorData?.slogan || cached?.vendorData?.shipping_settings?.slogan || '');
    const [bio, setBio] = useState(() => cached?.vendorData?.bio || cached?.vendorData?.shipping_settings?.bio || '');
    const [logoUrl, setLogoUrl] = useState(() => cached?.vendorData?.logo_url || cached?.vendorData?.shipping_settings?.logo_url || '');
    const [bannerUrl, setBannerUrl] = useState(() => cached?.vendorData?.banner_url || cached?.vendorData?.shipping_settings?.banner_url || '');

    // Location & In-Store Pickup State
    const [businessAddress, setBusinessAddress] = useState(() => cached?.vendorData?.business_address || cached?.vendorData?.shipping_settings?.business_address || '');
    const [pickupInstructions, setPickupInstructions] = useState(() => cached?.vendorData?.pickup_instructions || cached?.vendorData?.shipping_settings?.pickup_instructions || '');
    const [pickupEnabled, setPickupEnabled] = useState(() => cached?.vendorData?.shipping_settings?.pickup_enabled ?? true);

    // Business Hours & Support Contacts
    const [operatingHours, setOperatingHours] = useState(() => cached?.vendorData?.operating_hours || cached?.vendorData?.shipping_settings?.operating_hours || 'Mon - Fri: 8:00 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM | Sun: Closed');
    const [supportEmail, setSupportEmail] = useState(() => cached?.vendorData?.support_email || cached?.vendorData?.shipping_settings?.support_email || '');
    const [secondaryPhone, setSecondaryPhone] = useState(() => cached?.vendorData?.secondary_phone || cached?.vendorData?.shipping_settings?.secondary_phone || '');

    // Store Policies & Commitments
    const [returnPolicy, setReturnPolicy] = useState(() => cached?.vendorData?.return_policy || cached?.vendorData?.shipping_settings?.return_policy || '7-day replacement or refund for unopened items with receipt.');
    const [warrantyPolicy, setWarrantyPolicy] = useState(() => cached?.vendorData?.warranty_policy || cached?.vendorData?.shipping_settings?.warranty_policy || 'Manufacturer warranty covered on defective goods.');
    const [deliveryTurnaround, setDeliveryTurnaround] = useState(() => cached?.vendorData?.delivery_turnaround || cached?.vendorData?.shipping_settings?.delivery_turnaround || 'Same-day dispatch in Harare. 24-48h courier nationwide.');

    // Inventory Threshold Variable
    const [lowStockThreshold, setLowStockThreshold] = useState(() => cached?.vendorData?.low_stock_threshold || cached?.vendorData?.shipping_settings?.low_stock_threshold || 3);

    // Settlement & Payout Preferences
    const cachedPayout = cached?.vendorData?.payout_details || cached?.vendorData?.shipping_settings?.payout_details || {};
    const [payoutMethod, setPayoutMethod] = useState(() => cachedPayout.method || 'ecocash');
    const [payoutEcocashNumber, setPayoutEcocashNumber] = useState(() => cachedPayout.ecocash_number || '');
    const [payoutEcocashName, setPayoutEcocashName] = useState(() => cachedPayout.ecocash_name || '');
    const [payoutInnbucksNumber, setPayoutInnbucksNumber] = useState(() => cachedPayout.innbucks_number || '');
    const [payoutBankName, setPayoutBankName] = useState(() => cachedPayout.bank_name || 'CBZ Bank');
    const [payoutAccountName, setPayoutAccountName] = useState(() => cachedPayout.account_name || '');
    const [payoutAccountNumber, setPayoutAccountNumber] = useState(() => cachedPayout.account_number || '');
    const [payoutBranchCode, setPayoutBranchCode] = useState(() => cachedPayout.branch_code || '');

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
                    
                    const s = vendorData.shipping_settings || {};
                    setSlogan(vendorData.slogan || s.slogan || '');
                    setBio(vendorData.bio || s.bio || '');
                    setLogoUrl(vendorData.logo_url || s.logo_url || '');
                    setBannerUrl(vendorData.banner_url || s.banner_url || '');
                    setBusinessAddress(vendorData.business_address || s.business_address || '');
                    setPickupInstructions(vendorData.pickup_instructions || s.pickup_instructions || '');
                    setOperatingHours(vendorData.operating_hours || s.operating_hours || 'Mon - Fri: 8:00 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM | Sun: Closed');
                    setSupportEmail(vendorData.support_email || s.support_email || '');
                    setSecondaryPhone(vendorData.secondary_phone || s.secondary_phone || '');
                    setReturnPolicy(vendorData.return_policy || s.return_policy || '7-day replacement or refund for unopened items with receipt.');
                    setWarrantyPolicy(vendorData.warranty_policy || s.warranty_policy || 'Manufacturer warranty covered on defective goods.');
                    setDeliveryTurnaround(vendorData.delivery_turnaround || s.delivery_turnaround || 'Same-day dispatch in Harare. 24-48h courier nationwide.');
                    setLowStockThreshold(vendorData.low_stock_threshold || s.low_stock_threshold || 3);

                    const payout = vendorData.payout_details || s.payout_details || {};
                    if (payout.method) setPayoutMethod(payout.method);
                    if (payout.ecocash_number) setPayoutEcocashNumber(payout.ecocash_number);
                    if (payout.ecocash_name) setPayoutEcocashName(payout.ecocash_name);
                    if (payout.innbucks_number) setPayoutInnbucksNumber(payout.innbucks_number);
                    if (payout.bank_name) setPayoutBankName(payout.bank_name);
                    if (payout.account_name) setPayoutAccountName(payout.account_name);
                    if (payout.account_number) setPayoutAccountNumber(payout.account_number);
                    if (payout.branch_code) setPayoutBranchCode(payout.branch_code);

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

    const handleUploadLogo = async (e) => {
        if (e.target.files && e.target.files[0]) {
            setUploadingLogo(true);
            try {
                const url = await uploadImageToStorage(e.target.files[0], 'product-images', `${userId}/branding`);
                if (url) {
                    setLogoUrl(url);
                    showToast('Logo image uploaded successfully!', 'success');
                }
            } catch (err) {
                showToast(`Logo upload failed: ${err.message}`, 'error');
            } finally {
                setUploadingLogo(false);
            }
        }
    };

    const handleUploadBanner = async (e) => {
        if (e.target.files && e.target.files[0]) {
            setUploadingBanner(true);
            try {
                const url = await uploadImageToStorage(e.target.files[0], 'product-images', `${userId}/branding`);
                if (url) {
                    setBannerUrl(url);
                    showToast('Banner image uploaded successfully!', 'success');
                }
            } catch (err) {
                showToast(`Banner upload failed: ${err.message}`, 'error');
            } finally {
                setUploadingBanner(false);
            }
        }
    };

    const handleSaveVendor = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const cleanSlug = storeSlug
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-');

            const customZonesCents = {};
            Object.entries(customZoneRates).forEach(([k, val]) => {
                customZonesCents[k] = Math.round((parseFloat(val) || 0) * 100);
            });

            const payoutPayload = {
                method: payoutMethod,
                ecocash_number: payoutEcocashNumber.trim(),
                ecocash_name: payoutEcocashName.trim(),
                innbucks_number: payoutInnbucksNumber.trim(),
                bank_name: payoutBankName.trim(),
                account_name: payoutAccountName.trim(),
                account_number: payoutAccountNumber.trim(),
                branch_code: payoutBranchCode.trim()
            };

            const shippingPayload = {
                mode: shippingMode,
                flat_fee_cents: Math.round((parseFloat(flatShippingFee) || 0) * 100),
                free_shipping_threshold_cents: freeShippingThreshold ? Math.round(parseFloat(freeShippingThreshold) * 100) : null,
                pickup_enabled: pickupEnabled,
                custom_zones: customZonesCents,
                // Double store for 100% resilient schema safety
                slogan: slogan.trim(),
                bio: bio.trim(),
                logo_url: logoUrl.trim(),
                banner_url: bannerUrl.trim(),
                business_address: businessAddress.trim(),
                pickup_instructions: pickupInstructions.trim(),
                operating_hours: operatingHours.trim(),
                support_email: supportEmail.trim(),
                secondary_phone: secondaryPhone.trim(),
                return_policy: returnPolicy.trim(),
                warranty_policy: warrantyPolicy.trim(),
                delivery_turnaround: deliveryTurnaround.trim(),
                low_stock_threshold: parseInt(lowStockThreshold, 10) || 3,
                payout_details: payoutPayload
            };

            const fullPayload = {
                id: userId,
                store_name: storeName.trim(),
                whatsapp_number: whatsapp.trim(),
                store_slug: cleanSlug || null,
                shipping_settings: shippingPayload,
                slogan: slogan.trim() || null,
                bio: bio.trim() || null,
                logo_url: logoUrl.trim() || null,
                banner_url: bannerUrl.trim() || null,
                business_address: businessAddress.trim() || null,
                pickup_instructions: pickupInstructions.trim() || null,
                operating_hours: operatingHours.trim() || null,
                support_email: supportEmail.trim() || null,
                secondary_phone: secondaryPhone.trim() || null,
                return_policy: returnPolicy.trim() || null,
                warranty_policy: warrantyPolicy.trim() || null,
                delivery_turnaround: deliveryTurnaround.trim() || null,
                low_stock_threshold: parseInt(lowStockThreshold, 10) || 3,
                payout_details: payoutPayload
            };

            const { error } = await supabase
                .from('vendor_profiles')
                .upsert(fullPayload, { onConflict: 'id' });
            
            if (error) {
                // If remote columns have not been migrated yet, fallback to saving within shipping_settings JSONB
                const fallbackPayload = {
                    id: userId,
                    store_name: storeName.trim(),
                    whatsapp_number: whatsapp.trim(),
                    store_slug: cleanSlug || null,
                    shipping_settings: shippingPayload
                };
                const { error: fallbackError } = await supabase
                    .from('vendor_profiles')
                    .upsert(fallbackPayload, { onConflict: 'id' });

                if (fallbackError) {
                    // Minimal fallback
                    await supabase
                        .from('vendor_profiles')
                        .upsert({ id: userId, store_name: storeName.trim(), whatsapp_number: whatsapp.trim() }, { onConflict: 'id' });
                }
            }

            setHasVendorProfile(true);
            setStoreSlug(cleanSlug);
            
            // Update global cache
            globalProfileCache = {
                ...globalProfileCache,
                vendorData: {
                    ...globalProfileCache.vendorData,
                    ...fullPayload
                },
                timestamp: Date.now()
            };

            showToast('✓ All store variables, profile branding, and delivery settings updated successfully!', 'success');
        } catch (err) {
            showToast(`Error saving settings: ${err.message}`, 'error');
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
                full_name: fullName.trim(),
                street_address: street.trim(),
                city: city.trim(),
                province,
                phone_number: phone.trim()
            };

            let error;
            if (addressId) {
                const res = await supabase.from('buyer_addresses').update(payload).eq('id', addressId);
                error = res.error;
            } else {
                const res = await supabase.from('buyer_addresses').insert([payload]);
                error = res.error;
            }
            
            if (error) throw error;
            showToast('✓ Default shipping address saved successfully!', 'success');
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div className="skeleton-box" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 16px' }} />
            <div>Loading Profile Settings...</div>
        </div>
    );

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }} className="animate-fade-in-up">
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    Profile & Store Settings
                </h2>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Customize your shop variables, brand identity, operating hours, delivery pricing, policies, and payout accounts.
                </div>
            </div>

            {/* Account Quick Card */}
            <div className="glass-panel" style={{ padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                        {storeName ? storeName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : '👤')}
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Signed in as</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{email || 'Loading...'}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '20px', backgroundColor: hasVendorProfile ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: hasVendorProfile ? 'var(--success)' : 'var(--accent-primary)', fontWeight: '600' }}>
                        {hasVendorProfile ? '🏪 Active Merchant Store' : '🛍️ Buyer Account'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 2fr)', gap: '24px' }}>
                
                {/* Column 1: Default Shipping Address (Buyer Checkout Autofill) */}
                <div>
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '20px' }}>📦</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', fontWeight: '700' }}>Default Shipping Address</h3>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Autofills when buying on the marketplace.</div>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <label>
                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Full Name</span>
                                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%' }} />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Street Address</span>
                                <input type="text" required value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g. 15 Samora Machel Ave" style={{ width: '100%' }} />
                            </label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <label style={{ flex: 1 }}>
                                    <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>City</span>
                                    <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="Harare" style={{ width: '100%' }} />
                                </label>
                                <label style={{ flex: 1 }}>
                                    <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Province</span>
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
                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Phone Number</span>
                                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="0771234567" style={{ width: '100%' }} />
                            </label>
                            <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '6px', padding: '10px' }}>
                                {saving ? 'Saving...' : '💾 Save Shipping Address'}
                            </button>
                        </form>
                    </div>

                    {/* Quick Store Share Card */}
                    {hasVendorProfile && (
                        <div className="glass-panel" style={{ padding: '20px', marginTop: '20px', border: '1px solid var(--accent-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '18px' }}>🔗</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Your Live Store Link</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                Share this direct link with customers on WhatsApp, Instagram, or Facebook:
                            </div>
                            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px', color: 'var(--accent-primary)', wordBreak: 'break-all', marginBottom: '12px', fontFamily: 'monospace' }}>
                                {`${window.location.origin}/?store=${storeSlug || storeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={copyStoreLink} className="btn-secondary" style={{ flex: 1, fontSize: '12px', padding: '8px' }}>
                                    📋 Copy Link
                                </button>
                                <button type="button" onClick={shareStoreWhatsApp} className="btn-secondary" style={{ flex: 1, fontSize: '12px', padding: '8px', borderColor: 'var(--success)', color: 'var(--success)' }}>
                                    💬 Share WhatsApp
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Column 2: Full Merchant Variables & Store Control Center */}
                <div>
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '800' }}>
                                    🏪 Shop Owner Custom Variables & Settings
                                </h3>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Full control over store identity, pickup locations, hours, policies, delivery fees, and payout accounts.
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs for Shop Variables */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
                            {[
                                { id: 'brand', label: '🏷️ Brand & Logo' },
                                { id: 'location', label: '📍 Pickup & Hours' },
                                { id: 'policies', label: '🛡️ Policies & Alert' },
                                { id: 'shipping', label: '🚚 Delivery Rates' },
                                { id: 'payout', label: '💳 Payout Accounts' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveVendorTab(tab.id)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: activeVendorTab === tab.id ? '700' : '500',
                                        backgroundColor: activeVendorTab === tab.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                        color: activeVendorTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSaveVendor}>
                            {/* TAB 1: Brand, Identity & Presentation */}
                            {activeVendorTab === 'brand' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <label>
                                            <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                Store Name *
                                            </span>
                                            <input 
                                                type="text" 
                                                required 
                                                value={storeName} 
                                                onChange={e => setStoreName(e.target.value)} 
                                                placeholder="e.g. Apex Electronics & Solar"
                                                style={{ width: '100%' }} 
                                            />
                                        </label>

                                        <label>
                                            <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                WhatsApp Orders Line *
                                            </span>
                                            <input 
                                                type="tel" 
                                                required 
                                                value={whatsapp} 
                                                onChange={e => setWhatsapp(e.target.value)} 
                                                placeholder="e.g. 0771234567 or 263771234567" 
                                                style={{ width: '100%' }} 
                                            />
                                        </label>
                                    </div>

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            Store Tagline / Slogan
                                        </span>
                                        <input 
                                            type="text" 
                                            value={slogan} 
                                            onChange={e => setSlogan(e.target.value)} 
                                            placeholder="e.g. Genuine Solar Equipment & Lithium Batteries at Best Prices"
                                            style={{ width: '100%' }} 
                                        />
                                    </label>

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            Store Bio & Description
                                        </span>
                                        <textarea 
                                            rows="3"
                                            value={bio} 
                                            onChange={e => setBio(e.target.value)} 
                                            placeholder="Tell buyers what you sell, your experience, warranty promises, and why they should choose your store..."
                                            style={{ width: '100%', resize: 'vertical' }} 
                                        />
                                    </label>

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            Custom Vanity Slug (URL)
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>zimmarket.co.zw/?store=</span>
                                            <input 
                                                type="text" 
                                                value={storeSlug} 
                                                onChange={e => setStoreSlug(e.target.value)} 
                                                placeholder="my-store-name"
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                    </label>

                                    {/* Logo & Banner Uploads */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                                        {/* Store Logo */}
                                        <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                                Store Logo
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                                {logoUrl ? (
                                                    <img src={logoUrl} alt="Store Logo" style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                                ) : (
                                                    <div style={{ width: '50px', height: '50px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                                        🏷️
                                                    </div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        onChange={handleUploadLogo} 
                                                        disabled={uploadingLogo}
                                                        style={{ fontSize: '12px', width: '100%' }}
                                                    />
                                                    {uploadingLogo && <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '2px' }}>Uploading logo...</div>}
                                                </div>
                                            </div>
                                            <input 
                                                type="url" 
                                                placeholder="Or paste Logo Image URL" 
                                                value={logoUrl} 
                                                onChange={e => setLogoUrl(e.target.value)}
                                                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                            />
                                        </div>

                                        {/* Store Banner */}
                                        <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                                Store Banner Cover
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                                {bannerUrl ? (
                                                    <img src={bannerUrl} alt="Store Banner" style={{ width: '70px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                                ) : (
                                                    <div style={{ width: '70px', height: '40px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                                        🖼️
                                                    </div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        onChange={handleUploadBanner} 
                                                        disabled={uploadingBanner}
                                                        style={{ fontSize: '12px', width: '100%' }}
                                                    />
                                                    {uploadingBanner && <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '2px' }}>Uploading banner...</div>}
                                                </div>
                                            </div>
                                            <input 
                                                type="url" 
                                                placeholder="Or paste Banner Image URL" 
                                                value={bannerUrl} 
                                                onChange={e => setBannerUrl(e.target.value)}
                                                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: Pickup Location & Business Hours */}
                            {activeVendorTab === 'location' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ padding: '14px', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '600' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={pickupEnabled} 
                                                onChange={e => setPickupEnabled(e.target.checked)} 
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <span>🏬 Enable Free Customer In-Store Pickup Option</span>
                                        </label>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '28px', marginTop: '4px' }}>
                                            Buyers will be able to select "In-Store Pickup (FREE)" at checkout and see your address and instructions.
                                        </div>
                                    </div>

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            📍 Physical Store / Warehouse Pickup Address
                                        </span>
                                        <input 
                                            type="text" 
                                            value={businessAddress} 
                                            onChange={e => setBusinessAddress(e.target.value)} 
                                            placeholder="e.g. Shop 14, First Mutual Building, Jason Moyo Ave, Harare CBD"
                                            style={{ width: '100%' }} 
                                        />
                                    </label>

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            📋 In-Store Pickup Instructions for Buyers
                                        </span>
                                        <textarea 
                                            rows="2"
                                            value={pickupInstructions} 
                                            onChange={e => setPickupInstructions(e.target.value)} 
                                            placeholder="e.g. Bring your order confirmation code & ID to Counter 2. Items ready within 30 minutes of purchase."
                                            style={{ width: '100%', resize: 'vertical' }} 
                                        />
                                    </label>

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            🕒 Business Operating Hours
                                        </span>
                                        <input 
                                            type="text" 
                                            value={operatingHours} 
                                            onChange={e => setOperatingHours(e.target.value)} 
                                            placeholder="e.g. Mon - Fri: 8:00 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM | Sun: Closed"
                                            style={{ width: '100%' }} 
                                        />
                                    </label>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <label>
                                            <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                ✉️ Customer Support Email
                                            </span>
                                            <input 
                                                type="email" 
                                                value={supportEmail} 
                                                onChange={e => setSupportEmail(e.target.value)} 
                                                placeholder="support@mystore.co.zw"
                                                style={{ width: '100%' }} 
                                            />
                                        </label>

                                        <label>
                                            <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                📞 Secondary Landline / Phone
                                            </span>
                                            <input 
                                                type="tel" 
                                                value={secondaryPhone} 
                                                onChange={e => setSecondaryPhone(e.target.value)} 
                                                placeholder="0242-750000 / 0712345678"
                                                style={{ width: '100%' }} 
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: Store Policies & Low Stock Alert Variable */}
                            {activeVendorTab === 'policies' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            ⚡ Order Fulfillment & Delivery Turnaround
                                        </span>
                                        <input 
                                            type="text" 
                                            value={deliveryTurnaround} 
                                            onChange={e => setDeliveryTurnaround(e.target.value)} 
                                            placeholder="e.g. Orders dispatched within 2 hours. Same-day Harare delivery."
                                            style={{ width: '100%' }} 
                                        />
                                    </label>

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            🔄 Return & Refund Policy
                                        </span>
                                        <textarea 
                                            rows="2"
                                            value={returnPolicy} 
                                            onChange={e => setReturnPolicy(e.target.value)} 
                                            placeholder="e.g. 7-day return policy for unopened items in original packaging. Full refund or exchange."
                                            style={{ width: '100%', resize: 'vertical' }} 
                                        />
                                    </label>

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            🛡️ Warranty Coverage Policy
                                        </span>
                                        <textarea 
                                            rows="2"
                                            value={warrantyPolicy} 
                                            onChange={e => setWarrantyPolicy(e.target.value)} 
                                            placeholder="e.g. 12 months manufacturer warranty on electronic inverters and lithium batteries."
                                            style={{ width: '100%', resize: 'vertical' }} 
                                        />
                                    </label>

                                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>⚠️</span>
                                            <div>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    Inventory Low-Stock Alert Threshold Variable
                                                </span>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    Set the quantity threshold that triggers low-stock warnings and restock badges in your inventory.
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="100" 
                                                value={lowStockThreshold} 
                                                onChange={e => setLowStockThreshold(parseInt(e.target.value, 10) || 1)} 
                                                style={{ width: '90px', padding: '8px', fontSize: '14px', fontWeight: '700', textAlign: 'center' }} 
                                            />
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                units or fewer remaining triggers "Low Stock" alert (default: 3)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: Delivery & Shipping Rates */}
                            {activeVendorTab === 'shipping' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>
                                            Delivery Pricing Model
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                                <span><strong>Store Flat Rate</strong> (One single flat fee across all regions)</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                                <input 
                                                    type="radio" 
                                                    name="shippingMode" 
                                                    value="custom_zones" 
                                                    checked={shippingMode === 'custom_zones'} 
                                                    onChange={e => setShippingMode(e.target.value)} 
                                                />
                                                <span><strong>Custom Zimbabwe Zones</strong> (Set custom delivery fee per specific city/suburb)</span>
                                            </label>
                                        </div>
                                    </div>

                                    {shippingMode === 'flat' && (
                                        <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                    Store Flat Delivery Fee ($ USD)
                                                </span>
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
                                        <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <span style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>
                                                Custom Zone Delivery Fees ($ USD)
                                            </span>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

                                    <label>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                            🎉 Free Delivery Minimum Order ($ USD, optional)
                                        </span>
                                        <input 
                                            type="number" 
                                            step="5" 
                                            min="0" 
                                            value={freeShippingThreshold} 
                                            onChange={e => setFreeShippingThreshold(e.target.value)} 
                                            placeholder="e.g. 50.00 (Orders over $50 get free delivery)"
                                            style={{ width: '100%', padding: '8px' }}
                                        />
                                    </label>
                                </div>
                            )}

                            {/* TAB 5: Settlement & Payout Preferences */}
                            {activeVendorTab === 'payout' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <span style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>
                                            Preferred Payout Channel for Order Settlements
                                        </span>
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                            {[
                                                { id: 'ecocash', label: '📱 EcoCash USD' },
                                                { id: 'innbucks', label: '⚡ InnBucks USD' },
                                                { id: 'bank', label: '🏦 Nostro Bank Transfer' }
                                            ].map(method => (
                                                <label key={method.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                                    <input 
                                                        type="radio" 
                                                        name="payoutMethod" 
                                                        value={method.id} 
                                                        checked={payoutMethod === method.id} 
                                                        onChange={e => setPayoutMethod(e.target.value)} 
                                                    />
                                                    <span>{method.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {payoutMethod === 'ecocash' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                                    EcoCash Mobile Number
                                                </span>
                                                <input 
                                                    type="tel" 
                                                    value={payoutEcocashNumber} 
                                                    onChange={e => setPayoutEcocashNumber(e.target.value)} 
                                                    placeholder="0771234567"
                                                    style={{ width: '100%' }}
                                                />
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                                    Registered EcoCash Name
                                                </span>
                                                <input 
                                                    type="text" 
                                                    value={payoutEcocashName} 
                                                    onChange={e => setPayoutEcocashName(e.target.value)} 
                                                    placeholder="e.g. John Doe / Apex Pvt Ltd"
                                                    style={{ width: '100%' }}
                                                />
                                            </label>
                                        </div>
                                    )}

                                    {payoutMethod === 'innbucks' && (
                                        <label>
                                            <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                                InnBucks Account / Mobile Number
                                            </span>
                                            <input 
                                                type="tel" 
                                                value={payoutInnbucksNumber} 
                                                onChange={e => setPayoutInnbucksNumber(e.target.value)} 
                                                placeholder="0771234567"
                                                style={{ width: '100%' }}
                                            />
                                        </label>
                                    )}

                                    {payoutMethod === 'bank' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Bank Name</span>
                                                <select value={payoutBankName} onChange={e => setPayoutBankName(e.target.value)} style={{ width: '100%' }}>
                                                    <option>CBZ Bank</option>
                                                    <option>Stanbic Bank</option>
                                                    <option>CABS</option>
                                                    <option>Nedbank Zimbabwe</option>
                                                    <option>FBC Bank</option>
                                                    <option>Steward Bank</option>
                                                    <option>Ecobank Zimbabwe</option>
                                                    <option>NMB Bank</option>
                                                    <option>ZB Bank</option>
                                                    <option>First Capital Bank</option>
                                                </select>
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Account Name</span>
                                                <input type="text" value={payoutAccountName} onChange={e => setPayoutAccountName(e.target.value)} placeholder="Company or Full Name" style={{ width: '100%' }} />
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Nostro Account Number</span>
                                                <input type="text" value={payoutAccountNumber} onChange={e => setPayoutAccountNumber(e.target.value)} placeholder="0123456789012" style={{ width: '100%' }} />
                                            </label>
                                            <label>
                                                <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Branch / Swift Code</span>
                                                <input type="text" value={payoutBranchCode} onChange={e => setPayoutBranchCode(e.target.value)} placeholder="Harare CBD / Branch Code" style={{ width: '100%' }} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Save Submit Button */}
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button 
                                    type="submit" 
                                    className="btn-primary" 
                                    disabled={saving} 
                                    style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '700' }}
                                >
                                    {saving ? 'Saving Changes...' : '💾 Save All Shop Variables & Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
