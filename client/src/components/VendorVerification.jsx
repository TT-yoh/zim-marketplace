import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';

export function VendorVerification({ setCurrentView }) {
    const [vendorType, setVendorType] = useState('individual');
    const [idDocument, setIdDocument] = useState(null);
    const [selfieDocument, setSelfieDocument] = useState(null);
    const [companyDocument, setCompanyDocument] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUserId(session.user.id);
            }
        };
        getSession();
    }, []);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!idDocument) {
            setError("National ID / Passport is required.");
            setLoading(false);
            return;
        }

        if (vendorType === 'business' && !companyDocument) {
            setError("Company Registration document is required for businesses.");
            setLoading(false);
            return;
        }

        try {
            // Upload documents
            const idDocUrl = await uploadFile(idDocument, 'id');
            let selfieUrl = null;
            let companyUrl = null;

            if (selfieDocument) {
                selfieUrl = await uploadFile(selfieDocument, 'selfie');
            }

            if (vendorType === 'business' && companyDocument) {
                companyUrl = await uploadFile(companyDocument, 'company');
            }

            // Update vendor profile
            const { error: updateError } = await supabase
                .from('vendor_profiles')
                .update({
                    vendor_type: vendorType,
                    id_document_url: idDocUrl,
                    selfie_with_id_url: selfieUrl,
                    company_registration_url: companyUrl
                })
                .eq('id', userId);

            if (updateError) {
                throw updateError;
            }

            setMessage("Verification documents submitted successfully! Our team will review them shortly.");
            setTimeout(() => setCurrentView('vendor-inventory'), 3000); // Redirect back to dashboard

        } catch (err) {
            console.error("Submission error:", err);
            setError(err.message || "An error occurred during submission.");
        } finally {
            setLoading(false);
        }
    };

    if (!userId) {
        return (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', marginTop: '20px' }}>
                <p>{error || "Loading..."}</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px', margin: '40px auto' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-primary)' }}>Vendor Verification</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                To build trust in the Zim Marketplace, we require vendors to verify their identity. 
                Please provide the required documentation based on your seller type.
            </p>

            {message && (
                <div style={{ backgroundColor: 'var(--success-bg, rgba(46, 204, 113, 0.2))', color: 'var(--success, #2ecc71)', padding: '12px', borderRadius: '6px', marginBottom: '24px' }}>
                    {message}
                </div>
            )}
            
            {error && (
                <div style={{ backgroundColor: 'var(--danger-bg, rgba(231, 76, 60, 0.2))', color: 'var(--danger, #e74c3c)', padding: '12px', borderRadius: '6px', marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>I am selling as an:</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <input 
                                type="radio" 
                                value="individual" 
                                checked={vendorType === 'individual'} 
                                onChange={() => setVendorType('individual')}
                            />
                            Individual (Personal Items)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <input 
                                type="radio" 
                                value="business" 
                                checked={vendorType === 'business'} 
                                onChange={() => setVendorType('business')}
                            />
                            Registered Business
                        </label>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        National ID or Passport <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input 
                        type="file" 
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, setIdDocument)}
                        style={{ display: 'block', width: '100%', padding: '10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)' }}
                    />
                </div>

                {vendorType === 'individual' && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            Selfie holding ID <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Optional but recommended)</span>
                        </label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, setSelfieDocument)}
                            style={{ display: 'block', width: '100%', padding: '10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)' }}
                        />
                    </div>
                )}

                {vendorType === 'business' && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            Company Registration / License <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileChange(e, setCompanyDocument)}
                            style={{ display: 'block', width: '100%', padding: '10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)' }}
                        />
                    </div>
                )}

                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={loading}
                    style={{ width: '100%', padding: '12px', fontSize: '16px', marginTop: '12px' }}
                >
                    {loading ? 'Uploading Documents...' : 'Submit for Verification'}
                </button>
            </form>
        </div>
    );
}
