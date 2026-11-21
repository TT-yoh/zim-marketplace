// client/src/components/admin/AdminMfaGate.jsx
// Admins must sign in with a second factor (authenticator app, TOTP) before the admin dashboard
// opens. The database enforces the same rule (migration 048): once an admin has an authenticator,
// admin powers only work in a session that passed it.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

const cardStyle = {
    maxWidth: '440px',
    margin: '48px auto',
    padding: '28px',
    backgroundColor: 'var(--bg-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
};

const inputStyle = {
    width: '100%',
    padding: '12px',
    fontSize: '22px',
    letterSpacing: '6px',
    textAlign: 'center',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
};

export function AdminMfaGate({ children }) {
    // checking | enrol | verify | ok | error
    const [stage, setStage] = useState('checking');
    const [factorId, setFactorId] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [secret, setSecret] = useState(null);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    const check = useCallback(async () => {
        setMessage('');
        const [{ data: aal, error: aalError }, { data: factors, error: factorsError }] = await Promise.all([
            supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
            supabase.auth.mfa.listFactors(),
        ]);
        if (aalError || factorsError) {
            setMessage((aalError || factorsError).message);
            setStage('error');
            return;
        }
        if (aal?.currentLevel === 'aal2') {
            setStage('ok');
            return;
        }
        const verified = (factors?.totp || []).find(f => f.status === 'verified');
        if (verified) {
            setFactorId(verified.id);
            setStage('verify');
        } else {
            setStage('enrol');
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(check, 0);
        return () => clearTimeout(t);
    }, [check]);

    const startEnrolment = async () => {
        setBusy(true);
        setMessage('');
        try {
            // Clear half-finished enrolments (QR shown but never confirmed) so a new one can start
            const { data: factors } = await supabase.auth.mfa.listFactors();
            for (const f of (factors?.all || []).filter(f => f.status === 'unverified')) {
                await supabase.auth.mfa.unenroll({ factorId: f.id });
            }
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: `ZimMarket admin ${new Date().toISOString().slice(0, 10)}`,
            });
            if (error) throw error;
            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
        } catch (err) {
            setMessage(err.message);
        } finally {
            setBusy(false);
        }
    };

    const submitCode = async (e) => {
        e.preventDefault();
        if (!factorId || code.trim().length !== 6) {
            setMessage('Enter the 6-digit code from your authenticator app.');
            return;
        }
        setBusy(true);
        setMessage('');
        try {
            const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
            if (error) throw error;
            setCode('');
            setStage('ok');
        } catch (err) {
            setMessage(err.message?.includes('Invalid') ? 'That code did not match. Check the time on your phone and try the newest code.' : err.message);
        } finally {
            setBusy(false);
        }
    };

    if (stage === 'ok') return children;

    if (stage === 'checking') {
        return <div className="glass-panel" style={cardStyle}><p style={{ margin: 0, color: 'var(--text-secondary)' }}>Checking two-factor sign-in…</p></div>;
    }

    const codeForm = (
        <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label htmlFor="admin-mfa-code" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>6-digit code</label>
            <input
                id="admin-mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                style={inputStyle}
                autoFocus
            />
            <button type="submit" className="btn-primary" disabled={busy || code.length !== 6}>
                {busy ? 'Checking…' : 'Verify and open admin'}
            </button>
        </form>
    );

    return (
        <div className="glass-panel" style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>🔐 Admin two-factor sign-in</h2>

            {stage === 'error' && (
                <>
                    <p style={{ margin: 0, color: 'var(--danger)' }}>Could not check two-factor status: {message}</p>
                    <button type="button" className="btn-secondary" onClick={check}>Try again</button>
                </>
            )}

            {stage === 'verify' && (
                <>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy…) and enter the current ZimMarket code.
                    </p>
                    {codeForm}
                </>
            )}

            {stage === 'enrol' && !qrCode && (
                <>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Admin accounts can move money and see buyers' documents, so they need a second sign-in step.
                        Set up an authenticator app on your phone once; after that you enter a 6-digit code when you open the admin dashboard.
                    </p>
                    <button type="button" className="btn-primary" onClick={startEnrolment} disabled={busy}>
                        {busy ? 'Starting…' : 'Set up authenticator app'}
                    </button>
                </>
            )}

            {stage === 'enrol' && qrCode && (
                <>
                    <ol style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li>In your authenticator app, add an account and scan this QR code.</li>
                        <li>Enter the 6-digit code the app shows.</li>
                    </ol>
                    <img src={qrCode} alt="QR code for your authenticator app" style={{ width: '200px', height: '200px', alignSelf: 'center', backgroundColor: '#fff', padding: '8px', borderRadius: '8px' }} />
                    {secret && (
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', overflowWrap: 'anywhere' }}>
                            Can't scan? Enter this key instead: <code>{secret}</code>
                        </p>
                    )}
                    {codeForm}
                </>
            )}

            {message && stage !== 'error' && (
                <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: '13px' }}>{message}</p>
            )}
        </div>
    );
}

export default AdminMfaGate;
