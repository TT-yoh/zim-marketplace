// client/src/components/PasswordInput.jsx
import { useState } from 'react';

// Password field with a Show/Hide toggle (easier to type correctly on a phone)
export function PasswordInput({ value, onChange, placeholder = '••••••••', minLength, required = true, autoComplete = 'current-password', id }) {
    const [visible, setVisible] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <input
                id={id}
                type={visible ? 'text' : 'password'}
                required={required}
                minLength={minLength}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete={autoComplete}
                style={{ width: '100%', padding: '12px 72px 12px 14px', borderRadius: '10px' }}
            />
            <button
                type="button"
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '8px 10px'
                }}
            >
                {visible ? 'Hide' : 'Show'}
            </button>
        </div>
    );
}
