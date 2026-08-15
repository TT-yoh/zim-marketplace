// client/src/components/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const getToastStyle = (type) => {
        switch (type) {
            case 'success':
                return {
                    bg: 'rgba(16, 185, 129, 0.95)',
                    border: '1px solid #10b981',
                    icon: '✓'
                };
            case 'error':
                return {
                    bg: 'rgba(239, 68, 68, 0.95)',
                    border: '1px solid #ef4444',
                    icon: '✕'
                };
            case 'warning':
                return {
                    bg: 'rgba(245, 158, 11, 0.95)',
                    border: '1px solid #f59e0b',
                    icon: '⚠️'
                };
            default:
                return {
                    bg: 'rgba(59, 130, 246, 0.95)',
                    border: '1px solid #3b82f6',
                    icon: 'ℹ️'
                };
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Floating Toast Notification Container */}
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxWidth: '400px',
                width: 'calc(100vw - 40px)',
                pointerEvents: 'none'
            }}>
                {toasts.map(toast => {
                    const style = getToastStyle(toast.type);
                    return (
                        <div
                            key={toast.id}
                            className="animate-fade-in-up"
                            style={{
                                backgroundColor: style.bg,
                                color: '#ffffff',
                                border: style.border,
                                padding: '12px 16px',
                                borderRadius: '10px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                                backdropFilter: 'blur(12px)',
                                fontSize: '14px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                pointerEvents: 'auto',
                                cursor: 'pointer'
                            }}
                            onClick={() => removeToast(toast.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>{style.icon}</span>
                                <span>{toast.message}</span>
                            </div>
                            <span style={{ fontSize: '12px', opacity: 0.8 }}>✕</span>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
