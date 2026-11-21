// client/src/components/NotificationBell.jsx
// Header bell: unread count plus a panel of recent notifications. Rows are created by database
// triggers (migration 047); this component only reads them and marks them read.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient.js';

const KIND_ICONS = {
    order_paid: '💳',
    new_order: '🛒',
    item_shipped: '🚚',
    escrow_released: '💰',
    refund_issued: '↩️',
    item_refunded: '↩️',
    problem_reported: '⚠️',
    payout_requested: '🏦',
    payout_paid: '✅',
    payout_approved: '👍',
    payout_rejected: '❌',
};

function timeAgo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
    return new Date(iso).toLocaleDateString();
}

export function NotificationBell({ userId, onNavigate }) {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [panelPos, setPanelPos] = useState({ top: 72, right: 16 });
    const buttonRef = useRef(null);
    const panelRef = useRef(null);

    const load = useCallback(async () => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('notifications')
            .select('id, kind, title, body, link, read_at, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);
        if (!error && data) setItems(data);
    }, [userId]);

    // Initial load + live inserts for this user
    useEffect(() => {
        if (!userId) return undefined;
        // Deferred so the fetch result never sets state synchronously inside the effect
        const first = setTimeout(load, 0);
        const channel = supabase
            .channel(`notifications-${userId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => setItems(prev => [payload.new, ...prev.filter(n => n.id !== payload.new.id)].slice(0, 30)))
            .subscribe();
        return () => { clearTimeout(first); supabase.removeChannel(channel); };
    }, [userId, load]);

    // Close on outside click / Escape
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (panelRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const unread = items.filter(n => !n.read_at).length;

    const toggle = () => {
        if (!open && buttonRef.current) {
            // The nav bar scrolls horizontally, so the panel is fixed-position under the button
            const r = buttonRef.current.getBoundingClientRect();
            setPanelPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
            load();
        }
        setOpen(o => !o);
    };

    const markRead = async (ids) => {
        if (ids.length === 0) return;
        const now = new Date().toISOString();
        setItems(prev => prev.map(n => (ids.includes(n.id) ? { ...n, read_at: n.read_at || now } : n)));
        await supabase.from('notifications').update({ read_at: now }).in('id', ids);
    };

    const openItem = (n) => {
        if (!n.read_at) markRead([n.id]);
        setOpen(false);
        if (n.link && onNavigate) onNavigate(n.link);
    };

    if (!userId) return null;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                className="btn-secondary notif-bell"
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={open}
                aria-haspopup="dialog"
                title="Notifications"
            >
                <span aria-hidden="true">🔔</span>
                {unread > 0 && <span className="notif-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
            </button>

            {open && (
                <div
                    ref={panelRef}
                    className="notif-panel glass-panel"
                    role="dialog"
                    aria-label="Notifications"
                    style={{ top: panelPos.top, right: panelPos.right }}
                >
                    <div className="notif-panel-head">
                        <strong>Notifications</strong>
                        {unread > 0 && (
                            <button type="button" className="notif-link" onClick={() => markRead(items.filter(n => !n.read_at).map(n => n.id))}>
                                Mark all read
                            </button>
                        )}
                    </div>
                    {items.length === 0 ? (
                        <p className="notif-empty">Nothing yet. Order, shipping and payout updates will show up here.</p>
                    ) : (
                        <ul className="notif-list">
                            {items.map(n => (
                                <li key={n.id}>
                                    <button type="button" className={`notif-item${n.read_at ? '' : ' unread'}`} onClick={() => openItem(n)}>
                                        <span className="notif-icon" aria-hidden="true">{KIND_ICONS[n.kind] || '🔔'}</span>
                                        <span className="notif-text">
                                            <span className="notif-title">{n.title}</span>
                                            {n.body && <span className="notif-body">{n.body}</span>}
                                            <span className="notif-time">{timeAgo(n.created_at)}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </>
    );
}

export default NotificationBell;
