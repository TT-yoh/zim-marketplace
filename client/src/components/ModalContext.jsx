// client/src/components/ModalContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export function ModalProvider({ children }) {
    const [modalConfig, setModalConfig] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [inputError, setInputError] = useState('');

    const showAlert = useCallback(({ title = 'Notice', message, type = 'info', confirmText = 'OK', onConfirm }) => {
        setInputError('');
        setModalConfig({
            title,
            message,
            type,
            confirmText,
            cancelText: null,
            requiresInput: false,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setModalConfig(null);
            }
        });
    }, []);

    const showConfirm = useCallback(({ title = 'Confirm Action', message, type = 'warning', confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) => {
        setInputError('');
        setModalConfig({
            title,
            message,
            type,
            confirmText,
            cancelText,
            requiresInput: false,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setModalConfig(null);
            },
            onCancel: () => {
                if (onCancel) onCancel();
                setModalConfig(null);
            }
        });
    }, []);

    const showPrompt = useCallback(({ title = 'Confirmation Required', message, type = 'danger', placeholder = '', expectedText = null, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) => {
        setInputValue('');
        setInputError('');
        setModalConfig({
            title,
            message,
            type,
            placeholder,
            expectedText,
            confirmText,
            cancelText,
            requiresInput: true,
            onConfirm: (val) => {
                if (expectedText && val.trim().toUpperCase() !== expectedText.trim().toUpperCase()) {
                    setInputError(`Please type "${expectedText}" exactly to confirm.`);
                    return;
                }
                if (onConfirm) onConfirm(val);
                setModalConfig(null);
            },
            onCancel: () => {
                if (onCancel) onCancel();
                setModalConfig(null);
            }
        });
    }, []);

    const closeModal = () => setModalConfig(null);

    const getHeaderColor = (type) => {
        switch (type) {
            case 'danger':
            case 'error':
                return { color: 'var(--danger, #ef4444)', border: '1px solid rgba(239, 68, 68, 0.4)', icon: '🚨' };
            case 'warning':
                return { color: 'var(--warning, #f59e0b)', border: '1px solid rgba(245, 158, 11, 0.4)', icon: '⚠️' };
            case 'success':
                return { color: 'var(--success, #10b981)', border: '1px solid rgba(16, 185, 129, 0.4)', icon: '✓' };
            default:
                return { color: 'var(--accent-primary, #3b82f6)', border: '1px solid rgba(59, 130, 246, 0.4)', icon: 'ℹ️' };
        }
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}
            {modalConfig && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} className="animate-fade-in">
                    <div className="glass-panel animate-scale-up" style={{
                        maxWidth: '480px',
                        width: '100%',
                        padding: '28px',
                        borderRadius: '16px',
                        border: getHeaderColor(modalConfig.type).border,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                        backgroundColor: 'var(--bg-secondary, #0f172a)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '24px' }}>{getHeaderColor(modalConfig.type).icon}</span>
                            <h3 style={{ margin: 0, fontSize: '20px', color: getHeaderColor(modalConfig.type).color }}>
                                {modalConfig.title}
                            </h3>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                            {modalConfig.message}
                        </p>

                        {modalConfig.requiresInput && (
                            <div style={{ marginBottom: '20px' }}>
                                {modalConfig.expectedText && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        Type <strong style={{ color: 'var(--text-primary)' }}>"{modalConfig.expectedText}"</strong> to confirm:
                                    </div>
                                )}
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder={modalConfig.placeholder || 'Type here...'}
                                    value={inputValue}
                                    onChange={(e) => {
                                        setInputValue(e.target.value);
                                        if (inputError) setInputError('');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        fontSize: '14px',
                                        borderRadius: '8px',
                                        border: inputError ? '1px solid var(--danger, #ef4444)' : '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)'
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            modalConfig.onConfirm(inputValue);
                                        }
                                    }}
                                />
                                {inputError && (
                                    <div style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', marginTop: '6px' }}>
                                        {inputError}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            {modalConfig.cancelText && (
                                <button
                                    onClick={modalConfig.onCancel}
                                    className="btn-secondary"
                                    style={{ padding: '8px 18px', fontSize: '14px' }}
                                >
                                    {modalConfig.cancelText}
                                </button>
                            )}
                            <button
                                onClick={() => modalConfig.onConfirm(inputValue)}
                                className="btn-primary"
                                style={{
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    backgroundColor: modalConfig.type === 'danger' ? 'var(--danger)' : undefined,
                                    borderColor: modalConfig.type === 'danger' ? 'var(--danger)' : undefined
                                }}
                            >
                                {modalConfig.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}
