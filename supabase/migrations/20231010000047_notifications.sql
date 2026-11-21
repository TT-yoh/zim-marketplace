-- 20231010000047_notifications.sql
-- In-app notifications (the bell in the header). Rows are written only by the triggers below,
-- so a client can never notify someone else; users can read their own and mark them read.
--   buyer : payment confirmed, item shipped, refund issued
--   vendor: new paid order, buyer reported a problem, payment released, payout paid / rejected
--   admin : buyer reported a problem, new payout request
-- `link` is an app view key (see client/src/utils/navigation.js VIEW_PATHS).

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, DELETE ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "Users read their own notifications" ON public.notifications;
CREATE POLICY "Users read their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users mark their own notifications read" ON public.notifications;
CREATE POLICY "Users mark their own notifications read"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users delete their own notifications" ON public.notifications;
CREATE POLICY "Users delete their own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Live badge updates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- ============================================================================
-- HELPERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_user(p_user UUID, p_kind TEXT, p_title TEXT, p_body TEXT, p_link TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    SELECT p_user, p_kind, p_title, p_body, p_link
    WHERE p_user IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins(p_kind TEXT, p_title TEXT, p_body TEXT, p_link TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    SELECT id, p_kind, p_title, p_body, p_link FROM public.platform_admins;
$$;

CREATE OR REPLACE FUNCTION public.short_order_ref(p_order UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT '#' || upper(left(p_order::text, 8)) $$;

-- ============================================================================
-- ORDER PAID -> buyer + each vendor in the order
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_order_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shop UUID;
    v_count INTEGER;
BEGIN
    IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
        PERFORM public.notify_user(NEW.buyer_id, 'order_paid',
            'Payment confirmed for order ' || public.short_order_ref(NEW.id),
            'The sellers have been told to prepare your items. Your money stays in escrow until you receive them.',
            'buyer-orders');

        FOR v_shop, v_count IN
            SELECT shop_id, SUM(quantity)::int FROM public.order_items WHERE order_id = NEW.id GROUP BY shop_id
        LOOP
            PERFORM public.notify_user(v_shop, 'new_order',
                'New paid order ' || public.short_order_ref(NEW.id),
                v_count || ' item(s) to pack and ship.',
                'vendor-orders');
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_order_change ON public.orders;
CREATE TRIGGER trg_notify_on_order_change
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_change();

-- ============================================================================
-- ORDER ITEM: shipped / delivered / refunded / problem reported
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_order_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_buyer UUID;
    v_currency TEXT;
    v_title TEXT;
BEGIN
    SELECT o.buyer_id, COALESCE(o.currency, 'USD') INTO v_buyer, v_currency
    FROM public.orders o WHERE o.id = NEW.order_id;
    SELECT left(title, 60) INTO v_title FROM public.products WHERE id = NEW.product_id;
    v_title := COALESCE(v_title, 'An item');

    IF NEW.status = 'shipped' AND OLD.status IS DISTINCT FROM 'shipped' THEN
        PERFORM public.notify_user(v_buyer, 'item_shipped',
            v_title || ' has been shipped',
            'Confirm delivery in My Orders when it arrives, or report a problem within 7 days.',
            'buyer-orders');
    END IF;

    IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
        PERFORM public.notify_user(NEW.shop_id, 'escrow_released',
            'Payment released: ' || v_title,
            'The money is now in your available balance and can be withdrawn.',
            'vendor-inventory');
    END IF;

    IF NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
        PERFORM public.notify_user(v_buyer, 'refund_issued',
            'Refund issued for ' || v_title,
            'ZimMarket will send the money back to you and share the transaction reference.',
            'buyer-orders');
        PERFORM public.notify_user(NEW.shop_id, 'item_refunded',
            'Order item refunded: ' || v_title,
            'The buyer was refunded after review; this sale will not be paid out.',
            'vendor-orders');
    END IF;

    IF NEW.disputed_at IS NOT NULL AND OLD.disputed_at IS NULL THEN
        PERFORM public.notify_user(NEW.shop_id, 'problem_reported',
            'Buyer reported a problem: ' || v_title,
            left(NEW.dispute_reason, 200),
            'vendor-orders');
        PERFORM public.notify_admins('problem_reported',
            'Dispute opened on order ' || public.short_order_ref(NEW.order_id),
            left(NEW.dispute_reason, 200),
            'admin');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_order_item_change ON public.order_items;
CREATE TRIGGER trg_notify_on_order_item_change
AFTER UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_item_change();

-- ============================================================================
-- PAYOUTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_payout_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_amount TEXT := '$' || to_char(COALESCE(NEW.amount_cents, 0) / 100.0, 'FM999999990.00');
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.notify_admins('payout_requested',
            'Payout requested: ' || v_amount,
            NULL,
            'admin');
        RETURN NEW;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'paid' THEN
            PERFORM public.notify_user(NEW.shop_id, 'payout_paid',
                'Payout of ' || v_amount || ' sent',
                COALESCE('Reference: ' || NEW.payout_reference, NULL),
                'vendor-inventory');
        ELSIF NEW.status = 'rejected' THEN
            PERFORM public.notify_user(NEW.shop_id, 'payout_rejected',
                'Payout of ' || v_amount || ' was rejected',
                COALESCE(NEW.admin_notes, 'The money is back in your available balance.'),
                'vendor-inventory');
        ELSIF NEW.status = 'approved' THEN
            PERFORM public.notify_user(NEW.shop_id, 'payout_approved',
                'Payout of ' || v_amount || ' approved',
                'It will be sent shortly.',
                'vendor-inventory');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_payout_change ON public.payout_requests;
CREATE TRIGGER trg_notify_on_payout_change
AFTER INSERT OR UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_payout_change();

-- ============================================================================
-- HOUSEKEEPING: drop read notifications after 90 days
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'prune-old-notifications',
            '23 3 * * *',
            $cron$DELETE FROM public.notifications WHERE created_at < now() - interval '90 days'$cron$
        );
    END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_order_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_order_item_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_payout_change() FROM PUBLIC, anon, authenticated;
