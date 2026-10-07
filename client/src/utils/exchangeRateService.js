// client/src/utils/exchangeRateService.js

const CACHE_KEY = 'zimmarket_zig_rate_cache';
const BASELINE_ZIG_RATE = 26.76; // Official Reserve Bank of Zimbabwe (RBZ) Interbank Rate
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 Hours

/**
 * Synchronously retrieves the current effective official ZiG rate from cache or baseline.
 * Ensures 0ms render times across the entire UI.
 */
export const getEffectiveZigRate = () => {
    try {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.rate === 'number' && parsed.rate > 0) {
                return parsed.rate;
            }
        }
    } catch (e) {
        console.warn('Could not read exchange rate cache:', e);
    }
    return BASELINE_ZIG_RATE;
};

/**
 * Synchronously gets full rate metadata (source, updated time, override status).
 */
export const getZigRateMetadata = () => {
    try {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.rate === 'number') {
                return parsed;
            }
        }
    } catch (e) {}
    return {
        rate: BASELINE_ZIG_RATE,
        isLive: false,
        source: 'Reserve Bank of Zimbabwe Reference Baseline',
        lastUpdated: Date.now(),
        adminOverride: false
    };
};

/**
 * Fetches live exchange rate from official financial heads/feeds in the background.
 * Uses multi-provider resilience with automatic fallbacks.
 * @param {boolean} forceRefresh - If true, ignores the 6-hour cache and queries live endpoints immediately.
 */
export const fetchLiveZigRate = async (forceRefresh = false) => {
    const currentMeta = getZigRateMetadata();
    
    // If an admin manually pinned the rate and not forcing refresh, preserve it
    if (currentMeta.adminOverride && !forceRefresh) {
        return currentMeta;
    }

    // If cache is still fresh (< 6 hours) and not forced, return cached
    if (!forceRefresh && currentMeta.lastUpdated && (Date.now() - currentMeta.lastUpdated < CACHE_TTL_MS)) {
        return currentMeta;
    }

    // Provider 1: Open Exchange Interbank Rates Feed
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (response.ok) {
            const data = await response.json();
            const liveRate = data.rates?.ZWG || data.rates?.ZWL;
            if (liveRate && typeof liveRate === 'number' && liveRate > 0) {
                const newMeta = {
                    rate: parseFloat(liveRate.toFixed(2)),
                    isLive: true,
                    source: 'Reserve Bank of Zimbabwe & Interbank Feed',
                    lastUpdated: Date.now(),
                    adminOverride: false
                };

                localStorage.setItem(CACHE_KEY, JSON.stringify(newMeta));
                window.dispatchEvent(new Event('zimmarket_rate_updated'));
                return newMeta;
            }
        }
    } catch (err) {
        console.warn('Provider 1 live exchange rate fetch failed, trying Provider 2:', err.message);
    }

    // Provider 2: Secondary Currency API Mirror for ZWG
    try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
        if (response.ok) {
            const data = await response.json();
            const liveRate = data.usd?.zwg;
            if (liveRate && typeof liveRate === 'number' && liveRate > 0) {
                const newMeta = {
                    rate: parseFloat(liveRate.toFixed(2)),
                    isLive: true,
                    source: 'Interbank Multi-Feed Composite',
                    lastUpdated: Date.now(),
                    adminOverride: false
                };

                localStorage.setItem(CACHE_KEY, JSON.stringify(newMeta));
                window.dispatchEvent(new Event('zimmarket_rate_updated'));
                return newMeta;
            }
        }
    } catch (err) {
        console.warn('Provider 2 exchange rate fetch failed:', err.message);
    }

    // Fallback to existing or official baseline
    const fallbackMeta = {
        rate: getEffectiveZigRate(),
        isLive: false,
        source: currentMeta.source || 'Official RBZ Baseline',
        lastUpdated: Date.now(),
        adminOverride: false
    };
    return fallbackMeta;
};

/**
 * Returns the effective ZiG rate for a specific store/vendor.
 * If the store owner has configured their own custom rate, returns that.
 * Otherwise, falls back to the official platform RBZ rate.
 */
