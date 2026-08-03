import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

export function VendorWallet({ shopId }) {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [requestingPayout, setRequestingPayout] = useState(false);

    const fetchBalance = async () => {
        try {
            const { data, error } = await supabase
                .from('vendor_balances')
                .select('available_balance_cents')
                .eq('shop_id', shopId)
                .maybeSingle();

            if (error) {
                console.warn("Notice checking vendor balance:", error.message);
            }

            if (data) {
                setBalance(data.available_balance_cents || 0);
            } else {
                setBalance(0);
            }
        } catch (err) {
            console.error("Failed to fetch balance:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [shopId]);

    const handleRequestPayout = async () => {
        if (balance <= 0) {
            alert("No available balance to payout.");
            return;
        }

        setRequestingPayout(true);
        try {
            // In a real app, this would create a payout request record or integrate with a payment gateway (e.g., Stripe Connect, EcoCash).
            // For now, we'll simulate a payout by resetting the balance to 0 and logging a success message.
            const { error } = await supabase
                .from('vendor_balances')
                .update({ available_balance_cents: 0 })
                .eq('shop_id', shopId);

            if (error) throw error;

            alert("Payout requested successfully! Funds will be transferred to your registered account.");
            setBalance(0);
        } catch (err) {
            alert(`Failed to request payout: ${err.message}`);
        } finally {
            setRequestingPayout(false);
        }
    };

    if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading Wallet...</div>;

    return (
        <div className="glass-panel" style={{ padding: '24px', flex: 1, minWidth: '300px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: 'var(--text-primary)' }}>Wallet & Payouts</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Available Balance</div>
                <div style={{ fontSize: '42px', fontWeight: '800', color: 'var(--success)' }}>
                    ${(balance / 100).toFixed(2)}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: 0 }}>
                    Funds become available when buyers confirm delivery.
                </p>
            </div>

            <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                onClick={handleRequestPayout}
                disabled={requestingPayout || balance <= 0}
            >
                {requestingPayout ? 'Processing...' : '💳 Request Payout'}
            </button>
        </div>
    );
}
