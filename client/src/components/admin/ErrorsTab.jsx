// client/src/components/admin/ErrorsTab.jsx
// Browser errors reported by real users (public.client_errors, migration 049), grouped by message.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export function ErrorsTab() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openKey, setOpenKey] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error: err } = await supabase
            .from('client_errors')
            .select('id, user_id, message, stack, source, url, user_agent, app_version, created_at')
            .order('created_at', { ascending: false })
            .limit(500);
        setError(err ? err.message : '');
        setRows(data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        const t = setTimeout(load, 0);
        return () => clearTimeout(t);
    }, [load]);

    // Same message = same bug; show count, users affected, last seen
    const groups = useMemo(() => {
        const map = new Map();
        for (const r of rows) {
            const key = `${r.source}|${r.message}`;
            const g = map.get(key) || { key, message: r.message, source: r.source, count: 0, users: new Set(), last: r, urls: new Set() };
            g.count += 1;
            if (r.user_id) g.users.add(r.user_id);
            if (r.url) g.urls.add(r.url);
            map.set(key, g);
        }
        return [...map.values()];
    }, [rows]);

    const clearGroup = async (g) => {
        const ids = rows.filter(r => `${r.source}|${r.message}` === g.key).map(r => r.id);
        const { error: err } = await supabase.from('client_errors').delete().in('id', ids);
        if (err) { setError(err.message); return; }
        setRows(prev => prev.filter(r => !ids.includes(r.id)));
    };

    return (
        <div className="glass-panel" style={{ padding: '28px', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="between mb-20 wrap gap-16 row">
                <div>
                    <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>🐞 App Errors</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Errors from real visitors' browsers over the last 30 days, grouped by message. Mark a group fixed to clear it.
                    </p>
                </div>
                <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
                    {loading ? 'Loading…' : '↻ Refresh'}
                </button>
            </div>

            {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}

            {!loading && groups.length === 0 && !error && (
                <p className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>No errors reported. 🎉</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {groups.map(g => (
                    <div key={g.key} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{g.message}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {g.count}× · {g.users.size} signed-in user(s) · {g.source} · last {new Date(g.last.created_at).toLocaleString()}
                                    {g.urls.size > 0 && <> · on {[...g.urls].slice(0, 3).join(', ')}</>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '6px 10px' }}
                                    onClick={() => setOpenKey(openKey === g.key ? null : g.key)} aria-expanded={openKey === g.key}>
                                    {openKey === g.key ? 'Hide details' : 'Details'}
                                </button>
                                <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={() => clearGroup(g)}>
                                    ✓ Mark fixed
                                </button>
                            </div>
                        </div>
                        {openKey === g.key && (
                            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <div>Browser: {g.last.user_agent || 'unknown'}</div>
                                <div>Version: {g.last.app_version || 'unknown'}</div>
                                {g.last.stack && (
                                    <pre style={{ marginTop: '8px', padding: '10px', borderRadius: '8px', background: 'var(--bg-primary)', overflowX: 'auto', whiteSpace: 'pre-wrap', fontSize: '11px', maxHeight: '260px' }}>
                                        {g.last.stack}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ErrorsTab;
