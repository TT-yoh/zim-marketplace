// client/src/components/CheckoutForm.jsx
import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';
import { parseZimMobile, PROVIDER_LABELS } from '../utils/zimPhone.js';

export function CheckoutForm({ orderId, totalAmount, currency = 'USD', formatPrice, onPaymentInitiated }) {
    const [mobileNumber, setMobileNumber] = useState('');
    const [provider, setProvider] = useState('ecocash');
    const [providerTouched, setProviderTouched] = useState(false);
    const [phoneBlurred, setPhoneBlurred] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const phone = parseZimMobile(mobileNumber, { final: phoneBlurred });
    const providerMismatch = phone.provider && phone.provider !== provider;

    const handleMobileChange = (value) => {
        setMobileNumber(value);
        // Pick the wallet from the number unless the buyer chose one themselves
        const detected = parseZimMobile(value).provider;
        if (detected && !providerTouched) setProvider(detected);
    };

    // Payments are always charged in USD (catalog prices are USD); ZiG is shown as an estimate only.
    const usdAmount = `$${((totalAmount || 0) / 100).toFixed(2)}`;
    const formattedAmount = currency === 'ZiG' && formatPrice
        ? `${usdAmount} USD (≈ ${formatPrice(totalAmount, 'ZiG')})`
        : usdAmount;

    const handleLocalPayment = async (e) => {
        e.preventDefault();
        setPhoneBlurred(true);
        const checked = parseZimMobile(mobileNumber, { final: true });
        if (checked.error || !checked.local) {
            setMessage(`❌ ${checked.error || 'Check your mobile number.'}`);
            return;
        }
        if (checked.provider && checked.provider !== provider) {
            setMessage(`❌ ${checked.local.slice(0, 3)} numbers are ${PROVIDER_LABELS[checked.provider]}. Switch the wallet to ${PROVIDER_LABELS[checked.provider]} or use a different number.`);
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const { data, error } = await supabase.functions.invoke('initiate-payment', {
                body: {
                    orderId,
                    mobileNumber: checked.local,
                    provider
                }
            });

            if (error) {
                // Show the server's explanation (e.g. "Order is already paid") instead of a generic failure
                let serverMessage = null;
                try {
                    serverMessage = (await error.context?.json())?.error;
                } catch (parseErr) {
                    serverMessage = null;
                }
                if (serverMessage) {
                    setMessage(`❌ ${serverMessage}`);
                    return;
                }
                throw error;
            }

            if (data?.success && data?.mock) {
                setMessage("🧪 Test payment approved. No money was charged (Paynow test mode).");
                if (onPaymentInitiated) {
                    setTimeout(() => onPaymentInitiated(), 1000);
                }
            } else if (data?.success) {
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
                        onChange={(e) => { setProvider(e.target.value); setProviderTouched(true); }}
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
                        inputMode="tel"
                        autoComplete="tel-national"
                        required
                        placeholder="0771234567"
                        value={mobileNumber}
                        onChange={(e) => handleMobileChange(e.target.value)}
                        onBlur={() => setPhoneBlurred(true)}
                        aria-invalid={!!phone.error}
                        aria-describedby="checkout-phone-hint"
                        style={{ width: '100%', padding: '8px', marginTop: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: `1px solid ${phone.error ? 'var(--danger)' : phone.local ? 'var(--success)' : 'var(--border)'}`, borderRadius: '4px' }}
                    />
                    <span id="checkout-phone-hint" role={phone.error ? 'alert' : undefined} style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: phone.error || providerMismatch ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {phone.error
                            ? `⚠️ ${phone.error}`
                            : providerMismatch
                                ? `⚠️ This looks like a ${PROVIDER_LABELS[phone.provider]} number, but ${PROVIDER_LABELS[provider]} is selected.`
                                : phone.local
                                    ? `✓ ${PROVIDER_LABELS[phone.provider]} number ${phone.local}. A prompt will be sent to this phone. Enter your PIN to approve.`
                                    : provider === 'ecocash'
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

                    {import.meta.env.DEV && (
                        <button 
                            type="button"
                            onClick={handleDevBypass}
                            disabled={loading}
                            className="btn-secondary"
                            style={{ width: '100%', padding: '8px', fontSize: '13px', opacity: 0.8 }}
                            title="Only visible in local development environment"
                        >
                            ⚡ Simulate Test Payment (Dev Only)
                        </button>
                    )}
                </div>
            </form>

            {message && <p style={{ marginTop: '12px', fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '13px' }}>{message}</p>}
        </div>
    );
}