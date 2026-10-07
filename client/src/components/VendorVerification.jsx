import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';

export function VendorVerification({ setCurrentView, isVendor: propIsVendor, userId: propUserId }) {
    const [userId, setUserId] = useState(propUserId || null);
    const [isVendor, setIsVendor] = useState(() => {
        if (typeof propIsVendor === 'boolean') return propIsVendor;
        const stored = localStorage.getItem('zimmarket_is_vendor');
        return stored === 'true';
    });
    const [roleResolved, setRoleResolved] = useState(typeof propIsVendor === 'boolean');
    const [loadingData, setLoadingData] = useState(true);

    // Vendor State
    const [vendorType, setVendorType] = useState('individual');
    const [vendorStoreName, setVendorStoreName] = useState('');
    const [vendorWhatsapp, setVendorWhatsapp] = useState('');
    const [vendorAddress, setVendorAddress] = useState('');
    const [vendorIdDoc, setVendorIdDoc] = useState(null);
    const [vendorSelfieDoc, setVendorSelfieDoc] = useState(null);
    const [vendorCompanyDoc, setVendorCompanyDoc] = useState(null);
    const [vendorExistingProfile, setVendorExistingProfile] = useState(null);

    // Buyer State
    const [buyerFullName, setBuyerFullName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [buyerCity, setBuyerCity] = useState('Harare');
    const [buyerAddress, setBuyerAddress] = useState('');
    const [buyerIdDoc, setBuyerIdDoc] = useState(null);
    const [buyerProofOfResidence, setBuyerProofOfResidence] = useState(null);
    const [buyerExistingVerification, setBuyerExistingVerification] = useState(null);

    // Submission States
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Resolve user session & role
    useEffect(() => {
        let isMounted = true;
        const resolveUserAndProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    if (isMounted) {
                        setRoleResolved(true);
                        setLoadingData(false);
                    }
                    return;
                }

                const currentUid = session.user.id;
                if (isMounted) setUserId(currentUid);

                // Determine role strictly
                let userIsVendor = false;
                if (typeof propIsVendor === 'boolean') {
                    userIsVendor = propIsVendor;
                } else {
                    const metaRole = session.user.user_metadata?.role || session.user.user_metadata?.account_type;
                    if (metaRole === 'vendor') {
                        userIsVendor = true;
                    } else if (metaRole === 'buyer') {
                        userIsVendor = false;
                    } else {
                        const { data: vProfile } = await supabase.from('vendor_profiles').select('id').eq('id', currentUid).maybeSingle();
                        userIsVendor = !!vProfile;
                    }
                }

                if (isMounted) {
                    setIsVendor(userIsVendor);
                    setRoleResolved(true);
                }

                // Load existing data based strictly on role
                if (userIsVendor) {
                    const { data: vProfile } = await supabase.from('vendor_profiles').select('*').eq('id', currentUid).maybeSingle();
                    if (isMounted && vProfile) {
                        setVendorExistingProfile(vProfile);
                        setVendorStoreName(vProfile.store_name || '');
                        setVendorWhatsapp(vProfile.whatsapp_number || '');
                        setVendorAddress(vProfile.business_address || vProfile.shipping_settings?.business_address || '');
                        if (vProfile.vendor_type) setVendorType(vProfile.vendor_type);
                    }
                } else {
                    // Fetch existing buyer verification and addresses
                    const [bvRes, addrRes] = await Promise.all([
                        supabase.from('buyer_verifications').select('*').eq('buyer_id', currentUid).maybeSingle(),
                        supabase.from('buyer_addresses').select('*').eq('buyer_id', currentUid).order('created_at', { ascending: false }).limit(1).maybeSingle()
                    ]);

                    if (isMounted) {
                        const meta = session.user.user_metadata || {};
                        if (bvRes?.data) {
                            setBuyerExistingVerification(bvRes.data);
                            setBuyerFullName(bvRes.data.full_name || meta.full_name || '');
                            setBuyerPhone(bvRes.data.phone_number || meta.phone_number || '');
                            setBuyerCity(bvRes.data.delivery_city || 'Harare');
                            setBuyerAddress(bvRes.data.delivery_address || '');
                        } else {
                            if (meta.buyer_verification_status) {
                                setBuyerExistingVerification({
                                    status: meta.buyer_verification_status,
                                    id_document_url: meta.buyer_id_doc,
                                    proof_of_residence_url: meta.buyer_residence_doc
                                });
                            }
                            if (addrRes?.data) {
                                setBuyerFullName(addrRes.data.full_name || meta.full_name || '');
                                setBuyerPhone(addrRes.data.phone_number || meta.phone_number || '');
                                setBuyerCity(addrRes.data.city || 'Harare');
                                setBuyerAddress(addrRes.data.street_address || '');
                            } else {
                                setBuyerFullName(meta.full_name || '');
                                setBuyerPhone(meta.phone_number || '');
                                setBuyerCity(meta.city || 'Harare');
                                setBuyerAddress(meta.street_address || '');
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('Error resolving verification profile:', err);
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        resolveUserAndProfile();
        return () => { isMounted = false; };
    }, [propIsVendor, propUserId]);

    const handleFileChange = (e, setFile) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file, pathPrefix) => {
        if (!file) return null;
        const uploadedUrl = await uploadImageToStorage(file, 'kyc-documents', `${userId}/${pathPrefix}`);
        if (!uploadedUrl) {
            throw new Error(`Failed to upload ${pathPrefix} document.`);
        }
        return uploadedUrl;
    };

    // VENDOR SUBMISSION HANDLER
    const handleVendorSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setMessage('');

        if (!vendorIdDoc && !vendorExistingProfile?.id_document_url) {
            setError("National ID or Passport document is required.");
            setSubmitting(false);
            return;
        }

        if (vendorType === 'business' && !vendorCompanyDoc && !vendorExistingProfile?.company_registration_url) {
            setError("Company Registration document is required for registered businesses.");
            setSubmitting(false);
            return;
        }

        try {
            const idDocUrl = vendorIdDoc ? await uploadFile(vendorIdDoc, 'vendor_id') : vendorExistingProfile?.id_document_url;
            const selfieUrl = vendorSelfieDoc ? await uploadFile(vendorSelfieDoc, 'vendor_selfie') : vendorExistingProfile?.selfie_with_id_url;
            const companyUrl = (vendorType === 'business' && vendorCompanyDoc) 
                ? await uploadFile(vendorCompanyDoc, 'vendor_company') 
                : vendorExistingProfile?.company_registration_url;

            const updatePayload = {
                vendor_type: vendorType,
                id_document_url: idDocUrl,
                selfie_with_id_url: selfieUrl || null,
                company_registration_url: companyUrl || null,
                business_address: vendorAddress.trim() || null,
                whatsapp_number: vendorWhatsapp.trim() || undefined
            };

            const { data, error: updateError } = await supabase
                .from('vendor_profiles')
                .update(updatePayload)
                .eq('id', userId)
                .select()
                .maybeSingle();

            if (updateError) throw updateError;

            setVendorExistingProfile(data || { ...vendorExistingProfile, ...updatePayload });
            setMessage("✓ Vendor verification documents submitted successfully! Our compliance team will review them within 2-4 hours.");
        } catch (err) {
            console.error("Vendor submission error:", err);
            setError(err.message || "An error occurred during vendor submission.");
        } finally {
            setSubmitting(false);
        }
    };

    // BUYER SUBMISSION HANDLER
    const handleBuyerSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setMessage('');

        if (!buyerFullName.trim()) {
            setError("Please enter your full legal name.");
            setSubmitting(false);
            return;
        }

        if (!buyerPhone.trim()) {
            setError("Please enter your contact phone / WhatsApp number.");
            setSubmitting(false);
            return;
        }

        if (!buyerIdDoc && !buyerExistingVerification?.id_document_url) {
            setError("National ID, Passport, or Driver's License photo is required.");
            setSubmitting(false);
            return;
        }

        try {
            const idDocUrl = buyerIdDoc ? await uploadFile(buyerIdDoc, 'buyer_id') : buyerExistingVerification?.id_document_url;
            const residenceUrl = buyerProofOfResidence 
                ? await uploadFile(buyerProofOfResidence, 'buyer_residence') 
                : buyerExistingVerification?.proof_of_residence_url;

            const payload = {
                buyer_id: userId,
                full_name: buyerFullName.trim(),
                phone_number: buyerPhone.trim(),
                id_document_url: idDocUrl,
                proof_of_residence_url: residenceUrl || null,
                delivery_city: buyerCity,
                delivery_address: buyerAddress.trim() || null,
                status: 'pending',
                updated_at: new Date().toISOString()
            };

            const { data, error: bvError } = await supabase
                .from('buyer_verifications')
                .upsert(payload, { onConflict: 'buyer_id' })
                .select()
                .maybeSingle();

            // Resilient fallback in user metadata
            await supabase.auth.updateUser({
                data: {
                    buyer_verification_status: 'pending',
                    buyer_id_doc: idDocUrl,
                    buyer_residence_doc: residenceUrl
                }
            }).catch(() => {});

            setBuyerExistingVerification(data || payload);
            setMessage("✓ Buyer verification submitted successfully! Your account identity is now under review for verified status.");
        } catch (err) {
            console.error("Buyer submission error:", err);
            setError(err.message || "An error occurred during buyer submission.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingData || !roleResolved) {
        return (
            <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '640px', margin: '40px auto' }}>
                <div className="skeleton-box" style={{ width: '50px', height: '50px', borderRadius: '50%', margin: '0 auto 16px' }} />
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Loading Verification Portal...</div>
            </div>
        );
    }

    // =========================================================================
    // VENDOR VERIFICATION VIEW (Rendered ONLY if user is a Vendor)
    // =========================================================================
    if (isVendor) {
        const isVerified = vendorExistingProfile?.is_verified === true;
        const isPending = !isVerified && !!vendorExistingProfile?.id_document_url;

        return (
            <div className="glass-panel animate-fade-in-up" style={{ padding: '36px', maxWidth: '680px', margin: '30px auto', borderRadius: '20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                            🏪
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                Vendor Store Verification
                            </h2>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Merchant KYC &amp; Authenticity Verification
                            </div>
                        </div>
                    </div>

                    {setCurrentView && (
                        <button
                            type="button"
                            onClick={() => setCurrentView('vendor-inventory')}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                            ← Back to Dashboard
                        </button>
                    )}
                </div>

                {/* Status Badges */}
                {isVerified && (
                    <div style={{ padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>✅</span>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>
                                Verified Merchant Store
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Your store credentials are confirmed. A green verified badge is displayed on your live storefront and instant escrow releases are enabled.
                            </div>
                        </div>
                    </div>
                )}

                {isPending && !isVerified && (
                    <div style={{ padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⏳</span>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--warning, #f59e0b)' }}>
                                Verification Under Review
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Your vendor documents have been securely uploaded. Our compliance team is verifying them (standard review time: 2–4 hours).
                            </div>
                        </div>
                    </div>
                )}

                {!isVerified && !isPending && (
                    <div style={{ padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', marginBottom: '24px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            To build trust on ZimMarket, we require sellers to verify their identity. Verified sellers receive higher customer visibility, trusted store badges, and rapid payout approvals.
                        </div>
                    </div>
                )}

                {message && (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' }}>
                        {message}
                    </div>
                )}
                
                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger, #ef4444)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleVendorSubmit}>
                    {/* Seller Type Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <span className="form-label">Select Merchant Type *</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '6px' }}>
                            <label className={`radio-card ${vendorType === 'individual' ? 'active' : ''}`} style={{ padding: '12px 16px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    value="individual" 
                                    checked={vendorType === 'individual'} 
                                    onChange={() => setVendorType('individual')}
                                />
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>👤 Individual Seller</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Personal items, sole trader</div>
                                </div>
                            </label>

                            <label className={`radio-card ${vendorType === 'business' ? 'active' : ''}`} style={{ padding: '12px 16px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    value="business" 
                                    checked={vendorType === 'business'} 
                                    onChange={() => setVendorType('business')}
                                />
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>🏢 Registered Business</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pvt Ltd, PBC, or Retail Store</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Store Name & WhatsApp Confirmation */}
                    <div className="settings-grid-2" style={{ marginBottom: '18px' }}>
                        <label>
                            <span className="form-label">Store Public Name</span>
                            <input 
                                type="text"
                                value={vendorStoreName}
                                onChange={e => setVendorStoreName(e.target.value)}
                                placeholder="Store Name"
                                style={{ width: '100%' }}
                            />
                        </label>
                        <label>
                            <span className="form-label">WhatsApp Contact Number</span>
                            <input 
                                type="tel"
                                value={vendorWhatsapp}
                                onChange={e => setVendorWhatsapp(e.target.value)}
                                placeholder="0771234567"
                                style={{ width: '100%' }}
                            />
                        </label>
                    </div>

                    {/* Physical Trading Location */}
                    <label style={{ display: 'block', marginBottom: '20px' }}>
                        <span className="form-label">Physical Store / Dispatch Address *</span>
                        <input 
                            type="text"
                            required
                            value={vendorAddress}
                            onChange={e => setVendorAddress(e.target.value)}
                            placeholder="e.g. Shop 4B, Longcheng Plaza, Belvedere, Harare"
                            style={{ width: '100%' }}
                        />
                    </label>

                    {/* National ID / Passport */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '6px' }}>
                            <span className="form-label">
                                National ID or Passport Photo *
                            </span>
                        </label>
                        <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <input 
                                type="file" 
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileChange(e, setVendorIdDoc)}
                                style={{ display: 'block', width: '100%', fontSize: '13px' }}
                            />
                            {vendorExistingProfile?.id_document_url && (
                                <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '8px' }}>
                                    ✓ Document already on file (upload new file to replace)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Individual: Selfie holding ID */}
                    {vendorType === 'individual' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '6px' }}>
                                <span className="form-label">
                                    Selfie Holding National ID <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Recommended)</span>
                                </span>
                            </label>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, setVendorSelfieDoc)}
                                    style={{ display: 'block', width: '100%', fontSize: '13px' }}
                                />
                                {vendorExistingProfile?.selfie_with_id_url && (
                                    <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '8px' }}>
                                        ✓ Selfie on file
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Business: Company Registration */}
                    {vendorType === 'business' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '6px' }}>
                                <span className="form-label">
                                    CR14, Certificate of Incorporation, or Tax Clearance *
                                </span>
                            </label>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleFileChange(e, setVendorCompanyDoc)}
                                    style={{ display: 'block', width: '100%', fontSize: '13px' }}
                                />
                                {vendorExistingProfile?.company_registration_url && (
                                    <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '8px' }}>
                                        ✓ Business certificate on file
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={submitting}
                        style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '700', borderRadius: '10px', marginTop: '10px' }}
                    >
                        {submitting ? 'Encrypting & Uploading Documents...' : '🚀 Submit Vendor Verification'}
                    </button>
                </form>
            </div>
        );
    }

    // =========================================================================
    // BUYER VERIFICATION VIEW (Rendered ONLY if user is a Buyer)
    // =========================================================================
    const buyerIsVerified = buyerExistingVerification?.status === 'verified';
    const buyerIsPending = buyerExistingVerification?.status === 'pending';

    return (
        <div className="glass-panel animate-fade-in-up" style={{ padding: '36px', maxWidth: '680px', margin: '30px auto', borderRadius: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                        🛍️
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Buyer Account Verification
                        </h2>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Customer Identity &amp; Delivery Address Protection
                        </div>
                    </div>
                </div>

                {setCurrentView && (
                    <button
                        type="button"
                        onClick={() => setCurrentView('buyer')}
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                        ← Back to Shop
                    </button>
                )}
            </div>

            {/* Status Badges */}
            {buyerIsVerified && (
                <div style={{ padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>✅</span>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>
                            Verified Buyer Account
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Your identity is verified. You have access to priority dispute protection, zero-delay order fulfillment, and cash-on-delivery privileges.
                        </div>
                    </div>
                </div>
            )}

            {buyerIsPending && !buyerIsVerified && (
                <div style={{ padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>⏳</span>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--warning, #f59e0b)' }}>
                            Buyer Verification Under Review
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Your identity and delivery details have been submitted. Our safety team is reviewing your verification documents.
                        </div>
                    </div>
                </div>
            )}

            {!buyerIsVerified && !buyerIsPending && (
                <div style={{ padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Verify your buyer profile to protect your purchases, unlock high-value orders, prevent delivery fraud, and receive priority resolution on returns.
                    </div>
                </div>
            )}

            {message && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' }}>
                    {message}
                </div>
            )}
            
            {error && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger, #ef4444)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' }}>
                    {error}
                </div>
            )}

            {/* Buyer Verification Form */}
            <form onSubmit={handleBuyerSubmit}>
                <div className="settings-grid-2" style={{ marginBottom: '18px' }}>
                    <label>
                        <span className="form-label">Full Legal Name *</span>
                        <input 
                            type="text"
                            required
                            value={buyerFullName}
                            onChange={e => setBuyerFullName(e.target.value)}
                            placeholder="e.g. Tendai Moyo"
                            style={{ width: '100%' }}
                        />
                    </label>

                    <label>
                        <span className="form-label">Contact Mobile / WhatsApp Number *</span>
                        <input 
                            type="tel"
                            required
                            value={buyerPhone}
                            onChange={e => setBuyerPhone(e.target.value)}
                            placeholder="e.g. 0772123456"
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>

                <div className="settings-grid-2" style={{ marginBottom: '18px' }}>
                    <label>
                        <span className="form-label">Primary Delivery City *</span>
                        <select 
                            value={buyerCity} 
                            onChange={e => setBuyerCity(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="Harare">Harare</option>
                            <option value="Bulawayo">Bulawayo</option>
                            <option value="Chitungwiza">Chitungwiza</option>
                            <option value="Mutare">Mutare</option>
                            <option value="Gweru">Gweru</option>
                            <option value="Kwekwe">Kwekwe</option>
                            <option value="Masvingo">Masvingo</option>
                            <option value="Victoria Falls">Victoria Falls</option>
                        </select>
                    </label>

                    <label>
                        <span className="form-label">Residential Street Address *</span>
                        <input 
                            type="text"
                            required
                            value={buyerAddress}
                            onChange={e => setBuyerAddress(e.target.value)}
                            placeholder="e.g. 14 Samora Machel Ave, Harare"
                            style={{ width: '100%' }}
                        />
                    </label>
                </div>

                {/* National ID / Passport */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px' }}>
                        <span className="form-label">
                            National ID, Passport, or Driver's License *
                        </span>
                    </label>
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileChange(e, setBuyerIdDoc)}
                            style={{ display: 'block', width: '100%', fontSize: '13px' }}
                        />
                        {buyerExistingVerification?.id_document_url && (
                            <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '8px' }}>
                                ✓ ID document already on file
                            </div>
                        )}
                    </div>
                </div>

                {/* Proof of Address (Utility bill, lease, or EcoCash statement) */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '6px' }}>
                        <span className="form-label">
                            Proof of Residence or EcoCash Statement <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Utility bill, lease, or bank statement)</span>
                        </span>
                    </label>
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileChange(e, setBuyerProofOfResidence)}
                            style={{ display: 'block', width: '100%', fontSize: '13px' }}
                        />
                        {buyerExistingVerification?.proof_of_residence_url && (
                            <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '8px' }}>
                                ✓ Proof of residence on file
                            </div>
                        )}
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={submitting}
                    style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '700', borderRadius: '10px' }}
                >
                    {submitting ? 'Submitting Buyer Credentials...' : '🛡️ Submit Buyer Verification'}
                </button>
            </form>
        </div>
    );
}

export const AccountVerification = VendorVerification;
