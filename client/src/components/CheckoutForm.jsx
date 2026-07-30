// client/src/components/CheckoutForm.jsx
import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';

export function CheckoutForm({ orderId, totalAmount, buyerEmail, currency = 'USD', formatPrice, onPaymentInitiated }) {
    const [mobileNumber, setMobileNumber] = useState('');
    const [provider, setProvider] = useState('ecocash'); 
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const formattedAmount = formatPrice ? formatPrice(totalAmount, currency) : `$${(totalAmount / 100).toFixed(2)}`;

    const handleLocalPayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { data, error } = await supabase.functions.invoke('initiate-payment', {
                body: { 
                    orderId, 
                    mobileNumber, 
                    provider, 
                    buyerEmail 
                }
            });

            if (error) throw error;

            if (data?.success) {
                setMessage("📱 Check your phone! A USSD PIN prompt has been sent.");
                if (onPaymentInitiated) {
                    onPaymentInitiated();
                }
            } else {
                setMessage(`❌ Payment Error: ${data?.error}`);
            }
        } catch (err) {
            console.error(err);
            setMessage("❌ Failed to contact payment gateway server.");
        } finally {
            setLoading(false);
        }
    };

    const handleDevBypass = async () => {
        setLoading(true);
        setMessage("✅ Test payment simulated successfully! Order confirmed.");
        setTimeout(() => {
            if (onPaymentInitiated) onPaymentInitiated();
        }, 1000);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Mobile Payment (Paynow)</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Amount Due: <strong style={{ color: 'var(--text-primary)' }}>{formattedAmount}</strong></p>
            
            <form onSubmit={handleLocalPayment}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Select Wallet Provider:
                    <select 
                        value={provider} 
                        onChange={(e) => setProvider(e.target.value)}
                        style={{ width: '100%', padding: '8px', marginTop: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }}
                    >
                        <option value="ecocash">EcoCash</option>
                        <option value="onemoney">OneMoney</option>
                    </select>
                </label>

                <label style={{ display: 'block', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                    Mobile Number (e.g., 077xxxxxxx):
                    <input 
                        type="tel" 
                        required
                        placeholder="0771234567" 
                        value={mobileNumber} 
                        onChange={(e) => setMobileNumber(e.target.value)}
                        style={{ width: '100%', padding: '8px', marginTop: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                    <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {provider === 'ecocash' 
                            ? '📱 An EcoCash push prompt will be sent to your phone. Enter your EcoCash PIN to approve.'
                            : '📱 A OneMoney push prompt (*111#) will be sent to your phone. Enter your PIN to approve.'}
                    </span>
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: '100%', padding: '10px' }}
                    >
                        {loading ? 'Processing Push Request...' : 'Pay Now via Paynow'}
                    </button>

                    <button 
                        type="button"
                        onClick={handleDevBypass}
                        disabled={loading}
                        className="btn-secondary"
                        style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                    >
                        ⚡ Simulate Successful Test Payment (Dev Mode)
                    </button>
                </div>
            </form>

            {message && <p style={{ marginTop: '12px', fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '13px' }}>{message}</p>}
        </div>
    );
}