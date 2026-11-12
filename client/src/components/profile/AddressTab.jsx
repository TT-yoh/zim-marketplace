import { Button } from '../ui/index.js';

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

                <label className="block mb-16">
                    <span className="form-label">Full Name *</span>
                    <input 
                        type="text" 
                        required 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        placeholder="e.g. Tendai Moyo" className="w-full" 
                    />
                </label>

                <label className="block mb-16">
                    <span className="form-label">Street Address *</span>
                    <input 
                        type="text" 
                        required 
                        value={street} 
                        onChange={e => setStreet(e.target.value)} 
                        placeholder="e.g. 15 Samora Machel Ave" className="w-full" 
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
                            placeholder="Harare" className="w-full" 
                        />
                    </label>

                    <label>
                        <span className="form-label">Province *</span>
                        <select 
                            required 
                            value={province} 
                            onChange={e => setProvince(e.target.value)} className="w-full"
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

                <label className="block">
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
                <span className="fs-13 text-muted">
                    🚚 Pre-populates your checkout cart automatically.
                </span>
                <Button 
                    type="submit" 
                    disabled={saving} 
                    style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                >
                    {saving ? 'Saving...' : '💾 Save Shipping Address'}
                </Button>
            </div>
        </form>
    );
}
