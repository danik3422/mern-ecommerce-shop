/** Joins class names, skipping falsy values: cx('a', isOpen && 'b') */
export const cx = (...classNames) => classNames.filter(Boolean).join(' ')
