// client/src/components/ChatContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.js';
import { useToast } from './ToastContext.jsx';

const ChatContext = createContext(null);

export function ChatProvider({ children, currentUserId }) {
    const { showToast } = useToast();
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch all conversations for current user
    const loadConversations = useCallback(async () => {
        if (!currentUserId) return;
        setLoadingConversations(true);
        try {
            const { data: convData, error } = await supabase
                .from('conversations')
                .select('id, buyer_id, shop_id, product_id, last_message, last_message_at, created_at, product:products(id, title, price_cents, image_url)')
                .or(`buyer_id.eq.${currentUserId},shop_id.eq.${currentUserId}`)
                .order('last_message_at', { ascending: false });

            if (error) {
                // If table doesn't exist yet or other query error
                console.warn('Conversations fetch notice:', error.message);
                setLoadingConversations(false);
                return;
            }

            if (convData && convData.length > 0) {
                // Fetch vendor store profiles for participant display
                const shopIds = Array.from(new Set(convData.map(c => c.shop_id).filter(Boolean)));
                const { data: vProfiles } = await supabase
                    .from('vendor_profiles')
                    .select('id, store_name, whatsapp_number')
                    .in('id', shopIds);

                const vMap = {};
                (vProfiles || []).forEach(v => { vMap[v.id] = v; });

                const enriched = convData.map(c => ({
                    ...c,
                    vendor_profile: vMap[c.shop_id] || { store_name: 'Vendor Store' }
                }));

                setConversations(enriched);
            } else {
                setConversations([]);
            }

            // Fetch unread count
            const { count } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', currentUserId)
                .eq('is_read', false);

            setUnreadCount(count || 0);

        } catch (err) {
            console.warn('Notice in loadConversations:', err.message);
        } finally {
            setLoadingConversations(false);
        }
    }, [currentUserId]);

    // Fetch messages for active conversation
    const loadMessages = useCallback(async (convId) => {
        if (!convId) {
            setMessages([]);
            return;
        }
        setLoadingMessages(true);
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', convId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);

            // Mark received messages as read
            if (data && data.length > 0 && currentUserId) {
                const unreadIds = data
                    .filter(m => m.receiver_id === currentUserId && !m.is_read)
                    .map(m => m.id);

                if (unreadIds.length > 0) {
                    await supabase
                        .from('chat_messages')
                        .update({ is_read: true })
                        .in('id', unreadIds);

                    setUnreadCount(prev => Math.max(0, prev - unreadIds.length));
                }
            }
        } catch (err) {
            console.error('Error loading messages:', err.message);
        } finally {
            setLoadingMessages(false);
        }
    }, [currentUserId]);

    // Initial conversations load
    useEffect(() => {
        if (currentUserId) {
            loadConversations();
        }
    }, [currentUserId, loadConversations]);

    // Load messages when active conversation changes
    useEffect(() => {
        if (activeConversation?.id) {
            loadMessages(activeConversation.id);
        }
    }, [activeConversation?.id, loadMessages]);

    // Realtime subscriptions
    useEffect(() => {
        if (!currentUserId) return;

        const messagesChannel = supabase
            .channel(`chat-realtime-${currentUserId}`)
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages',
                    filter: `receiver_id=eq.${currentUserId}`
                },
                (payload) => {
                    const newMsg = payload.new;
                    
                    // If active conversation matches, append message
                    if (activeConversation?.id === newMsg.conversation_id) {
                        setMessages(prev => [...prev, newMsg]);
                        // Mark as read immediately
                        supabase
                            .from('chat_messages')
                            .update({ is_read: true })
                            .eq('id', newMsg.id);
                    } else {
                        // Increment unread count & show toast
                        setUnreadCount(prev => prev + 1);
                        showToast(`💬 New message received`, 'info');
                    }

                    // Refresh conversation list to bump last_message
                    loadConversations();
                }
            )
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages',
                    filter: `sender_id=eq.${currentUserId}`
                },
                (payload) => {
                    const newMsg = payload.new;
                    if (activeConversation?.id === newMsg.conversation_id) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messagesChannel);
        };
    }, [currentUserId, activeConversation?.id, loadConversations, showToast]);

    // Start or open a chat with a vendor (e.g. clicked from a product)
    const startChatWithVendor = async (vendorShopId, productContext = null) => {
        if (!currentUserId) {
            showToast('Please sign in to chat with sellers.', 'warning');
            return;
        }

        if (currentUserId === vendorShopId) {
            showToast("This is your own store listing.", 'info');
            return;
        }

        try {
            // Check if conversation already exists between buyer and this vendor
            const { data: existing } = await supabase
                .from('conversations')
                .select('*, product:products(*)')
                .eq('buyer_id', currentUserId)
                .eq('shop_id', vendorShopId)
                .maybeSingle();

            if (existing) {
                // If new product context provided, update conversation product_id
                if (productContext?.id && existing.product_id !== productContext.id) {
                    await supabase
                        .from('conversations')
                        .update({ product_id: productContext.id })
                        .eq('id', existing.id);
                    existing.product = productContext;
                }
                setActiveConversation(existing);
                setIsChatOpen(true);
                return;
            }

            // Create new conversation
            const { data: created, error } = await supabase
                .from('conversations')
                .insert({
                    buyer_id: currentUserId,
                    shop_id: vendorShopId,
                    product_id: productContext?.id || null,
                    last_message: productContext ? `Inquired about "${productContext.title}"` : 'Conversation started',
                    last_message_at: new Date().toISOString()
                })
                .select('*, product:products(*)')
                .single();

            if (error) throw error;

            setConversations(prev => [created, ...prev]);
            setActiveConversation(created);
            setIsChatOpen(true);

        } catch (err) {
            console.error('Failed to start chat:', err.message);
            showToast(`Could not start chat: ${err.message}`, 'error');
        }
    };

    // Send a message in the active conversation
    const sendMessage = async (text) => {
        if (!text || !text.trim() || !activeConversation || !currentUserId) return;
        const trimmed = text.trim();

        const receiverId = activeConversation.buyer_id === currentUserId 
            ? activeConversation.shop_id 
            : activeConversation.buyer_id;

        try {
            const { data: newMsg, error } = await supabase
                .from('chat_messages')
                .insert({
                    conversation_id: activeConversation.id,
                    sender_id: currentUserId,
                    receiver_id: receiverId,
                    message_text: trimmed,
                    is_read: false
                })
                .select()
                .single();

            if (error) throw error;

            // Optimistically update message stream
            setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });

            // Update conversation last_message
            await supabase
                .from('conversations')
                .update({
                    last_message: trimmed,
                    last_message_at: new Date().toISOString()
                })
                .eq('id', activeConversation.id);

            // Update local conversation item
            setConversations(prev => prev.map(c => 
                c.id === activeConversation.id 
                    ? { ...c, last_message: trimmed, last_message_at: new Date().toISOString() } 
                    : c
            ));

        } catch (err) {
            console.error('Failed to send message:', err.message);
            showToast(`Send failed: ${err.message}`, 'error');
        }
    };

    return (
        <ChatContext.Provider value={{
            conversations,
            activeConversation,
            setActiveConversation,
            messages,
            isChatOpen,
            setIsChatOpen,
            unreadCount,
            loadingConversations,
            loadingMessages,
            loadConversations,
            startChatWithVendor,
            sendMessage
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
