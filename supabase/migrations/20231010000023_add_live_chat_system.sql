-- 20231010000023_add_live_chat_system.sql
-- Enables real-time buyer-to-vendor messaging and conversations with Row Level Security.

-- 1. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shop_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    last_message text DEFAULT '',
    last_message_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by participants
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_shop ON public.conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants and Admins can view conversations" ON public.conversations;
CREATE POLICY "Participants and Admins can view conversations" ON public.conversations
    FOR SELECT TO authenticated
    USING (
        buyer_id = auth.uid() 
        OR shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Participants and Admins can insert conversations" ON public.conversations;
CREATE POLICY "Participants and Admins can insert conversations" ON public.conversations
    FOR INSERT TO authenticated
    WITH CHECK (
        buyer_id = auth.uid() 
        OR shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Participants and Admins can update conversations" ON public.conversations;
CREATE POLICY "Participants and Admins can update conversations" ON public.conversations
    FOR UPDATE TO authenticated
    USING (
        buyer_id = auth.uid() 
        OR shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Participants and Admins can delete conversations" ON public.conversations;
CREATE POLICY "Participants and Admins can delete conversations" ON public.conversations
    FOR DELETE TO authenticated
    USING (
        buyer_id = auth.uid() 
        OR shop_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );


-- 2. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message_text text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for message stream
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(receiver_id, is_read);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants and Admins can view messages" ON public.chat_messages;
CREATE POLICY "Participants and Admins can view messages" ON public.chat_messages
    FOR SELECT TO authenticated
    USING (
        sender_id = auth.uid() 
        OR receiver_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Senders can insert messages" ON public.chat_messages;
CREATE POLICY "Senders can insert messages" ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Receivers and Admins can update messages" ON public.chat_messages;
CREATE POLICY "Receivers and Admins can update messages" ON public.chat_messages
    FOR UPDATE TO authenticated
    USING (
        receiver_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Participants and Admins can delete messages" ON public.chat_messages;
CREATE POLICY "Participants and Admins can delete messages" ON public.chat_messages
    FOR DELETE TO authenticated
    USING (
        sender_id = auth.uid() 
        OR receiver_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    );

-- 3. REALTIME PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
END $$;
