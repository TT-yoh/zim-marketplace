import { Button } from '../ui/index.js';

export function AccountTab({ cached, copyUserId, email, hasVendorProfile, liveStoreUrl, setCurrentView, userId }) {
    return (
        <div className="animate-fade-in">
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>👤</span> Account Details & Security
                </div>
                <div className="settings-section-subtitle">
                    Your ZimMarket authentication credentials and role permissions.
                </div>

                <div className="settings-grid-2">
                    <div className="p-16 bg-secondary rounded-10 border">
                        <div className="fs-12 text-secondary">Login Email</div>
                        <div className="fs-16 fw-700 text-primary mt-4">
                            {email || 'N/A'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '6px' }}>
                            ✓ Verified ZimMarket User
                        </div>
                    </div>

                    <div className="p-16 bg-secondary rounded-10 border">
                        <div className="fs-12 text-secondary">Account UID</div>
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

            {/* Role-Specific Account Verification Card */}
            <div className="settings-section-card" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                <div className="settings-section-title">
                    <span>{hasVendorProfile ? '🏪' : '🛍️'}</span>
                    {hasVendorProfile ? 'Store Identity & Verification' : 'Buyer Account Verification'}
                </div>
                <div className="settings-section-subtitle">
                    {hasVendorProfile 
                        ? 'Submit merchant registration or ID documents to display the green trust badge on your products.'
                        : 'Verify your buyer account to access enhanced purchase protection and expedited order delivery.'}
                </div>

                <div style={{
                    padding: '16px 20px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    marginTop: '12px'
                }}>
                    <div className="gap-12 row">
                        <span className="fs-24">
                            {hasVendorProfile 
                                ? (cached?.vendorData?.is_verified ? '✅' : cached?.vendorData?.id_document_url ? '⏳' : '⚠️')
                                : '🛡️'}
                        </span>
                        <div>
                            <div className="fs-14 fw-700 text-primary">
                                {hasVendorProfile ? (
                                    cached?.vendorData?.is_verified ? 'Verified Merchant Store' :
                                    cached?.vendorData?.id_document_url ? 'Documents Under Compliance Review' :
                                    'Unverified Merchant Account'
                                ) : 'Buyer Identity Verification'}
                            </div>
                            <div className="fs-12 text-secondary mt-2">
                                {hasVendorProfile 
                                    ? (cached?.vendorData?.is_verified ? 'Your merchant trust badge is live on all products.' : 'Upload official documents for verified status.')
                                    : 'Submit official ID to unlock priority dispatch and dispute protection.'}
                            </div>
                        </div>
                    </div>

                    {setCurrentView && (
                        <Button
                            type="button"
                            onClick={() => setCurrentView('verification')}
                            style={{ fontSize: '13px', padding: '9px 18px', fontWeight: '700' }}
                        >
                            {hasVendorProfile ? '🏪 Manage Vendor Verification' : '🛡️ Verify Buyer Account'}
                        </Button>
                    )}
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

                <div className="flex gap-10 wrap">
                    {hasVendorProfile ? (
                        <>
                            {setCurrentView && (
                                <Button 
                                    type="button" 
                                    onClick={() => setCurrentView('vendor-inventory')}
                                    style={{ fontSize: '13px', padding: '9px 16px' }}
                                >
                                    📦 Vendor Inventory Dashboard
                                </Button>
                            )}
                            {setCurrentView && (
                                <Button 
                                    type="button" 
                                    onClick={() => setCurrentView('vendor-orders')} 
                                    variant="secondary"
                                    style={{ fontSize: '13px', padding: '9px 16px' }}
                                >
                                    📋 Fulfillment Orders
                                </Button>
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
                                <Button 
                                    type="button" 
                                    onClick={() => setCurrentView('buyer-orders')}
                                    style={{ fontSize: '13px', padding: '9px 16px' }}
                                >
                                    🛍️ My Orders
                                </Button>
                            )}
                            {setCurrentView && (
                                <Button 
                                    type="button" 
                                    onClick={() => setCurrentView('buyer')} 
                                    variant="secondary"
                                    style={{ fontSize: '13px', padding: '9px 16px' }}
                                >
                                    🛒 Browse Marketplace
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
