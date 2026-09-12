import { Star } from 'lucide-react';
import cn from '../utils/cn.js';

const SIZES = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-6 w-6' };

export function StarRating({ value = 0, count, size = 'md', onChange, className, idPrefix = 'star' }) {
  const rounded = Math.round(value * 2) / 2;

  if (onChange) {
    return (
      <fieldset className={cn('flex items-center gap-1', className)}>
        <legend className="sr-only">Rating out of five stars</legend>
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className="cursor-pointer p-0.5"
            htmlFor={`${idPrefix}-${star}`}
            title={`${star} star${star > 1 ? 's' : ''}`}
          >
            <input
              id={`${idPrefix}-${star}`}
              type="radio"
              name={idPrefix}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <Star
              className={cn(
                SIZES.lg,
                star <= value ? 'fill-clay-500 text-clay-500' : 'text-clay-200'
              )}
              aria-hidden="true"
            />
            <span className="sr-only">{`${star} star${star > 1 ? 's' : ''}`}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              SIZES[size],
              star <= rounded ? 'fill-clay-500 text-clay-500' : 'text-clay-200'
            )}
          />
        ))}
      </span>
      <span className="sr-only">{`Rated ${value} out of 5`}</span>
      {count !== undefined && (
        <span className="text-xs text-ink-soft" aria-hidden="true">
          ({count})
        </span>
      )}
    </span>
  );
}

export default StarRating;
