import { Button } from '../ui/index.js';

export function LocationTab({ businessAddress, handleSaveVendor, operatingHours, pickupEnabled, pickupInstructions, saving, secondaryPhone, setBusinessAddress, setOperatingHours, setPickupEnabled, setPickupInstructions, setSecondaryPhone, setSupportEmail, supportEmail }) {
    return (
        <form onSubmit={handleSaveVendor} className="animate-fade-in">
            {/* In-Store Pickup Option Toggle */}
            <div className="settings-section-card" style={{ borderColor: pickupEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)' }}>
                <label className="gap-12 cursor-pointer row">
                    <input 
                        type="checkbox" 
                        checked={pickupEnabled} 
                        onChange={e => setPickupEnabled(e.target.checked)} 
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div>
                        <div className="fs-15 fw-700 text-primary">
                            🏬 Enable Free In-Store Customer Pickup
                        </div>
                        <div className="fs-12 text-secondary mt-2">
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

                <label className="block mb-16">
                    <span className="form-label">Physical Address</span>
                    <input 
                        type="text" 
                        value={businessAddress} 
                        onChange={e => setBusinessAddress(e.target.value)} 
                        placeholder="e.g. Shop 14, First Mutual Building, Jason Moyo Ave, Harare CBD" className="w-full" 
                    />
                </label>

                <label className="block">
                    <span className="form-label">Collection Instructions for Buyers</span>
                    <textarea 
                        rows="2"
                        value={pickupInstructions} 
                        onChange={e => setPickupInstructions(e.target.value)} 
                        placeholder="e.g. Bring order confirmation SMS to Counter 2. Items ready within 30 minutes of purchase." className="w-full resize-y" 
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

                <label className="block mb-16">
                    <span className="form-label">Weekly Operating Hours</span>
                    <input 
                        type="text" 
                        value={operatingHours} 
                        onChange={e => setOperatingHours(e.target.value)} 
                        placeholder="e.g. Mon - Fri: 8:00 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM | Sun: Closed" className="w-full" 
                    />
                </label>

                <div className="settings-grid-2">
                    <label>
                        <span className="form-label">Customer Support Email</span>
                        <input 
                            type="email" 
                            value={supportEmail} 
                            onChange={e => setSupportEmail(e.target.value)} 
                            placeholder="support@mystore.co.zw" className="w-full" 
                        />
                    </label>

                    <label>
                        <span className="form-label">Secondary Telephone / Landline</span>
                        <input 
                            type="tel" 
                            value={secondaryPhone} 
                            onChange={e => setSecondaryPhone(e.target.value)} 
                            placeholder="0242-750000 / 0712345678" className="w-full" 
                        />
                    </label>
                </div>
            </div>

            <div className="settings-footer-actions">
                <span className="fs-13 text-muted">
                    🕒 Operating hours and collection guidelines display at checkout.
                </span>
                <Button 
                    type="submit" 
                    disabled={saving} 
                    style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                >
                    {saving ? 'Saving Changes...' : '💾 Save Location & Hours'}
                </Button>
            </div>
        </form>
    );
}
