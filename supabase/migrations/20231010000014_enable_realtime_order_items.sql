-- 20231010000014_enable_realtime_order_items.sql

-- Enable realtime broadcasting for the order_items table
-- This allows React clients to subscribe to postgres_changes instantly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;
END
$$;