export const getStoreEffectiveZigRate = (vendorProfile, defaultOfficialRate = null) => {
    const officialRate = defaultOfficialRate || getEffectiveZigRate();
    if (!vendorProfile) return officialRate;

    const useCustom = vendorProfile.use_custom_rate === true || 
                      vendorProfile.shipping_settings?.zig_rate_settings?.mode === 'custom';

    const customVal = parseFloat(
        vendorProfile.custom_zig_rate !== undefined && vendorProfile.custom_zig_rate !== null
            ? vendorProfile.custom_zig_rate 
            : vendorProfile.shipping_settings?.zig_rate_settings?.custom_rate
    );

    if (useCustom && !isNaN(customVal) && customVal > 0) {
        return customVal;
    }
    return officialRate;
};

/**
 * Returns complete rate status metadata for a specific store.
 */
export const getStoreRateInfo = (vendorProfile, defaultOfficialMeta = null) => {
    const officialMeta = defaultOfficialMeta || getZigRateMetadata();
    const storeRate = getStoreEffectiveZigRate(vendorProfile, officialMeta.rate);
    const isCustom = Math.abs(storeRate - officialMeta.rate) > 0.001 && (
        vendorProfile?.use_custom_rate === true || 
        vendorProfile?.shipping_settings?.zig_rate_settings?.mode === 'custom'
    );

    return {
        rate: storeRate,
        isCustom,
        officialRate: officialMeta.rate,
        source: isCustom ? 'Merchant Custom Store Multiplier' : officialMeta.source,
        label: isCustom 
            ? `Store Custom Rate: 1 USD = ${storeRate.toFixed(2)} ZiG` 
            : `Official RBZ: 1 USD = ${officialMeta.rate.toFixed(2)} ZiG`
    };
};

/**
 * Allows Superadmin to manually pin/override the official ZiG rate.
 */
export const setAdminZigOverride = (customRate) => {
    const rateNum = parseFloat(customRate);
    if (isNaN(rateNum) || rateNum <= 0) return false;

    const newMeta = {
        rate: parseFloat(rateNum.toFixed(2)),
        isLive: false,
        source: 'Superadmin Manual Override',
        lastUpdated: Date.now(),
        adminOverride: true
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(newMeta));
    window.dispatchEvent(new Event('zimmarket_rate_updated'));
    return true;
};

/**
 * Reverts manual override back to automated live rate feed.
 */
export const clearAdminZigOverride = () => {
    const newMeta = {
        rate: BASELINE_ZIG_RATE,
        isLive: true,
        source: 'Official RBZ Baseline',
        lastUpdated: Date.now(),
        adminOverride: false
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(newMeta));
    window.dispatchEvent(new Event('zimmarket_rate_updated'));
};

/**
 * Persists store owner rate preference to Supabase vendor profile.
 * Resiliently updates both dedicated columns and shipping_settings JSONB.
 */
export const updateVendorZigRate = async (supabaseClient, vendorId, { useCustomRate, customRate, currentShippingSettings = {} }) => {
    if (!supabaseClient || !vendorId) throw new Error('Missing Supabase client or vendor ID');
    
    const parsedRate = parseFloat(customRate);
    const validRate = (!isNaN(parsedRate) && parsedRate > 0) ? parseFloat(parsedRate.toFixed(2)) : null;

    const mergedShipping = {
        ...(currentShippingSettings || {}),
        zig_rate_settings: {
            mode: useCustomRate ? 'custom' : 'official',
            custom_rate: validRate,
            updated_at: new Date().toISOString()
        }
    };

    // Attempt upsert with dedicated columns
    const fullPayload = {
        id: vendorId,
        custom_zig_rate: useCustomRate ? validRate : null,
        use_custom_rate: Boolean(useCustomRate),
        shipping_settings: mergedShipping
    };

    const { data, error } = await supabaseClient
        .from('vendor_profiles')
        .upsert(fullPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

    if (error) {
        // Fallback in case columns do not exist yet on remote
        const fallbackPayload = {
            id: vendorId,
            shipping_settings: mergedShipping
        };
        const fallbackRes = await supabaseClient
            .from('vendor_profiles')
            .upsert(fallbackPayload, { onConflict: 'id' })
            .select()
            .maybeSingle();
        if (fallbackRes.error) throw fallbackRes.error;
        return fallbackRes.data || fallbackPayload;
    }

    return data || fullPayload;
};

