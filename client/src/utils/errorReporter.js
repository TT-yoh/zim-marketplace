// client/src/utils/errorReporter.js
// Sends uncaught browser errors to public.log_client_error (migration 049) so admins can see
// them in Admin → App Errors. Best effort: reporting never throws or shows anything to the user.
import { supabase } from '../components/supabaseClient.js';

const MAX_PER_PAGE_LOAD = 10;
const seen = new Set();
let sent = 0;
let installed = false;

// Noise from browser extensions, ad blockers and cancelled navigations, not from our code
const IGNORED = [
    /ResizeObserver loop/i,
    /Script error\.?$/i,
    /chrome-extension:|moz-extension:|safari-extension:/i,
    /AbortError/i,
    /Load failed$/i,
];

export function reportError(error, source = 'manual') {
    try {
        if (import.meta.env.MODE === 'test') return;
        const message = (error && (error.message || error.reason?.message)) || String(error || 'Unknown error');
        const stack = error?.stack || error?.reason?.stack || null;
        if (IGNORED.some(re => re.test(message) || (stack && re.test(stack)))) return;

        const key = `${source}:${message}`;
        if (seen.has(key) || sent >= MAX_PER_PAGE_LOAD) return;
        seen.add(key);
        sent += 1;

        supabase.rpc('log_client_error', {
            p_message: message,
            p_stack: stack,
            p_source: source,
            p_url: window.location.pathname + window.location.search,
            p_user_agent: navigator.userAgent,
            p_app_version: import.meta.env.VITE_APP_VERSION || import.meta.env.MODE,
        }).then(() => {}, () => {});
    } catch {
        // never let error reporting cause another error
    }
}

export function installErrorReporter() {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    window.addEventListener('error', (event) => {
        // Image/script load failures fire 'error' without an Error object; skip those
        if (!event.error && !event.message) return;
        reportError(event.error || { message: event.message }, 'window.onerror');
    });
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        reportError(reason instanceof Error ? reason : { message: String(reason?.message || reason) }, 'unhandledrejection');
    });
}
