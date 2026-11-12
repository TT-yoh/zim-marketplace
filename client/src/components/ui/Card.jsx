import { cx } from './cx.js';

// glass: frosted panel (.glass-panel); otherwise a flat bordered surface (.ui-card).
// padding: none | sm (16px) | md (20px) | lg (24px)
export function Card({ as: Tag = 'div', glass = false, padding = 'md', className, children, ...rest }) {
    return (
        <Tag className={cx(glass ? 'glass-panel' : 'ui-card', padding !== 'none' && `ui-pad-${padding}`, className)} {...rest}>
            {children}
        </Tag>
    );
}

export function SectionTitle({ icon, children, className, ...rest }) {
    return (
        <h4 className={cx('ui-section-title', className)} {...rest}>
            {icon && <span aria-hidden="true">{icon}</span>}
            {children}
        </h4>
    );
}
