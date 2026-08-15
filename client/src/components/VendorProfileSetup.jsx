// client/src/components/VendorProfileSetup.jsx
import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';
import { uploadImageToStorage } from '../utils/imageUploadHelper.js';

export function VendorProfileSetup({ userId, onProfileCreated }) {
    const [vendorType, setVendorType] = useState('business');
    const [storeName, setStoreName] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [idFile, setIdFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFileChange = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (e.target.files && e.target.files.length > 0) {
            setIdFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            // Strip any non-numeric characters for WhatsApp link compatibility
            const cleanedNumber = whatsappNumber.replace(/\D/g, '');
            if (cleanedNumber.length < 9) {
                throw new Error("Please enter a valid WhatsApp number including country code.");
            }
            if (!idFile) {
                throw new Error("Please upload a National ID or Business Certificate for verification.");
            }

            // Upload KYC document safely
            const documentUrl = await uploadImageToStorage(idFile, 'kyc-documents', userId);
            if (!documentUrl) {
                throw new Error("Failed to process document upload. Please try another file.");
            }

            // Create Profile
            const { error } = await supabase
                .from('vendor_profiles')
                .insert([{
                    id: userId,
                    store_name: storeName,
                    whatsapp_number: cleanedNumber,
                    id_document_url: documentUrl,
                    is_verified: false
                }]);

            if (error) throw error;
            
            if (onProfileCreated) onProfileCreated();

        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px' }}>
            <div className="glass-panel animate-fade-in-up" style={{ padding: '40px' }}>
                <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Set Up Your Store</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                    Before you can list products, please provide your store details and upload verification documents.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Vendor Type</span>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="vendorType" 
                                    value="business" 
                                    checked={vendorType === 'business'} 
                                    onChange={(e) => setVendorType(e.target.value)} 
                                />
                                Registered Business
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="vendorType" 
                                    value="individual" 
                                    checked={vendorType === 'individual'} 
                                    onChange={(e) => setVendorType(e.target.value)} 
                                />
                                Individual / Personal Seller
                            </label>
                        </div>
                    </label>

                    <label>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>Store Name / Your Display Name</span>
                        <input 
                            type="text" 
                            required 
                            placeholder={vendorType === 'business' ? "e.g. Harare Electronics Hub" : "e.g. John's Garage Sale"} 
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </label>

                    <label>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>WhatsApp Number</span>
                        <span style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>Include your country code (e.g. 263...)</span>
                        <input 
                            type="tel" 
                            required 
                            placeholder="263771234567" 
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </label>
                    
                    <label>
                        <span style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                            {vendorType === 'business' ? 'Business Registration Document (Image)' : 'National ID or Driver\'s License (Image)'}
                        </span>
                        <span style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {vendorType === 'business' ? 'Upload your CR14, Certificate of Incorporation, or Tax Clearance.' : 'Upload a clear photo of your ID or Passport for verification.'}
                        </span>
                        <input 
                            type="file" 
                            accept="image/*"
                            required 
                            onChange={handleFileChange}
                            style={{ width: '100%', padding: '8px', border: '1px dashed var(--border)', background: 'rgba(255,255,255,0.02)' }}
                        />
                    </label>

                    {errorMsg && (
                        <div style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', padding: '12px', borderRadius: '8px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {errorMsg}
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '16px', fontSize: '16px', marginTop: '8px' }}>
                        {loading ? 'Submitting Application...' : 'Complete Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
}
