import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';

export function VendorWallet({ shopId }) {
    const { showToast } = useToast();
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [requestingPayout, setRequestingPayout] = useState(false);
    
    // Payout Form States
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutMethod, setPayoutMethod] = useState('ecocash');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    
    // Payout History
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchBalanceAndHistory = async () => {
        try {
            // 1. Fetch current available balance
            const { data: balanceData, error: balanceError } = await supabase
                .from('vendor_balances')
                .select('available_balance_cents')
                .eq('shop_id', shopId)
                .maybeSingle();

            if (balanceError) {
                console.warn("Notice checking vendor balance:", balanceError.message);
            }

            if (balanceData) {
                setBalance(balanceData.available_balance_cents || 0);
                setPayoutAmount(((balanceData.available_balance_cents || 0) / 100).toFixed(2));
            } else {
                setBalance(0);
                setPayoutAmount('0.00');
            }

            // 2. Fetch payout history if table exists
            setLoadingHistory(true);
            const { data: historyData, error: historyError } = await supabase
                .from('payout_requests')
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!historyError && historyData) {
                setPayoutHistory(historyData);
            }
        } catch (err) {
            console.error("Failed to fetch wallet info:", err.message);
        } finally {
            setLoading(false);
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (shopId) {
            fetchBalanceAndHistory();
        }
    }, [shopId]);

    const handleOpenPayoutModal = () => {
        if (balance <= 0) {
            showToast("No available balance to payout.", "warning");
            return;
        }
        setPayoutAmount((balance / 100).toFixed(2));
        setShowPayoutModal(true);
    };

    const handleRequestPayout = async (e) => {
        e.preventDefault();
        const amountCents = Math.round(parseFloat(payoutAmount) * 100);

        if (isNaN(amountCents) || amountCents <= 0) {
            showToast("Please enter a valid payout amount.", "warning");
            return;
        }

        if (amountCents > balance) {
            showToast("Requested amount exceeds available balance.", "warning");
            return;
        }

        if (!accountNumber.trim()) {
            showToast("Please enter the recipient phone number or account number.", "warning");
            return;
        }

        setRequestingPayout(true);
        try {
            // Attempt atomic stored procedure execution
            const { data, error } = await supabase.rpc('request_vendor_payout', {
                p_amount_cents: amountCents,
                p_payout_method: payoutMethod,
                p_payout_details: {
                    account_number: accountNumber.trim(),
                    account_name: accountName.trim()
                }
            });

            if (error) {
                // If RPC not found yet (migration pending), provide clear guidance
                if (error.message.includes('Could not find the function') || error.message.includes('schema cache')) {
                    throw new Error("Payout system is undergoing a security upgrade. Please notify the platform administrator to execute migration 25.");
                }
                throw error;
            }

            showToast("Payout request submitted successfully! Our finance team is processing your withdrawal.", "success");
            setShowPayoutModal(false);
            setAccountNumber('');
            setAccountName('');
            
            // Refresh balance & history
            await fetchBalanceAndHistory();

        } catch (err) {
            showToast(`Failed to request payout: ${err.message}`, "error");
        } finally {
            setRequestingPayout(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>✓ Paid</span>;
            case 'approved':
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>● Approved</span>;
            case 'rejected':
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>✕ Rejected</span>;
            default:
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>⏳ Pending</span>;
        }
    };

    if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '24px' }}>Loading Wallet...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Balance Card */}
            <div className="glass-panel" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Available Store Balance
                        </div>
                        <div style={{ fontSize: '44px', fontWeight: '800', color: 'var(--success)', marginTop: '6px' }}>
                            ${(balance / 100).toFixed(2)}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
                            🛡️ Funds are held in secure escrow and released to your available balance upon buyer delivery confirmation.
                        </p>
                    </div>

                    <button 
                        className="btn-primary" 
                        style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={handleOpenPayoutModal}
                        disabled={requestingPayout || balance <= 0}
                    >
                        💳 Request Payout
                    </button>
                </div>
            </div>

            {/* Payout History */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📜 Payout Request History
                </h4>

                {loadingHistory ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading payout records...</div>
                ) : payoutHistory.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>
                        No payout requests made yet.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '10px 12px' }}>Date</th>
                                    <th style={{ padding: '10px 12px' }}>Amount</th>
                                    <th style={{ padding: '10px 12px' }}>Method</th>
                                    <th style={{ padding: '10px 12px' }}>Account</th>
                                    <th style={{ padding: '10px 12px' }}>Status</th>
                                    <th style={{ padding: '10px 12px' }}>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payoutHistory.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            ${(item.amount_cents / 100).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '12px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                                            {item.payout_method}
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                                            {item.payout_details?.account_number || '-'}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                            {item.admin_notes || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payout Modal */}
            {showPayoutModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }}>
                    <div className="glass-panel animate-scale-up" style={{
                        width: '100%',
                        maxWidth: '480px',
                        padding: '32px',
                        backgroundColor: '#161b22',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
                                Request Store Payout
                            </h3>
                            <button 
                                onClick={() => setShowPayoutModal(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRequestPayout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                                    Payout Amount (USD)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>$</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="1"
                                        max={(balance / 100).toFixed(2)}
                                        value={payoutAmount}
                                        onChange={(e) => setPayoutAmount(e.target.value)}
                                        className="input-field"
                                        style={{ width: '100%', paddingLeft: '28px', boxSizing: 'border-box' }}
                                        required
                                    />
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Maximum available: ${(balance / 100).toFixed(2)}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                                    Payout Method
                                </label>
                                <select 
                                    value={payoutMethod} 
                                    onChange={(e) => setPayoutMethod(e.target.value)}
                                    className="input-field"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                >
                                    <option value="ecocash">EcoCash (USD / ZWG)</option>
                                    <option value="innbucks">InnBucks</option>
                                    <option value="bank">Bank Transfer (Nostro / RTGS)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                                    {payoutMethod === 'bank' ? 'Account Number / IBAN' : 'Mobile Number (EcoCash / InnBucks)'}
                                </label>
                                <input 
                                    type="text" 
                                    placeholder={payoutMethod === 'bank' ? 'e.g. 1002345678 (Stanbic)' : 'e.g. 0771234567'}
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    className="input-field"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                                    Account Holder Name
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. John Doe / Business Name"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="input-field"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button 
                                    type="button" 
                                    className="btn-secondary" 
                                    style={{ flex: 1, padding: '12px' }}
                                    onClick={() => setShowPayoutModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary" 
                                    style={{ flex: 2, padding: '12px', fontWeight: '700' }}
                                    disabled={requestingPayout}
                                >
                                    {requestingPayout ? 'Submitting...' : 'Confirm Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
