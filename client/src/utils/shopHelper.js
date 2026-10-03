// client/src/utils/shopHelper.js
import { supabase } from '../components/supabaseClient.js';

/**
 * Ensures targetShopId is a valid UUID that exists in public.vendor_profiles,
 * automatically creating a vendor profile if the user doesn't have one yet.
 * This prevents the foreign key constraint violation "products_shop_id_fkey".
 *
 * @param {string|null} requestedShopId - The shop ID passed from parent component
 * @returns {Promise<{ shopId: string, storeName: string }>}
 */
export async function resolveAndEnsureShopId(requestedShopId) {
    // 1. Get current authenticated user session
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (!currentUserId && !requestedShopId) {
        throw new Error("Authentication required: Please log in to manage store inventory.");
    }

    // 2. Check if user is a platform admin
    let isPlatformAdmin = false;
    if (currentUserId) {
        const { data: adminData } = await supabase
            .from('platform_admins')
            .select('id')
            .eq('id', currentUserId)
            .maybeSingle();
        isPlatformAdmin = !!adminData;
    }

    // 3. Determine candidate ID
    let candidateShopId = requestedShopId;

    // If candidateShopId is missing, 'ALL', or not a 36-char UUID string:
    if (!candidateShopId || candidateShopId === 'ALL' || typeof candidateShopId !== 'string' || candidateShopId.length !== 36) {
        candidateShopId = currentUserId;
    }

    // If user is not an admin, Postgres RLS policy requires shop_id == auth.uid()
    if (!isPlatformAdmin && currentUserId) {
        candidateShopId = currentUserId;
    }

    // 4. Verify if candidateShopId exists in vendor_profiles
    const { data: existingProfile } = await supabase
        .from('vendor_profiles')
        .select('id, store_name')
        .eq('id', candidateShopId)
        .maybeSingle();

    if (existingProfile) {
        return {
            shopId: existingProfile.id,
            storeName: existingProfile.store_name || 'My Store'
        };
    }

    // 5. If profile doesn't exist, ensure a vendor profile for candidateShopId
    const fallbackStoreName = session?.user?.user_metadata?.store_name || 
                             session?.user?.user_metadata?.full_name || 
                             (session?.user?.email ? session.user.email.split('@')[0] : 'My Store');
    const fallbackWhatsapp = session?.user?.user_metadata?.whatsapp_number || 
                            session?.user?.phone || 
                            '263770000000';

    const { error: upsertError } = await supabase
        .from('vendor_profiles')
        .upsert({
            id: candidateShopId,
            store_name: fallbackStoreName,
            whatsapp_number: fallbackWhatsapp,
            is_active: true
        }, { onConflict: 'id' });

    if (!upsertError) {
        return {
            shopId: candidateShopId,
            storeName: fallbackStoreName
        };
    }

    // 6. If upsert failed and user is platform admin, fall back to any registered vendor store
    if (isPlatformAdmin) {
        if (currentUserId && candidateShopId !== currentUserId) {
            const { error: adminProfileError } = await supabase
                .from('vendor_profiles')
                .upsert({
                    id: currentUserId,
                    store_name: 'Admin Store',
                    whatsapp_number: '263770000000',
                    is_active: true
                }, { onConflict: 'id' });

            if (!adminProfileError) {
                return {
                    shopId: currentUserId,
                    storeName: 'Admin Store'
                };
            }
        }

        const { data: anyVendors } = await supabase
            .from('vendor_profiles')
            .select('id, store_name')
            .limit(1)
            .maybeSingle();

        if (anyVendors) {
            return {
                shopId: anyVendors.id,
                storeName: anyVendors.store_name || 'Store'
            };
        }
    }

    throw new Error(`Unable to link store profile (${candidateShopId}): ${upsertError.message}`);
}
