import { ChevronLeft, ChevronRight } from 'lucide-react';
import cn from '../utils/cn.js';

export function Pagination({ meta, onChange, className }) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages } = meta;
  const window = 1;
  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    const isEdge = i === 1 || i === totalPages;
    const isNear = Math.abs(i - page) <= window;
    if (isEdge || isNear) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }

  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="Pagination">
      <button
        type="button"
        className="btn-secondary px-2.5 py-2"
        onClick={() => onChange(page - 1)}
        disabled={!meta.hasPrevPage}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {pages.map((entry, index) =>
        entry === '...' ? (
          <span key={`gap-${index}`} className="px-2 text-sm text-ink-soft">
            &hellip;
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-xl px-3 text-sm transition-colors',
              entry === page
                ? 'bg-clay-600 font-medium text-white'
                : 'border border-sand bg-white text-ink hover:border-clay-300'
            )}
          >
            {entry}
          </button>
        )
      )}

      <button
        type="button"
        className="btn-secondary px-2.5 py-2"
        onClick={() => onChange(page + 1)}
        disabled={!meta.hasNextPage}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export default Pagination;
