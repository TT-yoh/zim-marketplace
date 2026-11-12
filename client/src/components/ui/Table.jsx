import { cx } from './cx.js';

// Horizontally scrollable data table with shared header/cell styling.
export function Table({ className, wrapClassName, children, ...rest }) {
    return (
        <div className={cx('ui-table-wrap', wrapClassName)}>
            <table className={cx('ui-table', className)} {...rest}>{children}</table>
        </div>
    );
}

// Header row: faint background, uppercase secondary text.
export function THeadRow({ className, children, ...rest }) {
    return <tr className={cx('ui-thead-row', className)} {...rest}>{children}</tr>;
}

export function Th({ align, className, children, ...rest }) {
    return (
        <th className={cx('ui-cell', align === 'right' && 'text-right', align === 'center' && 'text-center', className)} {...rest}>
            {children}
        </th>
    );
}

export function Td({ align, strong, className, children, ...rest }) {
    return (
        <td className={cx('ui-cell', strong && 'fw-600', align === 'right' && 'text-right', align === 'center' && 'text-center', className)} {...rest}>
            {children}
        </td>
    );
}

export function EmptyState({ icon, title, children, className }) {
    return (
        <div className={cx('ui-empty', className)}>
            {icon && <div className="ui-empty-icon" aria-hidden="true">{icon}</div>}
            {title && <div className="ui-empty-title">{title}</div>}
            {children}
        </div>
    );
}
