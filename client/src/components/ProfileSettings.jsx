import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';

export function ProfileSettings({ userId, email }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Vendor State
    const [hasVendorProfile, setHasVendorProfile] = useState(false);
    const [storeName, setStoreName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');

    // Buyer Address State
    const [addressId, setAddressId] = useState(null);
    const [fullName, setFullName] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('Harare');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        async function fetchProfileData() {
            setLoading(true);
            try {
                // Fetch Vendor Profile
                const { data: vendorData } = await supabase
                    .from('vendor_profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (vendorData) {
                    setHasVendorProfile(true);
                    setStoreName(vendorData.store_name || '');
                    setWhatsapp(vendorData.whatsapp_number || '');
                }

                // Fetch most recent Buyer Address
                const { data: addressData } = await supabase
                    .from('buyer_addresses')
                    .select('*')
                    .eq('buyer_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (addressData) {
                    setAddressId(addressData.id);
                    setFullName(addressData.full_name || '');
                    setStreet(addressData.street_address || '');
                    setCity(addressData.city || '');
                    setProvince(addressData.province || 'Harare');
                    setPhone(addressData.phone_number || '');
                }

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
            const { error } = await supabase
                .from('vendor_profiles')
                .update({ store_name: storeName, whatsapp_number: whatsapp })
                .eq('id', userId);
            
            if (error) throw error;
            alert('Vendor profile updated successfully!');
        } catch (err) {
            alert(`Error: ${err.message}`);
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
            alert('Default shipping address saved successfully!');
        } catch (err) {
            alert(`Error: ${err.message}`);
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
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: 'var(--text-primary)' }}>Vendor Details</h3>
                    
                    {!hasVendorProfile ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>You haven't set up a store yet.</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Go to "My Dashboard" to start selling.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveVendor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <label>
                                <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Store Name</span>
                                <input type="text" required value={storeName} onChange={e => setStoreName(e.target.value)} style={{ width: '100%' }} />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>WhatsApp Number</span>
                                <input type="tel" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={{ width: '100%' }} />
                            </label>
                            <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '8px' }}>
                                {saving ? 'Saving...' : 'Update Store'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
