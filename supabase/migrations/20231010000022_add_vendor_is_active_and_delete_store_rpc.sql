-- 20231010000022_add_vendor_is_active_and_delete_store_rpc.sql
-- Supports soft deactivation (suspending inactive stores) and permanent store removal by Platform Admins.

-- 1. Add is_active flag to vendor_profiles if it doesn't already exist
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Admin function to permanently remove a vendor store and all its listings
CREATE OR REPLACE FUNCTION public.admin_delete_vendor_store(target_vendor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: caller is not a platform admin.';
    END IF;

    -- Delete vendor products and associated order items
    DELETE FROM public.order_items WHERE shop_id = target_vendor_id;
    DELETE FROM public.products WHERE shop_id = target_vendor_id;
    DELETE FROM public.vendor_balances WHERE shop_id = target_vendor_id;
    DELETE FROM public.vendor_profiles WHERE id = target_vendor_id;
END;
$$;
