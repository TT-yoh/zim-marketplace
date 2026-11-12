// client/src/components/VendorOnboardingChecklist.jsx
// "Get your store ready" checklist on the vendor dashboard. Hidden once every step is done.

const PLACEHOLDER_WHATSAPP = '263770000000';

export function getOnboardingSteps(profile, productCount) {
    const storeName = (profile?.store_name || '').trim();
    const whatsapp = (profile?.whatsapp_number || '').replace(/\D/g, '');
    const detailsDone = !!storeName && storeName !== 'My Store' && storeName !== 'My ZimMarket Store'
        && whatsapp.length >= 9 && whatsapp !== PLACEHOLDER_WHATSAPP;
    const docsSubmitted = !!profile?.id_document_url;
    const verified = profile?.is_verified === true;

    return [
        { key: 'details', label: 'Add your store name and WhatsApp number', done: detailsDone, action: 'Edit store', view: 'profile' },
        { key: 'product', label: 'List your first product', done: productCount > 0, action: 'Add product', view: null },
        { key: 'documents', label: 'Upload your ID for verification', done: docsSubmitted || verified, action: 'Upload ID', view: 'vendor-verification' },
        {
            key: 'verified',
            label: verified ? 'Verified: you can receive payouts' : docsSubmitted ? 'Waiting for admin approval (usually 1-2 working days)' : 'Get approved to receive payouts',
            done: verified,
            action: null,
            view: null
        },
    ];
}

export function VendorOnboardingChecklist({ profile, productCount, onNavigate, onAddProduct }) {
    const steps = getOnboardingSteps(profile, productCount);
    const doneCount = steps.filter(s => s.done).length;
    if (doneCount === steps.length) return null;

    const storeLink = profile?.store_slug ? `${window.location.origin}/store/${profile.store_slug}` : null;
    const percent = Math.round((doneCount / steps.length) * 100);

    return (
        <section aria-label="Store setup checklist" className="glass-panel" style={{ padding: '20px 22px', borderRadius: '14px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)' }}>🚀 Get your store ready</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{doneCount} of {steps.length} done</span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'var(--success)', transition: 'width 0.3s ease' }} />
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {steps.map(step => (
                    <li key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span aria-hidden="true" style={{
                            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700',
                            backgroundColor: step.done ? 'var(--success)' : 'transparent',
                            border: step.done ? 'none' : '2px solid var(--border)',
                            color: '#fff'
                        }}>
                            {step.done ? '✓' : ''}
                        </span>
                        <span style={{ flex: 1, minWidth: '180px', fontSize: '14px', color: step.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: step.done ? 'line-through' : 'none' }}>
                            <span className="sr-only">{step.done ? 'Done: ' : 'To do: '}</span>
                            {step.label}
                        </span>
                        {!step.done && step.action && (
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
                                onClick={() => (step.view ? onNavigate(step.view) : onAddProduct())}
                            >
                                {step.action} →
                            </button>
                        )}
                    </li>
                ))}
            </ul>
            {storeLink && productCount > 0 && (
                <p style={{ margin: '14px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Your store link: <a href={storeLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{storeLink.replace(/^https?:\/\//, '')}</a>. Share it on WhatsApp.
                </p>
            )}
        </section>
    );
}
