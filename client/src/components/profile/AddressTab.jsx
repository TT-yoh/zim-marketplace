export function AddressTab({ city, fullName, handleSaveAddress, phone, province, saving, setCity, setFullName, setPhone, setProvince, setStreet, street }) {
    return (
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
    );
}
