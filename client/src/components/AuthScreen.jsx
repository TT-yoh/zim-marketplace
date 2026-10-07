// client/src/components/AuthScreen.jsx
import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';

export function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    
    // Role selection on sign up: 'buyer' (default) or 'vendor'
    const [accountType, setAccountType] = useState('buyer');
    
    // Credentials
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Buyer-specific fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('Harare');
    const [streetAddress, setStreetAddress] = useState('');

    // Vendor-specific fields (expanded store details)
    const [storeName, setStoreName] = useState('');
    const [storeSlug, setStoreSlug] = useState('');
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [whatsapp, setWhatsapp] = useState('');
    const [storeCategory, setStoreCategory] = useState('Solar & Power Solutions');
    const [businessAddress, setBusinessAddress] = useState('');
    const [vendorType, setVendorType] = useState('individual');
    const [slogan, setSlogan] = useState('');
    const [bio, setBio] = useState('');
    const [operatingHours, setOperatingHours] = useState('Mon - Sat: 8:00 AM - 5:00 PM');

    // Status
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Helper to format clean URL slug
    const cleanSlug = (text) => {
        return (text || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 45);
    };

    // Auto-derive store slug from store name unless user edited it
    const handleStoreNameChange = (val) => {
        setStoreName(val);
        if (!slugManuallyEdited) {
            setStoreSlug(cleanSlug(val));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password
                });
                if (error) throw error;
                // Successful login triggers onAuthStateChange in App.jsx
            } else {
                // Prepare metadata based on selected account type
                const userMetadata = {
                    role: accountType, // 'buyer' or 'vendor'
                    account_type: accountType
                };

                if (accountType === 'buyer') {
                    userMetadata.full_name = fullName.trim() || 'Shopper';
                    userMetadata.phone_number = phone.trim();
                    userMetadata.city = city;
                    userMetadata.street_address = streetAddress.trim();
                } else {
                    const derivedSlug = (storeSlug.trim() || cleanSlug(storeName)) || `store-${Date.now().toString(36)}`;
                    userMetadata.store_name = storeName.trim() || 'My ZimMarket Store';
                    userMetadata.store_slug = derivedSlug;
                    userMetadata.whatsapp_number = whatsapp.trim();
                    userMetadata.primary_category = storeCategory;
                    userMetadata.business_address = businessAddress.trim();
                    userMetadata.vendor_type = vendorType;
                    userMetadata.slogan = slogan.trim();
                    userMetadata.bio = bio.trim();
                    userMetadata.operating_hours = operatingHours.trim();
                }

                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        data: userMetadata
                    }
                });

                if (error) throw error;

                // If user is returned and session is active, auto-provision database record
                const newUser = data?.user;
                if (newUser) {
                    if (accountType === 'buyer') {
                        // Provision initial default buyer shipping address
                        const prov = city === 'Bulawayo' ? 'Bulawayo' :
                                     city === 'Harare' || city === 'Chitungwiza' ? 'Harare' :
                                     city === 'Mutare' ? 'Manicaland' :
                                     city === 'Gweru' || city === 'Kwekwe' ? 'Midlands' :
                                     city === 'Masvingo' ? 'Masvingo' :
                                     city === 'Victoria Falls' ? 'Matabeleland North' : 'Harare';

                        await supabase.from('buyer_addresses').insert({
                            buyer_id: newUser.id,
                            full_name: fullName.trim() || 'Shopper',
                            phone_number: phone.trim() || '',
                            city: city || 'Harare',
                            province: prov,
                            street_address: streetAddress.trim() || 'Main City Centre',
                            is_default: true
                        }).catch((err) => {
                            console.warn('Initial buyer address notice:', err);
                        });
                    } else if (accountType === 'vendor') {
                        // Provision initial vendor profile with full store details
                        const derivedSlug = (storeSlug.trim() || cleanSlug(storeName)) || `store-${newUser.id.slice(0, 8)}`;
                        await supabase.from('vendor_profiles').upsert({
                            id: newUser.id,
                            store_name: storeName.trim() || 'My ZimMarket Store',
                            store_slug: derivedSlug,
                            whatsapp_number: whatsapp.trim() || '',
                            business_address: businessAddress.trim() || null,
                            vendor_type: vendorType || 'individual',
                            slogan: slogan.trim() || null,
                            bio: bio.trim() || null,
                            operating_hours: operatingHours.trim() || null,
                            is_active: true,
                            is_verified: false
                        }, { onConflict: 'id' }).catch((err) => {
                            console.warn('Initial vendor profile notice:', err);
                        });
                    }
                }

                if (data?.session) {
                    setSuccessMsg(`Welcome to ZimMarket! Your ${accountType === 'buyer' ? 'Buyer' : 'Vendor'} account has been created.`);
                } else {
                    setSuccessMsg(`Registration successful as ${accountType === 'buyer' ? 'a Buyer' : 'a Vendor'}! If confirmation is enabled, please verify your email.`);
                }
            }
        } catch (err) {
            setErrorMsg(err.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            background: 'radial-gradient(circle at 50% 25%, rgba(59, 130, 246, 0.1), transparent 65%)'
        }}>
            <div className="glass-panel animate-fade-in-up" style={{
                width: '100%',
                maxWidth: isLogin ? '440px' : accountType === 'vendor' ? '620px' : '520px',
                padding: '36px 32px',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
                transition: 'max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                {/* Brand Logo & Header */}
                <div style={{ textAlign: 'center', marginBottom: '26px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(16, 185, 129, 0.2))',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        fontSize: '28px',
                        marginBottom: '12px'
                    }}>
                        🇿🇼
                    </div>
                    <h2 style={{ fontSize: '26px', color: 'var(--text-primary)', margin: '0 0 6px 0', fontWeight: '800' }}>
                        {isLogin ? 'Welcome Back' : 'Join ZimMarket'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                        {isLogin 
                            ? 'Sign in to access your orders, store, and profile' 
                            : 'Choose your account type below to get started'}
                    </p>
                </div>

                {/* Sign In vs Sign Up Toggle Pills */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '4px',
                    borderRadius: '12px',
                    marginBottom: '22px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                    <button
                        type="button"
                        onClick={() => { setIsLogin(true); setErrorMsg(''); setSuccessMsg(''); }}
                        style={{
                            flex: 1,
                            padding: '10px 0',
                            borderRadius: '9px',
                            border: 'none',
                            background: isLogin ? 'var(--accent-primary)' : 'transparent',
                            color: isLogin ? '#ffffff' : 'var(--text-secondary)',
                            fontWeight: isLogin ? '700' : '500',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsLogin(false); setErrorMsg(''); setSuccessMsg(''); }}
                        style={{
                            flex: 1,
                            padding: '10px 0',
                            borderRadius: '9px',
                            border: 'none',
                            background: !isLogin ? 'var(--accent-primary)' : 'transparent',
                            color: !isLogin ? '#ffffff' : 'var(--text-secondary)',
                            fontWeight: !isLogin ? '700' : '500',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Create Account
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Role Selection on Sign Up with Radio Buttons */}
                    {!isLogin && (
                        <div>
                            <span style={{ 
                                display: 'block', 
                                marginBottom: '10px', 
                                color: 'var(--text-primary)', 
                                fontSize: '13px', 
                                fontWeight: '700',
                                letterSpacing: '0.02em'
                            }}>
                                I WANT TO REGISTER AS:
                            </span>

                            {/* Radio Button Group */}
                            <div className="account-type-radio-group">
                                {/* Option 1: Buyer Radio Card */}
                                <label 
                                    className={`radio-card ${accountType === 'buyer' ? 'active' : ''}`}
                                    htmlFor="account-type-buyer"
                                >
                                    <input
                                        type="radio"
                                        id="account-type-buyer"
                                        name="accountType"
                                        value="buyer"
                                        checked={accountType === 'buyer'}
                                        onChange={() => setAccountType('buyer')}
                                    />
                                    <div className="radio-body">
                                        <div className="radio-title">
                                            <span>🛍️</span>
                                            <span>Buyer / Customer</span>
                                            {accountType === 'buyer' && (
                                                <span style={{ 
                                                    marginLeft: 'auto', 
                                                    fontSize: '10px', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '8px', 
                                                    backgroundColor: 'var(--accent-primary)', 
                                                    color: '#fff', 
                                                    fontWeight: '700' 
                                                }}>
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                        <div className="radio-subtitle">
                                            Browse goods, pay securely via EcoCash or USD, track delivery with Escrow protection.
                                        </div>
                                    </div>
                                </label>

                                {/* Option 2: Vendor Radio Card */}
                                <label 
                                    className={`radio-card vendor-active ${accountType === 'vendor' ? 'active vendor-active' : ''}`}
                                    htmlFor="account-type-vendor"
                                >
                                    <input
                                        type="radio"
                                        id="account-type-vendor"
                                        name="accountType"
                                        value="vendor"
                                        checked={accountType === 'vendor'}
                                        onChange={() => setAccountType('vendor')}
                                    />
                                    <div className="radio-body">
                                        <div className="radio-title">
                                            <span>🏪</span>
                                            <span>Vendor / Merchant</span>
                                            {accountType === 'vendor' && (
                                                <span style={{ 
                                                    marginLeft: 'auto', 
                                                    fontSize: '10px', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '8px', 
                                                    backgroundColor: 'var(--success)', 
                                                    color: '#fff', 
                                                    fontWeight: '700' 
                                                }}>
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                        <div className="radio-subtitle">
                                            Sell products, upload bulk catalog, get a custom store link & direct payouts.
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* BUYER SPECIFIC FIELDS */}
                    {!isLogin && accountType === 'buyer' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                paddingBottom: '6px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    🛍️ Buyer Personal Details
                                </span>
                            </div>

                            <label>
                                <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                    Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                                </span>
                                <input 
                                    type="text" 
                                    required 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. Tinashe Moyo"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                />
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '12px' }}>
                                <label>
                                    <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                        WhatsApp / Phone Number
                                    </span>
                                    <input 
                                        type="tel" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+263 77 123 4567"
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                    />
                                </label>

                                <label>
                                    <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                        City / Town <span style={{ color: 'var(--danger)' }}>*</span>
                                    </span>
                                    <select
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                    >
                                        <option value="Harare">Harare</option>
                                        <option value="Bulawayo">Bulawayo</option>
                                        <option value="Chitungwiza">Chitungwiza</option>
                                        <option value="Mutare">Mutare</option>
                                        <option value="Gweru">Gweru</option>
                                        <option value="Kwekwe">Kwekwe</option>
                                        <option value="Kadoma">Kadoma</option>
                                        <option value="Masvingo">Masvingo</option>
                                        <option value="Victoria Falls">Victoria Falls</option>
                                        <option value="Marondera">Marondera</option>
                                        <option value="Chinhoyi">Chinhoyi</option>
                                        <option value="Other">Other City</option>
                                    </select>
                                </label>
                            </div>

                            <label>
                                <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                    Delivery / Residential Address (Optional)
                                </span>
                                <input 
                                    type="text" 
                                    value={streetAddress}
                                    onChange={(e) => setStreetAddress(e.target.value)}
                                    placeholder="e.g. 42 Samora Machel Ave / Stand 204 Borrowdale"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                />
                            </label>

                            {/* Trust Note for Buyers */}
                            <div style={{
                                padding: '12px 14px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '18px' }}>🛡️</span>
                                <div>
                                    <strong style={{ color: 'var(--text-primary)' }}>Buyer Escrow Protection:</strong> Your payments are safely held in escrow until you receive and inspect your items.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VENDOR SPECIFIC FIELDS (EXPANDED STORE DETAILS) */}
                    {!isLogin && accountType === 'vendor' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                paddingBottom: '6px',
                                borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)' }}>
                                    🏪 Store & Merchant Setup Details
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Fill in your store details
                                </span>
                            </div>

                            {/* Store Name */}
                            <label>
                                <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                    Store / Business Name <span style={{ color: 'var(--danger)' }}>*</span>
                                </span>
                                <input 
                                    type="text" 
                                    required 
                                    value={storeName}
                                    onChange={(e) => handleStoreNameChange(e.target.value)}
                                    placeholder="e.g. Moyo Solar & Hardware Supplies"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                />
                            </label>

                            {/* Custom Store Vanity Slug / Link Preview */}
                            <label>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                        Custom Store Web Link
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                                        zimmarket.co.zw/store/{storeSlug || 'your-store'}
                                    </span>
                                </div>
                                <input 
                                    type="text" 
                                    value={storeSlug}
                                    onChange={(e) => {
                                        setStoreSlug(cleanSlug(e.target.value));
                                        setSlugManuallyEdited(true);
                                    }}
                                    placeholder="e.g. moyo-solar"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', fontFamily: 'monospace' }}
                                />
                            </label>

                            {/* Contact & Business Category Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <label>
                                    <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                        WhatsApp Business Line <span style={{ color: 'var(--danger)' }}>*</span>
                                    </span>
                                    <input 
                                        type="tel" 
                                        required
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        placeholder="+263 77 123 4567"
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                    />
                                </label>

                                <label>
                                    <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                        Trade Category <span style={{ color: 'var(--danger)' }}>*</span>
                                    </span>
                                    <select
                                        value={storeCategory}
                                        onChange={(e) => setStoreCategory(e.target.value)}
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                    >
                                        <option value="Solar & Power Solutions">⚡ Solar & Power Solutions</option>
                                        <option value="Auto Parts & Tyres">🚗 Auto Spares, Tyres & Parts</option>
                                        <option value="Electronics & Gadgets">📱 Electronics & Phones</option>
                                        <option value="Hardware & Construction">🔨 Hardware & Tools</option>
                                        <option value="Agriculture & Farming">🌾 Agriculture & Farming</option>
                                        <option value="Fashion & Clothing">👗 Fashion & Apparel</option>
                                        <option value="Groceries & Wholesale">🛒 Groceries & Wholesale</option>
                                        <option value="Health & Beauty">💊 Health & Beauty</option>
                                        <option value="General Retail">📦 General Merchandise</option>
                                    </select>
                                </label>
                            </div>

                            {/* Physical Store Address & Merchant Type Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                                <label>
                                    <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                        Physical Store / Pickup Address
                                    </span>
                                    <input 
                                        type="text" 
                                        value={businessAddress}
                                        onChange={(e) => setBusinessAddress(e.target.value)}
                                        placeholder="e.g. Stand 14, Gulf Complex, Harare"
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                    />
                                </label>

                                <label>
                                    <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                        Merchant Type
                                    </span>
                                    <select
                                        value={vendorType}
                                        onChange={(e) => setVendorType(e.target.value)}
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                    >
                                        <option value="individual">Sole Trader / Artisan</option>
                                        <option value="company">Registered Company (Pvt Ltd)</option>
                                        <option value="pbc">Private Business Corp (PBC)</option>
                                        <option value="informal">Informal Trader / SME</option>
                                    </select>
                                </label>
                            </div>

                            {/* Store Slogan / Tagline */}
                            <label>
                                <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                    Store Tagline / Slogan (Optional)
                                </span>
                                <input 
                                    type="text" 
                                    value={slogan}
                                    onChange={(e) => setSlogan(e.target.value)}
                                    placeholder="e.g. Quality Tier-1 Solar Panels & Inverters with 1-Year Guarantee"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                />
                            </label>

                            {/* Store Bio / Description */}
                            <label>
                                <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                    Store Bio / Description (Optional)
                                </span>
                                <textarea 
                                    rows={2}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell customers what products you specialize in, warranty offerings, and delivery options..."
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px 14px', 
                                        borderRadius: '10px', 
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        fontSize: '13px'
                                    }}
                                />
                            </label>

                            {/* Operating Hours */}
                            <label>
                                <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                    Operating Hours
                                </span>
                                <input 
                                    type="text" 
                                    value={operatingHours}
                                    onChange={(e) => setOperatingHours(e.target.value)}
                                    placeholder="e.g. Mon - Sat: 8:00 AM - 5:00 PM"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                                />
                            </label>

                            {/* Merchant Benefits Card */}
                            <div style={{
                                padding: '12px 14px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '18px' }}>⚡</span>
                                <div>
                                    <strong style={{ color: 'var(--text-primary)' }}>Vendor Benefits:</strong> Instant custom store URL, bulk CSV inventory uploader, live ZiG currency conversions, and automated EcoCash / USD payouts.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* COMMON CREDENTIALS (Email & Password) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
                        <label>
                            <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                Email Address <span style={{ color: 'var(--danger)' }}>*</span>
                            </span>
                            <input 
                                type="email" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                            />
                        </label>
                        
                        <label>
                            <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                Password <span style={{ color: 'var(--danger)' }}>*</span>
                            </span>
                            <input 
                                type="password" 
                                required 
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px' }}
                            />
                            {!isLogin && (
                                <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Must be at least 6 characters
                                </span>
                            )}
                        </label>
                    </div>

                    {errorMsg && (
                        <div style={{ 
                            color: 'var(--danger)', 
                            backgroundColor: 'var(--danger-bg)', 
                            padding: '12px 16px', 
                            borderRadius: '10px', 
                            fontSize: '13px', 
                            border: '1px solid rgba(239, 68, 68, 0.25)' 
                        }}>
                            ⚠️ {errorMsg}
                        </div>
                    )}
                    
                    {successMsg && (
                        <div style={{ 
                            color: 'var(--success)', 
                            backgroundColor: 'var(--success-bg)', 
                            padding: '12px 16px', 
                            borderRadius: '10px', 
                            fontSize: '13px', 
                            border: '1px solid rgba(16, 185, 129, 0.25)' 
                        }}>
                            ✓ {successMsg}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={loading} 
                        style={{
                            marginTop: '8px',
                            padding: '14px',
                            fontSize: '15px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.35)'
                        }}
                    >
                        {loading 
                            ? 'Processing...' 
                            : isLogin 
                                ? 'Sign In to ZimMarket' 
                                : accountType === 'buyer' 
                                    ? '🛍️ Create Buyer Account' 
                                    : '🏪 Open Vendor Store'
                        }
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {isLogin ? "New to ZimMarket? " : "Already have an account? "}
                    <button 
                        type="button"
                        onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); setSuccessMsg(''); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            fontWeight: '700',
                            padding: 0,
                            textDecoration: 'underline'
                        }}
                    >
                        {isLogin ? 'Create a Buyer or Vendor Account' : 'Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
}
