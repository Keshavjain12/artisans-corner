import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ProductGridSkeleton } from '../components/Skeletons.jsx';
import { Button, Select } from '../components/ui.jsx';
import catalogService from '../services/catalogService.js';
import useAsync from '../hooks/useAsync.js';
import useDebounce from '../hooks/useDebounce.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { SORT_OPTIONS } from '../utils/constants.js';
import cn from '../utils/cn.js';

const RATINGS = [4, 3, 2];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [term, setTerm] = useState(params.get('q') || '');
  const debouncedTerm = useDebounce(term, 400);

  const query = useMemo(
    () => ({
      q: params.get('q') || '',
      category: params.get('category') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      minRating: params.get('minRating') || '',
      inStock: params.get('inStock') || '',
      sort: params.get('sort') || 'featured',
      page: Number(params.get('page') || 1),
    }),
    [params]
  );

  useDocumentTitle(query.q ? `Search: ${query.q}` : 'Shop');

  const categories = useAsync(() => catalogService.listCategories(), []);
  const products = useAsync(
    () => catalogService.listProducts({ ...query, limit: 12 }),
    [params.toString()]
  );

  // Keep the URL in step with the debounced search box.
  useEffect(() => {
    if (debouncedTerm === (params.get('q') || '')) return;
    const next = new URLSearchParams(params);
    if (debouncedTerm) next.set('q', debouncedTerm);
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === '' || value === null || value === undefined) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const clearAll = () => {
    setTerm('');
    setParams(new URLSearchParams());
  };

  const activeFilters = ['category', 'minPrice', 'maxPrice', 'minRating', 'inStock', 'q'].filter(
    (key) => params.get(key)
  );

  const meta = products.data?.meta;
  const list = products.data?.data || [];

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <h3 className="text-sm font-semibold text-ink">Category</h3>
        <ul className="mt-3 space-y-1.5">
          <li>
            <button
              type="button"
              onClick={() => update('category', '')}
              className={cn(
                'text-sm transition-colors hover:text-clay-700',
                !query.category ? 'font-medium text-clay-700' : 'text-ink-muted'
              )}
            >
              All categories
            </button>
          </li>
          {(categories.data?.data || []).map((category) => (
            <li key={category.slug}>
              <button
                type="button"
                onClick={() => update('category', category.slug)}
                className={cn(
                  'text-sm transition-colors hover:text-clay-700',
                  query.category === category.slug ? 'font-medium text-clay-700' : 'text-ink-muted'
                )}
              >
                {category.name}
                <span className="ml-1.5 text-xs text-ink-soft">({category.productCount})</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Price</h3>
        <div className="mt-3 flex items-center gap-2">
          <label className="sr-only" htmlFor="minPrice">
            Minimum price
          </label>
          <input
            id="minPrice"
            type="number"
            min="0"
            placeholder="Min"
            className="field"
            defaultValue={query.minPrice}
            onBlur={(event) => update('minPrice', event.target.value)}
          />
          <span className="text-ink-soft">&ndash;</span>
          <label className="sr-only" htmlFor="maxPrice">
            Maximum price
          </label>
          <input
            id="maxPrice"
            type="number"
            min="0"
            placeholder="Max"
            className="field"
            defaultValue={query.maxPrice}
            onBlur={(event) => update('maxPrice', event.target.value)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Rating</h3>
        <ul className="mt-3 space-y-1.5">
          {RATINGS.map((rating) => (
            <li key={rating}>
              <button
                type="button"
                onClick={() => update('minRating', String(rating))}
                className={cn(
                  'text-sm transition-colors hover:text-clay-700',
                  query.minRating === String(rating) ? 'font-medium text-clay-700' : 'text-ink-muted'
                )}
              >
                {rating} stars and up
              </button>
            </li>
          ))}
          {query.minRating && (
            <li>
              <button
                type="button"
                onClick={() => update('minRating', '')}
                className="text-sm text-ink-soft underline"
              >
                Clear rating
              </button>
            </li>
          )}
        </ul>
      </div>

      <div>
        <label className="flex items-center gap-2.5 text-sm text-ink-muted">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-sand text-clay-600 focus:ring-clay-400"
            checked={query.inStock === 'true'}
            onChange={(event) => update('inStock', event.target.checked ? 'true' : '')}
          />
          In stock only
        </label>
      </div>
    </div>
  );

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="mb-8">
        <h1 className="text-3xl text-ink sm:text-4xl">The marketplace</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {meta ? `${meta.total} handmade pieces from independent studios` : 'Loading the shelves...'}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="shop-search" className="sr-only">
            Search products
          </label>
          <input
            id="shop-search"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by product, maker or tag"
            className="field"
          />
        </div>

        <Button
          variant="secondary"
          className="lg:hidden"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
          {activeFilters.length > 0 && (
            <span className="rounded-full bg-clay-600 px-1.5 text-[11px] text-white">
              {activeFilters.length}
            </span>
          )}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-ink-muted">
            Sort
          </label>
          <Select
            id="sort"
            className="w-44"
            value={query.sort}
            onChange={(event) => update('sort', event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {activeFilters.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'q') setTerm('');
                update(key, '');
              }}
              className="badge bg-clay-100 text-clay-800 hover:bg-clay-200"
            >
              {key}: {params.get(key)}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-xs text-ink-soft underline">
            Clear all
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className={cn('lg:block', filtersOpen ? 'block' : 'hidden')} aria-label="Filters">
          <div className="card p-5 lg:sticky lg:top-24">{filterPanel}</div>
        </aside>

        <div>
          {products.loading ? (
            <ProductGridSkeleton count={9} />
          ) : products.error ? (
            <EmptyState
              icon={PackageSearch}
              title="We could not load the marketplace"
              description={products.error.message}
              action={
                <Button onClick={() => products.run()} variant="secondary">
                  Try again
                </Button>
              }
            />
          ) : list.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Nothing matched those filters"
              description="Try a broader search, a different category, or clear your filters to see everything."
              action={
                <Button onClick={clearAll} variant="secondary">
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
              <Pagination
                meta={meta}
                className="mt-10"
                onChange={(page) => {
                  update('page', String(page));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
