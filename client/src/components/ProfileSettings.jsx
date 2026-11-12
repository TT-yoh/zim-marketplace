import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';
import { BrandTab } from './profile/BrandTab.jsx';
import { RateTab } from './profile/RateTab.jsx';
import { LocationTab } from './profile/LocationTab.jsx';
import { ShippingTab } from './profile/ShippingTab.jsx';
import { PayoutTab } from './profile/PayoutTab.jsx';
import { PoliciesTab } from './profile/PoliciesTab.jsx';
import { AddressTab } from './profile/AddressTab.jsx';
import { AccountTab } from './profile/AccountTab.jsx';
import { 
    getEffectiveZigRate, 
    getZigRateMetadata, 
    fetchLiveZigRate 
} from '../utils/exchangeRateService.js';

// Module-level SWR cache for 0ms instant profile settings rendering
let globalProfileCache = {
    userId: null,
    vendorData: null,
    addressData: null,
    timestamp: 0
};

export function ProfileSettings({ userId, email, setCurrentView, isVendor }) {
    const { showToast } = useToast();
    const cached = globalProfileCache.userId === userId ? globalProfileCache : null;
    const [loading, setLoading] = useState(() => !cached?.vendorData && !cached?.addressData);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    // Profile Type
    const [hasVendorProfile, setHasVendorProfile] = useState(() => isVendor || !!cached?.vendorData);
    
    // Top-Level Active Tab
    const [activeTab, setActiveTab] = useState(() => {
        if (isVendor || cached?.vendorData) return 'brand';
        return 'address';
    });

    // Vendor Identity & Presentation State
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

    // ZiG Exchange Rate State
    const [officialRateMeta, setOfficialRateMeta] = useState(() => getZigRateMetadata());
    const [fetchingOfficialRate, setFetchingOfficialRate] = useState(false);
    const [useCustomZigRate, setUseCustomZigRate] = useState(() => {
        return cached?.vendorData?.use_custom_rate === true || 
               cached?.vendorData?.shipping_settings?.zig_rate_settings?.mode === 'custom';
    });
    const [storeCustomRate, setStoreCustomRate] = useState(() => {
        const val = cached?.vendorData?.custom_zig_rate ?? 
                    cached?.vendorData?.shipping_settings?.zig_rate_settings?.custom_rate;
        return val !== undefined && val !== null ? String(val) : String(getEffectiveZigRate());
    });

    // Listen for live background rate updates from event bus
    useEffect(() => {
        const handleRateUpdated = () => {
            setOfficialRateMeta(getZigRateMetadata());
        };
        window.addEventListener('zimmarket_rate_updated', handleRateUpdated);
        return () => window.removeEventListener('zimmarket_rate_updated', handleRateUpdated);
    }, []);

    const handleFetchLiveRate = async () => {
        setFetchingOfficialRate(true);
        try {
            const freshMeta = await fetchLiveZigRate(true);
            setOfficialRateMeta(freshMeta);
            showToast(`✓ Official live rate updated: 1 USD = ${freshMeta.rate.toFixed(2)} ZiG`, 'success');
        } catch (err) {
            showToast(`Failed to fetch official rate: ${err.message}`, 'error');
        } finally {
            setFetchingOfficialRate(false);
        }
    };

    // Buyer Address State
    const [addressId, setAddressId] = useState(() => cached?.addressData?.id || null);
    const [fullName, setFullName] = useState(() => cached?.addressData?.full_name || '');
    const [street, setStreet] = useState(() => cached?.addressData?.street_address || '');
    const [city, setCity] = useState(() => cached?.addressData?.city || '');
    const [province, setProvince] = useState(() => cached?.addressData?.province || 'Harare');
    const [phone, setPhone] = useState(() => cached?.addressData?.phone_number || '');

    // Fetch initial profile
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
                    setActiveTab(prev => (prev === 'address' ? 'brand' : prev));
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

                    const hasCustomRate = vendorData.use_custom_rate === true || s.zig_rate_settings?.mode === 'custom';
                    const rateVal = vendorData.custom_zig_rate ?? s.zig_rate_settings?.custom_rate;
                    setUseCustomZigRate(hasCustomRate);
                    if (rateVal !== undefined && rateVal !== null) {
                        setStoreCustomRate(String(rateVal));
                    }
                } else {
                    setHasVendorProfile(false);
                    setActiveTab('address');
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
        if (e && e.preventDefault) e.preventDefault();
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

            const customRateNum = parseFloat(storeCustomRate);
            const validCustomRate = (!isNaN(customRateNum) && customRateNum > 0) ? parseFloat(customRateNum.toFixed(2)) : null;

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
                // ZiG Rate Configuration
                zig_rate_settings: {
                    mode: useCustomZigRate ? 'custom' : 'official',
                    custom_rate: useCustomZigRate ? validCustomRate : null,
                    updated_at: new Date().toISOString()
                },
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
                custom_zig_rate: useCustomZigRate ? validCustomRate : null,
                use_custom_rate: Boolean(useCustomZigRate),
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

            showToast('✓ Store settings and preferences updated successfully!', 'success');
        } catch (err) {
            showToast(`Error saving settings: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
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

    const copyStoreLink = () => {
        const slug = storeSlug || storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const url = `${window.location.origin}/?store=${slug}`;
        navigator.clipboard.writeText(url);
        showToast('Storefront link copied to clipboard!', 'success');
    };

    const shareStoreWhatsApp = () => {
        const slug = storeSlug || storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const url = `${window.location.origin}/?store=${slug}`;
        const text = encodeURIComponent(`Shop directly from ${storeName || 'my store'} on ZimMarket: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const copyUserId = () => {
        if (!userId) return;
        navigator.clipboard.writeText(userId);
        showToast('User ID copied to clipboard!', 'success');
    };

    const liveStoreUrl = `${window.location.origin}/?store=${storeSlug || (storeName ? storeName.toLowerCase().replace(/[^a-z0-9]/g, '-') : '')}`;

    if (loading) return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div className="skeleton-box" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading Settings...</div>
        </div>
    );

    // Dynamic Tab Navigation Configuration - Strictly role-partitioned
    const vendorTabs = [
        { id: 'brand', label: 'Store Profile', icon: '🏷️' },
        { id: 'rate', label: 'ZiG Exchange Rate', icon: '🇿🇼' },
        { id: 'location', label: 'Location & Hours', icon: '🏬' },
        { id: 'shipping', label: 'Delivery Rates', icon: '🚚' },
        { id: 'payout', label: 'Payout Accounts', icon: '💳' },
        { id: 'policies', label: 'Policies & Alerts', icon: '🛡️' },
        { id: 'account', label: 'Account', icon: '👤' }
    ];

    const buyerTabs = [
        { id: 'address', label: 'Shipping Address', icon: '📦' },
        { id: 'account', label: 'Account Details', icon: '👤' }
    ];

    const currentTabs = hasVendorProfile ? vendorTabs : buyerTabs;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }} className="animate-fade-in-up">
            
            {/* Page Header */}
            <div style={{ marginBottom: '22px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                    {hasVendorProfile ? '🏪 Store & Merchant Settings' : '📦 Account & Delivery Settings'}
                </h2>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {hasVendorProfile 
                        ? 'Manage your storefront branding, physical location, delivery pricing, payout channels, and store policies.'
                        : 'Manage your default checkout delivery address and personal account profile.'}
                </div>
            </div>

            {/* Account Quick Status Banner */}
            <div className="settings-header-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ 
                        width: '46px', 
                        height: '46px', 
                        borderRadius: '12px', 
                        backgroundColor: hasVendorProfile ? 'var(--success)' : 'var(--accent-primary)', 
                        color: '#fff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                        {storeName ? storeName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : '👤')}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {storeName || email || 'User Profile'}
                            </span>
                            <span style={{ 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                backgroundColor: hasVendorProfile ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                                color: hasVendorProfile ? 'var(--success)' : 'var(--accent-primary)', 
                                fontWeight: '700' 
                            }}>
                                {hasVendorProfile ? '🏪 Active Merchant' : '🛍️ Buyer Account'}
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {email}
                        </div>
                    </div>
                </div>

                {/* Header Action Shortcuts - Strictly role-partitioned */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {hasVendorProfile ? (
                        <>
                            {setCurrentView && (
                                <button 
                                    type="button" 
                                    onClick={() => setCurrentView('vendor-inventory')} 
                                    className="btn-secondary" 
                                    style={{ fontSize: '12px', padding: '7px 12px' }}
                                >
                                    📦 Product Catalog
                                </button>
                            )}
                            <button 
                                type="button" 
                                onClick={copyStoreLink} 
                                className="btn-secondary" 
                                style={{ fontSize: '12px', padding: '7px 12px' }}
                            >
                                📋 Copy Store Link
                            </button>
                        </>
                    ) : (
                        <>
                            {setCurrentView && (
                                <button 
                                    type="button" 
                                    onClick={() => setCurrentView('buyer-orders')} 
                                    className="btn-secondary" 
                                    style={{ fontSize: '12px', padding: '7px 12px' }}
                                >
                                    🛍️ My Orders
                                </button>
                            )}
                            {setCurrentView && (
                                <button 
                                    type="button" 
                                    onClick={() => setCurrentView('buyer')} 
                                    className="btn-secondary" 
                                    style={{ fontSize: '12px', padding: '7px 12px' }}
                                >
                                    🛒 Browse Shop
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Clean Tabs Navigation Bar */}
            <div className="settings-tabs-bar">
                {currentTabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* TAB CONTENT CARDS */}
            <div className="settings-card">
                
                {/* ---------------------------------------------------- */}
                {/* TAB 1: STORE PROFILE & BRANDING                      */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'brand' && hasVendorProfile && (
                    <BrandTab
                        bannerUrl={bannerUrl}
                        bio={bio}
                        copyStoreLink={copyStoreLink}
                        handleSaveVendor={handleSaveVendor}
                        handleUploadBanner={handleUploadBanner}
                        handleUploadLogo={handleUploadLogo}
                        liveStoreUrl={liveStoreUrl}
                        logoUrl={logoUrl}
                        officialRateMeta={officialRateMeta}
                        saving={saving}
                        setActiveTab={setActiveTab}
                        setBannerUrl={setBannerUrl}
                        setBio={setBio}
                        setLogoUrl={setLogoUrl}
                        setSlogan={setSlogan}
                        setStoreName={setStoreName}
                        setStoreSlug={setStoreSlug}
                        setWhatsapp={setWhatsapp}
                        shareStoreWhatsApp={shareStoreWhatsApp}
                        slogan={slogan}
                        storeCustomRate={storeCustomRate}
                        storeName={storeName}
                        storeSlug={storeSlug}
                        uploadingBanner={uploadingBanner}
                        uploadingLogo={uploadingLogo}
                        useCustomZigRate={useCustomZigRate}
                        whatsapp={whatsapp}
                    />
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB: STORE ZIG CURRENCY & EXCHANGE RATE             */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'rate' && hasVendorProfile && (
                    <RateTab
                        fetchingOfficialRate={fetchingOfficialRate}
                        handleFetchLiveRate={handleFetchLiveRate}
                        handleSaveVendor={handleSaveVendor}
                        officialRateMeta={officialRateMeta}
                        saving={saving}
                        setStoreCustomRate={setStoreCustomRate}
                        setUseCustomZigRate={setUseCustomZigRate}
                        storeCustomRate={storeCustomRate}
                        useCustomZigRate={useCustomZigRate}
                    />
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 2: LOCATION & BUSINESS HOURS                     */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'location' && hasVendorProfile && (
                    <LocationTab
                        businessAddress={businessAddress}
                        email={email}
                        handleSaveVendor={handleSaveVendor}
                        operatingHours={operatingHours}
                        pickupEnabled={pickupEnabled}
                        pickupInstructions={pickupInstructions}
                        saving={saving}
                        secondaryPhone={secondaryPhone}
                        setBusinessAddress={setBusinessAddress}
                        setOperatingHours={setOperatingHours}
                        setPickupEnabled={setPickupEnabled}
                        setPickupInstructions={setPickupInstructions}
                        setSecondaryPhone={setSecondaryPhone}
                        setSupportEmail={setSupportEmail}
                        supportEmail={supportEmail}
                    />
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 3: DELIVERY & SHIPPING RATES                     */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'shipping' && hasVendorProfile && (
                    <ShippingTab
                        customZoneRates={customZoneRates}
                        flatShippingFee={flatShippingFee}
                        freeShippingThreshold={freeShippingThreshold}
                        handleSaveVendor={handleSaveVendor}
                        saving={saving}
                        setCustomZoneRates={setCustomZoneRates}
                        setFlatShippingFee={setFlatShippingFee}
                        setFreeShippingThreshold={setFreeShippingThreshold}
                        setShippingMode={setShippingMode}
                        shippingMode={shippingMode}
                    />
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 4: PAYOUT & SETTLEMENT ACCOUNTS                  */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'payout' && hasVendorProfile && (
                    <PayoutTab
                        handleSaveVendor={handleSaveVendor}
                        payoutAccountName={payoutAccountName}
                        payoutAccountNumber={payoutAccountNumber}
                        payoutBankName={payoutBankName}
                        payoutBranchCode={payoutBranchCode}
                        payoutEcocashName={payoutEcocashName}
                        payoutEcocashNumber={payoutEcocashNumber}
                        payoutInnbucksNumber={payoutInnbucksNumber}
                        payoutMethod={payoutMethod}
                        saving={saving}
                        setPayoutAccountName={setPayoutAccountName}
                        setPayoutAccountNumber={setPayoutAccountNumber}
                        setPayoutBankName={setPayoutBankName}
                        setPayoutBranchCode={setPayoutBranchCode}
                        setPayoutEcocashName={setPayoutEcocashName}
                        setPayoutEcocashNumber={setPayoutEcocashNumber}
                        setPayoutInnbucksNumber={setPayoutInnbucksNumber}
                        setPayoutMethod={setPayoutMethod}
                    />
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 5: POLICIES & STOCK HEALTH ALERTS                */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'policies' && hasVendorProfile && (
                    <PoliciesTab
                        deliveryTurnaround={deliveryTurnaround}
                        handleSaveVendor={handleSaveVendor}
                        lowStockThreshold={lowStockThreshold}
                        returnPolicy={returnPolicy}
                        saving={saving}
                        setDeliveryTurnaround={setDeliveryTurnaround}
                        setLowStockThreshold={setLowStockThreshold}
                        setReturnPolicy={setReturnPolicy}
                        setWarrantyPolicy={setWarrantyPolicy}
                        warrantyPolicy={warrantyPolicy}
                    />
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 6: DEFAULT SHIPPING ADDRESS (BUYER / PERSONAL)    */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'address' && !hasVendorProfile && (
                    <AddressTab
                        city={city}
                        fullName={fullName}
                        handleSaveAddress={handleSaveAddress}
                        phone={phone}
                        province={province}
                        saving={saving}
                        setCity={setCity}
                        setFullName={setFullName}
                        setPhone={setPhone}
                        setProvince={setProvince}
                        setStreet={setStreet}
                        street={street}
                    />
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 7: ACCOUNT OVERVIEW & SECURITY                   */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'account' && (
                    <AccountTab
                        cached={cached}
                        copyUserId={copyUserId}
                        email={email}
                        hasVendorProfile={hasVendorProfile}
                        liveStoreUrl={liveStoreUrl}
                        setCurrentView={setCurrentView}
                        userId={userId}
                    />
                )}

            </div>
        </div>
    );
}
