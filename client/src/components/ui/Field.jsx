import { cx } from './cx.js';

// Label + control + optional hint. Pass the control as children.
export function Field({ label, hint, htmlFor, className, labelClassName, children }) {
    return (
        <div className={className}>
            {label && <label htmlFor={htmlFor} className={cx('ui-label', labelClassName)}>{label}</label>}
            {children}
            {hint && <div className="ui-hint">{hint}</div>}
        </div>
    );
}

// size: md (global input styles) | sm (8px 12px padding, 13px text)
export function Input({ size = 'md', block = true, className, ...rest }) {
    return <input className={cx(block && 'w-full', size === 'sm' && 'ui-input-sm', className)} {...rest} />;
}

export function Select({ size = 'md', block = true, className, children, ...rest }) {
    return (
        <select className={cx(block && 'w-full', size === 'sm' && 'ui-input-sm', className)} {...rest}>
            {children}
        </select>
    );
}

export function Textarea({ block = true, className, ...rest }) {
    return <textarea className={cx(block && 'w-full', 'resize-y', className)} {...rest} />;
}
