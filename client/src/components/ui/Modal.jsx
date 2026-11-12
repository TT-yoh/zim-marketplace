import { useEffect, useRef } from 'react';
import { cx } from './cx.js';

// Accessible modal shell: dimmed overlay + role="dialog" panel.
// variant: glass (frosted, bg-secondary, 20px radius, 32px padding)
//          solid (bg-primary, 16px radius, 24px padding)
//          bare  (no panel styling; pass your own className/style)
// size: sm (500px) | md (650px) | lg (720px) | xl (900px)
// Clicking the overlay or pressing Escape calls onClose (when provided).
export function Modal({
    onClose,
    ariaLabel,
    labelledBy,
    variant = 'glass',
    size = 'md',
    closeOnOverlay = true,
    className,
    overlayClassName,
    overlayStyle,
    style,
    children,
}) {
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && onCloseRef.current) onCloseRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div
            className={cx('ui-modal-overlay animate-fade-in', overlayClassName)}
            style={overlayStyle}
            onClick={(e) => {
                if (closeOnOverlay && onClose && e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={labelledBy ? undefined : ariaLabel}
                aria-labelledby={labelledBy}
                className={cx(
                    'ui-modal',
                    `ui-modal-${size}`,
                    variant !== 'bare' && `ui-modal-${variant}`,
                    variant === 'glass' && 'glass-panel animate-scale-up',
                    className
                )}
                style={style}
            >
                {children}
            </div>
        </div>
    );
}

// Title row with a bottom divider and an optional close button.
export function ModalHeader({ title, id, onClose, children, className }) {
    return (
        <div className={cx('ui-modal-header', className)}>
            {title ? <h3 id={id} className="ui-modal-title">{title}</h3> : children}
            {onClose && (
                <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close">✕</button>
            )}
        </div>
    );
}
