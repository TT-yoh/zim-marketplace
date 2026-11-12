import { cx } from './cx.js';

// tone: neutral | accent | success | warning | danger
export function Badge({ tone = 'neutral', className, children, ...rest }) {
    return (
        <span className={cx('ui-badge', `ui-badge-${tone}`, className)} {...rest}>
            {children}
        </span>
    );
}
