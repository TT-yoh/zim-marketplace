// Joins truthy class names: cx('a', cond && 'b') -> 'a b'
export const cx = (...names) => names.filter(Boolean).join(' ');
