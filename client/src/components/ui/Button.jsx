import { cx } from './cx.js';

// variant: primary | secondary | danger | success
// size: xs | sm | compact | md (default, matches .btn-primary/.btn-secondary) | lg
export function Button({ variant = 'primary', size = 'md', block = false, className, children, ...rest }) {
    const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
    return (
        <button
            className={cx(
                base,
                variant !== 'primary' && variant !== 'secondary' && `btn-${variant}`,
                size !== 'md' && `btn-${size}`,
                block && 'btn-block',
                className
            )}
            {...rest}
        >
            {children}
        </button>
    );
}

// Round icon-only button (close, share, ...). Always pass aria-label.
export function IconButton({ size = 32, className, style, children, ...rest }) {
    return (
        <button className={cx('ui-icon-btn', className)} style={{ width: size, height: size, ...style }} {...rest}>
            {children}
        </button>
    );
}
