// client/src/components/SetNewPasswordDialog.jsx
import { useState } from 'react';
import { supabase } from './supabaseClient.js';
import { PasswordInput } from './PasswordInput.jsx';

// Shown after the user opens a password-reset email link (Supabase PASSWORD_RECOVERY event)
export function SetNewPasswordDialog({ onDone }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('Use at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            setError("The two passwords don't match.");
            return;
        }
        setSaving(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setSaving(false);
        if (updateError) {
            setError(updateError.message || 'Could not update your password. Request a new reset link and try again.');
            return;
        }
        setSaved(true);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Set a new password"
            style={{ position: 'fixed', inset: 0, zIndex: 3100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(6px)' }}
        >
            <div className="glass-panel animate-fade-in-up" style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', borderRadius: '20px' }}>
                {saved ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', color: 'var(--text-primary)' }}>Password updated</h2>
                        <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>You're signed in with your new password.</p>
                        <button className="btn-primary" onClick={onDone} style={{ width: '100%', padding: '12px' }}>Continue</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', color: 'var(--text-primary)' }}>Set a new password</h2>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Choose a password you haven't used here before.</p>
                        </div>
                        <label>
                            <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>New password</span>
                            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" />
                        </label>
                        <label>
                            <span style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Confirm new password</span>
                            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} autoComplete="new-password" />
                        </label>
                        {error && (
                            <div role="alert" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>
                                ⚠️ {error}
                            </div>
                        )}
                        <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '12px', marginTop: '4px' }}>
                            {saving ? 'Saving...' : 'Save new password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
