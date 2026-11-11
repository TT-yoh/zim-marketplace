// client/src/utils/navigation.js
// Lightweight URL routing for the single-page app: each view has a real path so Back/Forward,
// refresh and sharing work. Store and product links use the query params the storefront reads.

export const VIEW_PATHS = {
    'buyer': '/',
    'buyer-orders': '/orders',
    'profile': '/settings',
    'vendor-inventory': '/vendor',
    'vendor-orders': '/vendor/orders',
    'admin': '/admin',
    'verification': '/verification',
    'vendor-verification': '/verification/vendor',
    'buyer-verification': '/verification/buyer',
};

const PATH_VIEWS = Object.fromEntries(Object.entries(VIEW_PATHS).map(([view, path]) => [path, view]));

// Views anyone can open without an account
export const GUEST_VIEWS = new Set(['buyer']);

export function normalizePath(pathname) {
    const trimmed = (pathname || '/').replace(/\/+$/, '');
    return trimmed === '' ? '/' : trimmed;
}

export function viewFromLocation() {
    return PATH_VIEWS[normalizePath(window.location.pathname)] || 'buyer';
}

export function pathForView(view) {
    return VIEW_PATHS[view] || '/';
}

// Turn pretty share links (/store/<slug>, /product/<id>) into the query params the storefront
// already understands, without adding a history entry.
export function normalizeShareLinks() {
    try {
        const path = normalizePath(window.location.pathname);
        const storeMatch = path.match(/^\/store\/([^/]+)$/);
        const productMatch = path.match(/^\/product\/([^/]+)$/);
        if (storeMatch) {
            window.history.replaceState({}, '', `/?store=${encodeURIComponent(decodeURIComponent(storeMatch[1]))}`);
        } else if (productMatch) {
            window.history.replaceState({}, '', `/?product=${encodeURIComponent(decodeURIComponent(productMatch[1]))}`);
        }
    } catch (e) {
        console.warn('Could not normalise share link:', e);
    }
}

// Ask the app shell to show the sign-in dialog (used by guest actions like checkout or chat)
export function requestSignIn(reason, nextView = null) {
    window.dispatchEvent(new CustomEvent('zimmarket_require_auth', { detail: { reason, nextView } }));
}

export function setSearchParam(key, value) {
    try {
        const url = new URL(window.location.href);
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch (e) {
        console.warn('Could not update URL:', e);
    }
}
