import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import Pagination from '../components/Pagination.jsx';
import catalogService from '../services/catalogService.js';
import useAsync from '../hooks/useAsync.js';
import useDebounce from '../hooks/useDebounce.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export default function Artisans() {
  useDocumentTitle('Artisans');
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const q = useDebounce(term, 350);

  const { data, loading } = useAsync(
    () => catalogService.listStores({ page, limit: 12, q }),
    [page, q]
  );
  const stores = data?.data || [];

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="text-3xl text-ink sm:text-4xl">Meet the makers</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Independent studios selling directly on Artisan&rsquo;s Corner.
      </p>

      <div className="mt-6 max-w-sm">
        <label htmlFor="artisan-search" className="sr-only">
          Search shops
        </label>
        <input
          id="artisan-search"
          type="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setPage(1);
          }}
          placeholder="Search by shop name"
          className="field"
        />
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No shops matched that search"
            description="Try a different name, or browse the full directory."
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <Link
                  key={store._id}
                  to={`/shop/${store.slug}`}
                  className="group overflow-hidden rounded-2xl border border-sand bg-white transition-shadow hover:shadow-lift"
                >
                  <img
                    src={store.banner}
                    alt=""
                    loading="lazy"
                    className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="p-5">
                    <h2 className="font-display text-lg text-ink">{store.name}</h2>
                    <p className="mt-1 text-xs text-ink-soft">
                      {[store.location?.city, store.location?.country].filter(Boolean).join(', ')}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm text-ink-muted">
                      {store.tagline || store.description}
                    </p>
                    <p className="mt-4 text-xs font-medium text-clay-700">
                      {store.productCount} piece{store.productCount === 1 ? '' : 's'} listed
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <Pagination meta={data?.meta} className="mt-10" onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
