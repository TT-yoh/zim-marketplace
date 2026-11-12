// Admin dashboard SWR cache (moved from AdminDashboard.jsx).
// Persistent SWR cache for 0ms instant admin dashboard tab rendering
const getInitialAdminCache = () => {
    try {
        const saved = localStorage.getItem('zimmarket_admin_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.stats) return parsed;
        }
    } catch (e) {}
    return {
        stats: null,
        recentOrders: null,
        chartOrders: null,
        chartProducts: null,
        pendingVendors: null,
        allVendors: null,
        categoriesList: null,
        escrowItems: null,
        payoutRequests: null,
        isAdmin: null,
        timestamp: 0
    };
};

// Shared mutable cache (was a module-level `let` in AdminDashboard.jsx).
export const adminCache = { current: getInitialAdminCache() };
