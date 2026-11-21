-- 20231010000043_lock_order_delivery_addresses.sql
-- Orders point at a row in buyer_addresses for delivery. The settings screen used to edit the
-- buyer's most recent address in place, so changing "my address" silently changed where an
-- existing (possibly paid and shipped) order would be delivered.
--
-- An address used by any order is now read-only (and can't be deleted); buyers save a new address
-- instead, which the app does automatically.

CREATE OR REPLACE FUNCTION public.protect_order_delivery_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.orders WHERE shipping_address_id = OLD.id) THEN
        -- Allow toggling only the "default" flag; the delivery details themselves are fixed
        IF TG_OP = 'DELETE'
           OR NEW.full_name IS DISTINCT FROM OLD.full_name
           OR NEW.street_address IS DISTINCT FROM OLD.street_address
           OR NEW.city IS DISTINCT FROM OLD.city
           OR NEW.province IS DISTINCT FROM OLD.province
           OR NEW.phone_number IS DISTINCT FROM OLD.phone_number
           OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id THEN
            RAISE EXCEPTION 'This address is attached to an order and can''t be changed. Save a new address instead.';
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_order_delivery_address() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_order_delivery_address ON public.buyer_addresses;
CREATE TRIGGER trg_protect_order_delivery_address
BEFORE UPDATE OR DELETE ON public.buyer_addresses
FOR EACH ROW
EXECUTE FUNCTION public.protect_order_delivery_address();
