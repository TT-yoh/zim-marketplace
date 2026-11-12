import { Button } from '../ui/index.js';

export function PayoutTab({ handleSaveVendor, payoutAccountName, payoutAccountNumber, payoutBankName, payoutBranchCode, payoutEcocashName, payoutEcocashNumber, payoutInnbucksNumber, payoutMethod, saving, setPayoutAccountName, setPayoutAccountNumber, setPayoutBankName, setPayoutBranchCode, setPayoutEcocashName, setPayoutEcocashNumber, setPayoutInnbucksNumber, setPayoutMethod }) {
    return (
        <form onSubmit={handleSaveVendor} className="animate-fade-in">
            <div className="settings-section-card">
                <div className="settings-section-title">
                    <span>💳</span> Preferred Settlement Channel
                </div>
                <div className="settings-section-subtitle">
                    Receive earnings from completed customer orders into your mobile money or Nostro account.
                </div>

                <div className="flex gap-12 wrap mb-20">
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
                                <div className="fs-14 fw-700 text-primary">
                                    {method.label}
                                </div>
                                <div className="fs-11 text-secondary">
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
                                placeholder="0771234567" className="w-full"
                            />
                        </label>
                        <label>
                            <span className="form-label">Registered Account Name *</span>
                            <input 
                                type="text" 
                                required
                                value={payoutEcocashName} 
                                onChange={e => setPayoutEcocashName(e.target.value)} 
                                placeholder="e.g. John Doe / Apex Electronics Pvt Ltd" className="w-full"
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
                            placeholder="0771234567" className="w-full"
                        />
                    </label>
                )}

                {/* Nostro Bank Inputs */}
                {payoutMethod === 'bank' && (
                    <div className="settings-grid-2">
                        <label>
                            <span className="form-label">Banking Institution *</span>
                            <select value={payoutBankName} onChange={e => setPayoutBankName(e.target.value)} className="w-full">
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
                            <input type="text" required value={payoutAccountName} onChange={e => setPayoutAccountName(e.target.value)} placeholder="Company or Full Name" className="w-full" />
                        </label>
                        <label>
                            <span className="form-label">Nostro Account Number *</span>
                            <input type="text" required value={payoutAccountNumber} onChange={e => setPayoutAccountNumber(e.target.value)} placeholder="0123456789012" className="w-full" />
                        </label>
                        <label>
                            <span className="form-label">Branch / Swift Code</span>
                            <input type="text" value={payoutBranchCode} onChange={e => setPayoutBranchCode(e.target.value)} placeholder="Harare CBD / Branch Code" className="w-full" />
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
                    <div className="fs-14 fw-700 text-success">
                        ZimMarket Escrow Payout Protection
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                        Buyer funds are held in secure escrow and disbursed automatically to your registered account upon buyer confirmation of delivered goods.
                    </div>
                </div>
            </div>

            <div className="settings-footer-actions">
                <span className="fs-13 text-muted">
                    🔒 Payout details are encrypted and securely verified.
                </span>
                <Button 
                    type="submit" 
                    disabled={saving} 
                    style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '700' }}
                >
                    {saving ? 'Saving Changes...' : '💾 Save Payout Accounts'}
                </Button>
            </div>
        </form>
    );
}
