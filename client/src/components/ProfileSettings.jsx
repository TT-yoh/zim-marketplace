import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';
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
                    <form onSubmit={handleSaveVendor} className="animate-fade-in">
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>🏪</span> Storefront Identity & Direct Links
                            </div>
                            <div className="settings-section-subtitle">
                                Define your public business name, contact line, and custom web address.
                            </div>

                            <div className="settings-grid-2" style={{ marginBottom: '16px' }}>
                                <label>
                                    <span className="form-label">Store Business Name *</span>
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
                                    <span className="form-label">WhatsApp Customer Orders Line *</span>
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

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span className="form-label">Store Tagline / Slogan</span>
                                <input 
                                    type="text" 
                                    value={slogan} 
                                    onChange={e => setSlogan(e.target.value)} 
                                    placeholder="e.g. Genuine Solar Equipment & Lithium Batteries at Best Prices"
                                    style={{ width: '100%' }} 
                                />
                            </label>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span className="form-label">Vanity URL Slug</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                        zimmarket.co.zw/?store=
                                    </span>
                                    <input 
                                        type="text" 
                                        value={storeSlug} 
                                        onChange={e => setStoreSlug(e.target.value)} 
                                        placeholder="apex-solar"
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            </label>

                            {/* Live Storefront Share Box */}
                            <div style={{ 
                                padding: '14px 18px', 
                                backgroundColor: 'rgba(59, 130, 246, 0.06)', 
                                border: '1px solid rgba(59, 130, 246, 0.25)', 
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '3px' }}>
                                        🔗 Your Live Storefront Link:
                                    </div>
                                    <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                        {liveStoreUrl}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        type="button" 
                                        onClick={copyStoreLink} 
                                        className="btn-secondary" 
                                        style={{ fontSize: '12px', padding: '6px 12px' }}
                                    >
                                        📋 Copy Link
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={shareStoreWhatsApp} 
                                        className="btn-secondary" 
                                        style={{ fontSize: '12px', padding: '6px 12px', borderColor: 'var(--success)', color: 'var(--success)' }}
                                    >
                                        💬 WhatsApp
                                    </button>
                                    <a 
                                        href={liveStoreUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="btn-secondary" 
                                        style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
                                    >
                                        👁️ View Store
                                    </a>
                                </div>
                            </div>

                            {/* Quick ZiG Rate Pill */}
                            <div style={{ 
                                marginTop: '12px', 
                                padding: '12px 16px', 
                                backgroundColor: 'var(--bg-secondary)', 
                                borderRadius: '10px', 
                                border: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '16px' }}>🇿🇼</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>Active Store ZiG Rate:</span>
                                    <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                                        1 USD = {useCustomZigRate ? (parseFloat(storeCustomRate) || officialRateMeta.rate).toFixed(2) : officialRateMeta.rate.toFixed(2)} ZiG
                                    </strong>
                                    <span style={{ 
                                        fontSize: '11px', 
                                        padding: '2px 8px', 
                                        borderRadius: '10px', 
                                        backgroundColor: useCustomZigRate ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                                        color: useCustomZigRate ? 'var(--accent-primary)' : 'var(--success)', 
                                        fontWeight: '700' 
                                    }}>
                                        {useCustomZigRate ? '🏪 Custom Store Multiplier' : '🌐 Official RBZ Live Rate'}
                                    </span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setActiveTab('rate')} 
                                    className="btn-secondary" 
                                    style={{ fontSize: '12px', padding: '5px 12px' }}
                                >
                                    Adjust Rate ⚙️
                                </button>
                            </div>
                        </div>

                        {/* Store Description & Bio */}
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>📝</span> About Your Store (Bio)
                            </div>
                            <div className="settings-section-subtitle">
                                Share your merchant experience, warranty promises, and what makes your catalog special.
                            </div>
                            <textarea 
                                rows="3"
                                value={bio} 
                                onChange={e => setBio(e.target.value)} 
                                placeholder="Describe what you sell, authentic brand guarantees, warranty policies, and same-day dispatch commitments..."
                                style={{ width: '100%', resize: 'vertical' }} 
                            />
                        </div>

                        {/* Store Branding Visuals */}
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>🎨</span> Brand Visuals & Media
                            </div>
                            <div className="settings-section-subtitle">
                                Upload a crisp square logo and a panoramic storefront banner cover.
                            </div>

                            <div className="settings-grid-2">
                                {/* Logo Upload */}
                                <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                                        Store Logo (Square)
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Store Logo" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                        ) : (
                                            <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
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
                                            {uploadingLogo && <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>Compressing & uploading logo...</div>}
                                        </div>
                                    </div>
                                    <input 
                                        type="url" 
                                        placeholder="Or paste Logo Image URL" 
                                        value={logoUrl} 
                                        onChange={e => setLogoUrl(e.target.value)}
                                        style={{ width: '100%', fontSize: '12px', padding: '7px 10px' }}
                                    />
                                </div>

                                {/* Banner Upload */}
                                <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                                        Storefront Banner Cover
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                                        {bannerUrl ? (
                                            <img src={bannerUrl} alt="Store Banner" style={{ width: '90px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                        ) : (
                                            <div style={{ width: '90px', height: '56px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
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
                                            {uploadingBanner && <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>Compressing & uploading banner...</div>}
                                        </div>
                                    </div>
                                    <input 
                                        type="url" 
                                        placeholder="Or paste Banner Image URL" 
                                        value={bannerUrl} 
                                        onChange={e => setBannerUrl(e.target.value)}
                                        style={{ width: '100%', fontSize: '12px', padding: '7px 10px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Action Footer */}
                        <div className="settings-footer-actions">
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                ✨ Changes immediately update your live storefront on ZimMarket.
                            </span>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={saving} 
                                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                            >
                                {saving ? 'Saving Changes...' : '💾 Save Store Profile'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB: STORE ZIG CURRENCY & EXCHANGE RATE             */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'rate' && hasVendorProfile && (
                    <form onSubmit={handleSaveVendor} className="animate-fade-in">
                        {/* Section Card: Official Rate Feed */}
                        <div className="settings-section-card" style={{ borderColor: 'rgba(16, 185, 129, 0.35)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                                <div>
                                    <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🇿🇼</span> Official Reserve Bank of Zimbabwe (RBZ) Interbank Feed
                                    </div>
                                    <div className="settings-section-subtitle">
                                        Live foreign exchange benchmark retrieved from official banking heads and public currency feeds.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleFetchLiveRate}
                                    disabled={fetchingOfficialRate}
                                    className="btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '700' }}
                                >
                                    <span style={{ display: 'inline-block', transform: fetchingOfficialRate ? 'rotate(360deg)' : 'none', transition: 'transform 0.8s ease' }}>
                                        🔄
                                    </span>
                                    {fetchingOfficialRate ? 'Connecting to Feeds...' : 'Fetch Official Live Rate'}
                                </button>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '14px',
                                padding: '16px',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Official Reference Rate
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                                        1 USD = {officialRateMeta.rate?.toFixed(2)} ZiG
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Authority Source
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '6px' }}>
                                        {officialRateMeta.source || 'Reserve Bank of Zimbabwe & Interbank Feed'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Live Feed Health
                                    </div>
                                    <div style={{ marginTop: '6px' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            backgroundColor: officialRateMeta.isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                            color: officialRateMeta.isLive ? 'var(--success)' : 'var(--warning, #f59e0b)'
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: officialRateMeta.isLive ? 'var(--success)' : '#f59e0b' }} />
                                            {officialRateMeta.isLive ? '🟢 Live Interbank Stream' : '🟠 Cached Baseline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section Card: Store Rate Policy Selection */}
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>🏪</span> Store Pricing & Conversion Policy
                            </div>
                            <div className="settings-section-subtitle">
                                Select how your product catalog prices are converted to Zimbabwe Gold (ZiG) when buyers view in local currency.
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                                {/* Option 1: Official Rate */}
                                <label className={`radio-card ${!useCustomZigRate ? 'active' : ''}`} style={{ padding: '16px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="zigRateMode"
                                        checked={!useCustomZigRate}
                                        onChange={() => setUseCustomZigRate(false)}
                                    />
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            🌐 Follow Official RBZ Live Rate (Default)
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                                            Automatically tracks daily Reserve Bank / Interbank rates. Zero maintenance required.
                                        </div>
                                        <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--success)' }}>
                                            Active: 1 USD = {officialRateMeta.rate?.toFixed(2)} ZiG
                                        </div>
                                    </div>
                                </label>

                                {/* Option 2: Custom Store Rate */}
                                <label className={`radio-card ${useCustomZigRate ? 'active' : ''}`} style={{ padding: '16px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="zigRateMode"
                                        checked={useCustomZigRate}
                                        onChange={() => setUseCustomZigRate(true)}
                                    />
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            🏪 Set Custom Store Exchange Rate
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                                            Specify your own store multiplier to adjust for local supplier costs, cash premiums, or promotional margins.
                                        </div>
                                        <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                            {useCustomZigRate ? `Active: 1 USD = ${(parseFloat(storeCustomRate) || officialRateMeta.rate).toFixed(2)} ZiG` : 'Click to configure custom multiplier'}
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Custom Rate Input & Simulator */}
                            {useCustomZigRate && (
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    marginBottom: '16px'
                                }} className="animate-fade-in">
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{ flex: '1', minWidth: '240px' }}>
                                            <span className="form-label">Your Store Rate (ZiG per 1 USD) *</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                    1 USD =
                                                </span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="1"
                                                    required={useCustomZigRate}
                                                    value={storeCustomRate}
                                                    onChange={e => setStoreCustomRate(e.target.value)}
                                                    placeholder={officialRateMeta.rate?.toFixed(2) || '26.76'}
                                                    style={{ width: '130px', fontSize: '18px', fontWeight: '700', padding: '8px 12px' }}
                                                />
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                    ZiG
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setStoreCustomRate(officialRateMeta.rate.toFixed(2))}
                                                    className="btn-secondary"
                                                    style={{ fontSize: '12px', padding: '7px 12px' }}
                                                    title="Copy current official RBZ rate into your custom input"
                                                >
                                                    ⚡ Match Official ({officialRateMeta.rate.toFixed(2)})
                                                </button>
                                            </div>
                                        </div>

                                        {/* Variance vs Official Metric */}
                                        {(() => {
                                            const customVal = parseFloat(storeCustomRate) || 0;
                                            const diff = customVal - officialRateMeta.rate;
                                            const diffPct = officialRateMeta.rate > 0 ? ((diff / officialRateMeta.rate) * 100).toFixed(1) : 0;
                                            return (
                                                <div style={{
                                                    padding: '10px 14px',
                                                    borderRadius: '10px',
                                                    backgroundColor: 'var(--bg-tertiary)',
                                                    border: '1px solid var(--border)',
                                                    fontSize: '12px'
                                                }}>
                                                    <div style={{ color: 'var(--text-muted)' }}>Variance vs Official Feed</div>
                                                    <div style={{
                                                        fontSize: '14px',
                                                        fontWeight: '700',
                                                        color: diff === 0 ? 'var(--text-secondary)' : diff > 0 ? 'var(--accent-primary)' : 'var(--warning, #f59e0b)',
                                                        marginTop: '2px'
                                                    }}>
                                                        {diff === 0 ? 'Exact Match (0.0%)' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)} ZiG (${diffPct}%)`}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Live Conversion Simulation Box */}
                                    <div style={{
                                        padding: '14px 18px',
                                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(59, 130, 246, 0.25)',
                                        fontSize: '13px'
                                    }}>
                                        <div style={{ fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '6px' }}>
                                            📊 Live Catalog Conversion Simulation
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', color: 'var(--text-secondary)' }}>
                                            <div>
                                                Item Listed At: <strong style={{ color: 'var(--text-primary)' }}>$10.00 USD</strong>
                                            </div>
                                            <div>
                                                Customer Sees (Your Rate): <strong style={{ color: 'var(--success)' }}>
                                                    ZiG {((10 * (parseFloat(storeCustomRate) || officialRateMeta.rate))).toFixed(2)}
                                                </strong>
                                            </div>
                                            <div>
                                                Official RBZ Value: <span style={{ color: 'var(--text-muted)' }}>
                                                    ZiG {(10 * officialRateMeta.rate).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Footer */}
                        <div className="settings-footer-actions">
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                🇿🇼 ZiG conversion updates immediately apply to all products in your store.
                            </span>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={saving}
                                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                            >
                                {saving ? 'Saving Changes...' : '💾 Save Exchange Rate Preference'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 2: LOCATION & BUSINESS HOURS                     */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'location' && hasVendorProfile && (
                    <form onSubmit={handleSaveVendor} className="animate-fade-in">
                        {/* In-Store Pickup Option Toggle */}
                        <div className="settings-section-card" style={{ borderColor: pickupEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={pickupEnabled} 
                                    onChange={e => setPickupEnabled(e.target.checked)} 
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        🏬 Enable Free In-Store Customer Pickup
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Allows buyers to select "In-Store Pickup (FREE)" at checkout and see your collection address and instructions.
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Address & Instructions */}
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>📍</span> Physical Stand / Store Address
                            </div>
                            <div className="settings-section-subtitle">
                                The exact walk-in location where customers or dispatch riders collect orders.
                            </div>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span className="form-label">Physical Address</span>
                                <input 
                                    type="text" 
                                    value={businessAddress} 
                                    onChange={e => setBusinessAddress(e.target.value)} 
                                    placeholder="e.g. Shop 14, First Mutual Building, Jason Moyo Ave, Harare CBD"
                                    style={{ width: '100%' }} 
                                />
                            </label>

                            <label style={{ display: 'block' }}>
                                <span className="form-label">Collection Instructions for Buyers</span>
                                <textarea 
                                    rows="2"
                                    value={pickupInstructions} 
                                    onChange={e => setPickupInstructions(e.target.value)} 
                                    placeholder="e.g. Bring order confirmation SMS to Counter 2. Items ready within 30 minutes of purchase."
                                    style={{ width: '100%', resize: 'vertical' }} 
                                />
                            </label>
                        </div>

                        {/* Operating Hours & Contacts */}
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>🕒</span> Operating Hours & Direct Contacts
                            </div>
                            <div className="settings-section-subtitle">
                                Keep buyers informed on when your shop is open for dispatch and customer inquiries.
                            </div>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span className="form-label">Weekly Operating Hours</span>
                                <input 
                                    type="text" 
                                    value={operatingHours} 
                                    onChange={e => setOperatingHours(e.target.value)} 
                                    placeholder="e.g. Mon - Fri: 8:00 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM | Sun: Closed"
                                    style={{ width: '100%' }} 
                                />
                            </label>

                            <div className="settings-grid-2">
                                <label>
                                    <span className="form-label">Customer Support Email</span>
                                    <input 
                                        type="email" 
                                        value={supportEmail} 
                                        onChange={e => setSupportEmail(e.target.value)} 
                                        placeholder="support@mystore.co.zw"
                                        style={{ width: '100%' }} 
                                    />
                                </label>

                                <label>
                                    <span className="form-label">Secondary Telephone / Landline</span>
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

                        <div className="settings-footer-actions">
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                🕒 Operating hours and collection guidelines display at checkout.
                            </span>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={saving} 
                                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                            >
                                {saving ? 'Saving Changes...' : '💾 Save Location & Hours'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 3: DELIVERY & SHIPPING RATES                     */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'shipping' && hasVendorProfile && (
                    <form onSubmit={handleSaveVendor} className="animate-fade-in">
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>🚚</span> Delivery Pricing Strategy
                            </div>
                            <div className="settings-section-subtitle">
                                Choose how delivery fees are billed to buyers when checking out from your store.
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                                <label className={`radio-card ${shippingMode === 'default' ? 'active' : ''}`} style={{ padding: '14px' }}>
                                    <input 
                                        type="radio" 
                                        name="shippingMode" 
                                        value="default" 
                                        checked={shippingMode === 'default'} 
                                        onChange={e => setShippingMode(e.target.value)} 
                                    />
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            🌐 Platform Standard
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            Standard tiers (Harare $2–$5, Bulawayo $3, Intercity $8)
                                        </div>
                                    </div>
                                </label>

                                <label className={`radio-card ${shippingMode === 'flat' ? 'active' : ''}`} style={{ padding: '14px' }}>
                                    <input 
                                        type="radio" 
                                        name="shippingMode" 
                                        value="flat" 
                                        checked={shippingMode === 'flat'} 
                                        onChange={e => setShippingMode(e.target.value)} 
                                    />
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            🏷️ Store Flat Rate
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            Charge one single fixed delivery fee across all destinations
                                        </div>
                                    </div>
                                </label>

                                <label className={`radio-card ${shippingMode === 'custom_zones' ? 'active' : ''}`} style={{ padding: '14px' }}>
                                    <input 
                                        type="radio" 
                                        name="shippingMode" 
                                        value="custom_zones" 
                                        checked={shippingMode === 'custom_zones'} 
                                        onChange={e => setShippingMode(e.target.value)} 
                                    />
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            📍 Custom Zimbabwe Zones
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            Set tailored delivery fees for specific cities and suburbs
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Flat Rate Input */}
                            {shippingMode === 'flat' && (
                                <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                                    <label>
                                        <span className="form-label">Store Flat Delivery Fee ($ USD)</span>
                                        <input 
                                            type="number" 
                                            step="0.50" 
                                            min="0" 
                                            value={flatShippingFee} 
                                            onChange={e => setFlatShippingFee(e.target.value)} 
                                            placeholder="3.00"
                                            style={{ width: '160px', padding: '8px', fontSize: '15px', fontWeight: '700' }}
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Custom Zones Grid */}
                            {shippingMode === 'custom_zones' && (
                                <div style={{ padding: '18px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                                        Regional Delivery Rates ($ USD)
                                    </div>
                                    <div className="settings-grid-3">
                                        <label>
                                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Harare CBD</span>
                                            <input type="number" step="0.50" min="0" value={customZoneRates.harare_cbd} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_cbd: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                                        </label>
                                        <label>
                                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Harare East (Msasa)</span>
                                            <input type="number" step="0.50" min="0" value={customZoneRates.harare_east} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_east: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                                        </label>
                                        <label>
                                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Harare North (Avondale)</span>
                                            <input type="number" step="0.50" min="0" value={customZoneRates.harare_north} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_north: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                                        </label>
                                        <label>
                                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Greater Harare</span>
                                            <input type="number" step="0.50" min="0" value={customZoneRates.harare_greater} onChange={e => setCustomZoneRates({ ...customZoneRates, harare_greater: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                                        </label>
                                        <label>
                                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Bulawayo Central</span>
                                            <input type="number" step="0.50" min="0" value={customZoneRates.bulawayo_central} onChange={e => setCustomZoneRates({ ...customZoneRates, bulawayo_central: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                                        </label>
                                        <label>
                                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Inter-City Courier</span>
                                            <input type="number" step="0.50" min="0" value={customZoneRates.intercity_express} onChange={e => setCustomZoneRates({ ...customZoneRates, intercity_express: e.target.value })} style={{ width: '100%', padding: '7px' }} />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Free Delivery Threshold */}
                            <div style={{ marginTop: '16px' }}>
                                <label>
                                    <span className="form-label">🎉 Free Delivery Minimum Order ($ USD, optional)</span>
                                    <input 
                                        type="number" 
                                        step="5" 
                                        min="0" 
                                        value={freeShippingThreshold} 
                                        onChange={e => setFreeShippingThreshold(e.target.value)} 
                                        placeholder="e.g. 50.00 (Orders over $50 unlock free delivery)"
                                        style={{ width: '100%', maxWidth: '360px', padding: '8px' }}
                                    />
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        When set, any buyer whose cart subtotal exceeds this amount gets automated free delivery at checkout.
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="settings-footer-actions">
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                🚚 Delivery rates update automatically for customer checkouts.
                            </span>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={saving} 
                                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                            >
                                {saving ? 'Saving Changes...' : '💾 Save Delivery Rates'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 4: PAYOUT & SETTLEMENT ACCOUNTS                  */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'payout' && hasVendorProfile && (
                    <form onSubmit={handleSaveVendor} className="animate-fade-in">
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>💳</span> Preferred Settlement Channel
                            </div>
                            <div className="settings-section-subtitle">
                                Receive earnings from completed customer orders into your mobile money or Nostro account.
                            </div>

                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {[
                                    { id: 'ecocash', label: '📱 EcoCash USD', sub: 'Instant mobile payout' },
                                    { id: 'innbucks', label: '⚡ InnBucks USD', sub: 'Simbisa retail payout' },
                                    { id: 'bank', label: '🏦 Nostro Bank', sub: 'Direct bank wire transfer' }
                                ].map(method => (
                                    <label 
                                        key={method.id} 
                                        className={`radio-card ${payoutMethod === method.id ? 'active' : ''}`}
                                        style={{ padding: '12px 18px', flex: 1, minWidth: '160px' }}
                                    >
                                        <input 
                                            type="radio" 
                                            name="payoutMethod" 
                                            value={method.id} 
                                            checked={payoutMethod === method.id} 
                                            onChange={e => setPayoutMethod(e.target.value)} 
                                        />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {method.label}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {method.sub}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {/* EcoCash Inputs */}
                            {payoutMethod === 'ecocash' && (
                                <div className="settings-grid-2">
                                    <label>
                                        <span className="form-label">EcoCash Mobile Number *</span>
                                        <input 
                                            type="tel" 
                                            required
                                            value={payoutEcocashNumber} 
                                            onChange={e => setPayoutEcocashNumber(e.target.value)} 
                                            placeholder="0771234567"
                                            style={{ width: '100%' }}
                                        />
                                    </label>
                                    <label>
                                        <span className="form-label">Registered Account Name *</span>
                                        <input 
                                            type="text" 
                                            required
                                            value={payoutEcocashName} 
                                            onChange={e => setPayoutEcocashName(e.target.value)} 
                                            placeholder="e.g. John Doe / Apex Electronics Pvt Ltd"
                                            style={{ width: '100%' }}
                                        />
                                    </label>
                                </div>
                            )}

                            {/* InnBucks Inputs */}
                            {payoutMethod === 'innbucks' && (
                                <label style={{ display: 'block', maxWidth: '420px' }}>
                                    <span className="form-label">InnBucks Account / Mobile Number *</span>
                                    <input 
                                        type="tel" 
                                        required
                                        value={payoutInnbucksNumber} 
                                        onChange={e => setPayoutInnbucksNumber(e.target.value)} 
                                        placeholder="0771234567"
                                        style={{ width: '100%' }}
                                    />
                                </label>
                            )}

                            {/* Nostro Bank Inputs */}
                            {payoutMethod === 'bank' && (
                                <div className="settings-grid-2">
                                    <label>
                                        <span className="form-label">Banking Institution *</span>
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
                                        <span className="form-label">Account Name *</span>
                                        <input type="text" required value={payoutAccountName} onChange={e => setPayoutAccountName(e.target.value)} placeholder="Company or Full Name" style={{ width: '100%' }} />
                                    </label>
                                    <label>
                                        <span className="form-label">Nostro Account Number *</span>
                                        <input type="text" required value={payoutAccountNumber} onChange={e => setPayoutAccountNumber(e.target.value)} placeholder="0123456789012" style={{ width: '100%' }} />
                                    </label>
                                    <label>
                                        <span className="form-label">Branch / Swift Code</span>
                                        <input type="text" value={payoutBranchCode} onChange={e => setPayoutBranchCode(e.target.value)} placeholder="Harare CBD / Branch Code" style={{ width: '100%' }} />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Escrow Reassurance Notice */}
                        <div style={{ 
                            padding: '16px 20px', 
                            backgroundColor: 'rgba(16, 185, 129, 0.06)', 
                            border: '1px solid rgba(16, 185, 129, 0.3)', 
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px'
                        }}>
                            <span style={{ fontSize: '26px' }}>🛡️</span>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>
                                    ZimMarket Escrow Payout Protection
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                                    Buyer funds are held in secure escrow and disbursed automatically to your registered account upon buyer confirmation of delivered goods.
                                </div>
                            </div>
                        </div>

                        <div className="settings-footer-actions">
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                🔒 Payout details are encrypted and securely verified.
                            </span>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={saving} 
                                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                            >
                                {saving ? 'Saving Changes...' : '💾 Save Payout Accounts'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 5: POLICIES & STOCK HEALTH ALERTS                */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'policies' && hasVendorProfile && (
                    <form onSubmit={handleSaveVendor} className="animate-fade-in">
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>🛡️</span> Store Guarantees & Fulfillment Policies
                            </div>
                            <div className="settings-section-subtitle">
                                Build buyer confidence by displaying clear turnaround, returns, and warranty guidelines.
                            </div>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span className="form-label">⚡ Order Fulfillment & Dispatch Turnaround</span>
                                <input 
                                    type="text" 
                                    value={deliveryTurnaround} 
                                    onChange={e => setDeliveryTurnaround(e.target.value)} 
                                    placeholder="e.g. Orders dispatched within 2 hours. Same-day Harare delivery."
                                    style={{ width: '100%' }} 
                                />
                            </label>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span className="form-label">🔄 Return & Refund Policy</span>
                                <textarea 
                                    rows="2"
                                    value={returnPolicy} 
                                    onChange={e => setReturnPolicy(e.target.value)} 
                                    placeholder="e.g. 7-day return policy for unopened items in original packaging. Full refund or exchange."
                                    style={{ width: '100%', resize: 'vertical' }} 
                                />
                            </label>

                            <label style={{ display: 'block' }}>
                                <span className="form-label">🛡️ Warranty Coverage Policy</span>
                                <textarea 
                                    rows="2"
                                    value={warrantyPolicy} 
                                    onChange={e => setWarrantyPolicy(e.target.value)} 
                                    placeholder="e.g. 12 months manufacturer warranty on electronic inverters and lithium batteries."
                                    style={{ width: '100%', resize: 'vertical' }} 
                                />
                            </label>
                        </div>

                        {/* Low-Stock Threshold Variable Card */}
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>⚠️</span> Inventory Low-Stock Sensitivity Alert
                            </div>
                            <div className="settings-section-subtitle">
                                Set the unit count threshold that triggers low-stock warning badges on your dashboard.
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="100" 
                                        value={lowStockThreshold} 
                                        onChange={e => setLowStockThreshold(parseInt(e.target.value, 10) || 1)} 
                                        style={{ width: '90px', padding: '8px', fontSize: '15px', fontWeight: '800', textAlign: 'center' }} 
                                    />
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        units or fewer remaining
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {[2, 3, 5, 10].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setLowStockThreshold(val)}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                border: '1px solid var(--border)',
                                                backgroundColor: lowStockThreshold === val ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                                color: lowStockThreshold === val ? '#fff' : 'var(--text-secondary)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ≤ {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="settings-footer-actions">
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                📋 Policies are highlighted on product pages to build customer trust.
                            </span>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={saving} 
                                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                            >
                                {saving ? 'Saving Changes...' : '💾 Save Policies & Alerts'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 6: DEFAULT SHIPPING ADDRESS (BUYER / PERSONAL)    */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'address' && !hasVendorProfile && (
                    <form onSubmit={handleSaveAddress} className="animate-fade-in">
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>📦</span> Default Shipping Address
                            </div>
                            <div className="settings-section-subtitle">
                                This address will automatically prefill whenever you purchase goods on the marketplace.
                            </div>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span className="form-label">Full Name *</span>
                                <input 
                                    type="text" 
                                    required 
                                    value={fullName} 
                                    onChange={e => setFullName(e.target.value)} 
                                    placeholder="e.g. Tendai Moyo"
                                    style={{ width: '100%' }} 
                                />
                            </label>

                            <label style={{ display: 'block', marginBottom: '16px' }}>
                                <span className="form-label">Street Address *</span>
                                <input 
                                    type="text" 
                                    required 
                                    value={street} 
                                    onChange={e => setStreet(e.target.value)} 
                                    placeholder="e.g. 15 Samora Machel Ave" 
                                    style={{ width: '100%' }} 
                                />
                            </label>

                            <div className="settings-grid-2" style={{ marginBottom: '16px' }}>
                                <label>
                                    <span className="form-label">City *</span>
                                    <input 
                                        type="text" 
                                        required 
                                        value={city} 
                                        onChange={e => setCity(e.target.value)} 
                                        placeholder="Harare" 
                                        style={{ width: '100%' }} 
                                    />
                                </label>

                                <label>
                                    <span className="form-label">Province *</span>
                                    <select 
                                        required 
                                        value={province} 
                                        onChange={e => setProvince(e.target.value)} 
                                        style={{ width: '100%' }}
                                    >
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

                            <label style={{ display: 'block' }}>
                                <span className="form-label">Contact Phone Number *</span>
                                <input 
                                    type="tel" 
                                    required 
                                    value={phone} 
                                    onChange={e => setPhone(e.target.value)} 
                                    placeholder="0771234567" 
                                    style={{ width: '100%', maxWidth: '360px' }} 
                                />
                            </label>
                        </div>

                        <div className="settings-footer-actions">
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                🚚 Pre-populates your checkout cart automatically.
                            </span>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={saving} 
                                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                            >
                                {saving ? 'Saving...' : '💾 Save Shipping Address'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 7: ACCOUNT OVERVIEW & SECURITY                   */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'account' && (
                    <div className="animate-fade-in">
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>👤</span> Account Details & Security
                            </div>
                            <div className="settings-section-subtitle">
                                Your ZimMarket authentication credentials and role permissions.
                            </div>

                            <div className="settings-grid-2">
                                <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Login Email</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                                        {email || 'N/A'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '6px' }}>
                                        ✓ Verified ZimMarket User
                                    </div>
                                </div>

                                <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Account UID</div>
                                    <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '4px', wordBreak: 'break-all' }}>
                                        {userId || 'N/A'}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={copyUserId} 
                                        style={{ marginTop: '6px', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer' }}
                                    >
                                        📋 Copy UID
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Shortcuts */}
                        <div className="settings-section-card">
                            <div className="settings-section-title">
                                <span>🚀</span> Quick Actions
                            </div>
                            <div className="settings-section-subtitle">
                                Jump directly to other sections of the marketplace.
                            </div>

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {hasVendorProfile ? (
                                    <>
                                        {setCurrentView && (
                                            <button 
                                                type="button" 
                                                onClick={() => setCurrentView('vendor-inventory')} 
                                                className="btn-primary"
                                                style={{ fontSize: '13px', padding: '9px 16px' }}
                                            >
                                                📦 Vendor Inventory Dashboard
                                            </button>
                                        )}
                                        {setCurrentView && (
                                            <button 
                                                type="button" 
                                                onClick={() => setCurrentView('vendor-orders')} 
                                                className="btn-secondary"
                                                style={{ fontSize: '13px', padding: '9px 16px' }}
                                            >
                                                📋 Fulfillment Orders
                                            </button>
                                        )}
                                        <a 
                                            href={liveStoreUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="btn-secondary"
                                            style={{ fontSize: '13px', padding: '9px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                        >
                                            🏪 Visit Public Storefront ↗
                                        </a>
                                    </>
                                ) : (
                                    <>
                                        {setCurrentView && (
                                            <button 
                                                type="button" 
                                                onClick={() => setCurrentView('buyer-orders')} 
                                                className="btn-primary"
                                                style={{ fontSize: '13px', padding: '9px 16px' }}
                                            >
                                                🛍️ My Orders
                                            </button>
                                        )}
                                        {setCurrentView && (
                                            <button 
                                                type="button" 
                                                onClick={() => setCurrentView('buyer')} 
                                                className="btn-secondary"
                                                style={{ fontSize: '13px', padding: '9px 16px' }}
                                            >
                                                🛒 Browse Marketplace
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
