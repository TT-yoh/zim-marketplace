// client/src/components/LiveChatDrawer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from './ChatContext.jsx';

export function LiveChatDrawer({ currentUserId, formatPrice, currency = 'USD' }) {
    const {
        conversations,
        activeConversation,
        setActiveConversation,
        messages,
        isChatOpen,
        setIsChatOpen,
        unreadCount,
        loadingConversations,
        loadingMessages,
        sendMessage
    } = useChat();

    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (isChatOpen && activeConversation) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isChatOpen, activeConversation]);

    const handleSend = (e) => {
        e?.preventDefault();
        if (!inputText.trim()) return;
        sendMessage(inputText);
        setInputText('');
    };

    const getParticipantName = (conv) => {
        if (!conv) return 'Chat';
        if (conv.buyer_id === currentUserId) {
            return conv.vendor_profile?.store_name || 'Vendor Store';
        }
        return conv.buyer_profile?.full_name || 'Customer';
    };

    const filteredConversations = conversations.filter(conv => {
        const name = getParticipantName(conv).toLowerCase();
        const lastMsg = (conv.last_message || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || lastMsg.includes(q);
    });

    return (
        <>
            {/* Floating Chat Trigger Button (Bottom Right) */}
            <button
                onClick={() => setIsChatOpen(prev => !prev)}
                className="btn-primary"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9990,
                    width: '56px',
                    height: '56px',
                    borderRadius: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
                    cursor: 'pointer',
                    border: 'none'
                }}
                title="Open Live Chat"
                aria-label="Open Live Chat"
            >
                <span style={{ fontSize: '24px' }}>💬</span>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        backgroundColor: 'var(--danger, #ef4444)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '800',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--bg-primary)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Slide-Out Chat Drawer Window */}
            {isChatOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        bottom: '90px',
                        right: '24px',
                        width: '380px',
                        maxWidth: 'calc(100vw - 48px)',
                        height: '540px',
                        maxHeight: 'calc(100vh - 120px)',
                        zIndex: 9995,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-primary)'
                    }}
                    className="glass-panel animate-fade-in-up"
                >
                    {/* Drawer Header */}
                    <div style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-secondary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {activeConversation && (
                                <button
                                    onClick={() => setActiveConversation(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px', padding: '0 4px 0 0' }}
                                    title="Back to Conversations"
                                >
                                    ←
                                </button>
                            )}
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
                                    {activeConversation ? getParticipantName(activeConversation) : '💬 Messages'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                                    Online Realtime
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsChatOpen(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', padding: '2px' }}
                            title="Close Chat"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Main Drawer Body */}
                    {!activeConversation ? (
                        /* Conversations List View */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                            {/* Search conversations */}
                            <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
                                <input
                                    type="text"
                                    placeholder="Search chats..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>

                            {/* List of Conversations */}
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {loadingConversations ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                        Loading conversations...
                                    </div>
                                ) : filteredConversations.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
                                        No active chats yet.<br />
                                        Click <strong>"Chat with Seller"</strong> on any product to start a conversation!
                                    </div>
                                ) : (
                                    filteredConversations.map(conv => {
                                        const title = getParticipantName(conv);
                                        const dateStr = conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                        return (
                                            <div
                                                key={conv.id}
                                                onClick={() => setActiveConversation(conv)}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderBottom: '1px solid var(--border)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    transition: 'background-color 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--accent-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontWeight: '700',
                                                    fontSize: '16px',
                                                    flexShrink: 0
                                                }}>
                                                    {title.charAt(0).toUpperCase()}
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {title}
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                            {dateStr}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {conv.last_message || 'Start chatting...'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Active Conversation Message Thread */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {/* Pinned Product Preview Header Card (if conversation has attached product) */}
                            {activeConversation.product && (
                                <div style={{
                                    padding: '8px 14px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    {activeConversation.product.image_url ? (
                                        <img 
                                            src={activeConversation.product.image_url} 
                                            alt={activeConversation.product.title} 
                                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📦</div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {activeConversation.product.title}
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--success)' }}>
                                            {formatPrice ? formatPrice(activeConversation.product.price_cents, currency) : `$${(activeConversation.product.price_cents / 100).toFixed(2)}`}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Message Stream */}
                            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {loadingMessages ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', margin: 'auto' }}>
                                        Loading messages...
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: 'auto' }}>
                                        👋 Say hello and ask any questions about this item!
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isMine = msg.sender_id === currentUserId;
                                        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div 
                                                key={msg.id} 
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: isMine ? 'flex-end' : 'flex-start'
                                                }}
                                            >
                                                <div style={{
                                                    maxWidth: '80%',
                                                    padding: '10px 14px',
                                                    borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                                    backgroundColor: isMine ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                                    color: isMine ? '#fff' : 'var(--text-primary)',
                                                    fontSize: '13px',
                                                    lineHeight: '1.4',
                                                    wordBreak: 'break-word',
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                                }}>
                                                    {msg.message_text}
                                                </div>
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', padding: '0 4px' }}>
                                                    {time} {isMine && (msg.is_read ? '✓✓' : '✓')}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input Box */}
                            <form onSubmit={handleSend} style={{
                                padding: '12px',
                                borderTop: '1px solid var(--border)',
                                display: 'flex',
                                gap: '8px',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <input 
                                    type="text"
                                    placeholder="Type a message..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: '20px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{
                                        borderRadius: '20px',
                                        padding: '0 16px',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        border: 'none'
                                    }}
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
