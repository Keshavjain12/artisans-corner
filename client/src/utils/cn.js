import clsx from 'clsx';

/** Small wrapper so components read `cn(base, condition && variant)`. */
export const cn = (...inputs) => clsx(inputs);

export default cn;
