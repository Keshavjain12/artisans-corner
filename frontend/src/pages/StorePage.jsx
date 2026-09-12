import { Link, useParams } from 'react-router-dom';
import { MapPin, Store } from 'lucide-react';
import CoverImage from '../components/CoverImage.jsx';
import ProductCard from '../components/ProductCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ProductGridSkeleton } from '../components/Skeletons.jsx';
import catalogService from '../services/catalogService.js';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatDate } from '../utils/format.js';

export default function StorePage() {
  const { slug } = useParams();
  const { data, loading, error } = useAsync(() => catalogService.getStore(slug), [slug]);

  const store = data?.data?.store;
  const products = data?.data?.products || [];
  useDocumentTitle(store?.name);

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="mt-8">
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Store}
          title="Shop not found"
          description={error?.message || 'This studio may have closed or paused their shop.'}
          action={
            <Link to="/artisans" className="btn-primary">
              Browse all artisans
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-48 w-full overflow-hidden bg-sand sm:h-64">
        <CoverImage src={store.banner} label={store.name} className="h-full w-full object-cover" />
      </div>

      <div className="container-page">
        <div className="relative -mt-12 flex flex-wrap items-end gap-5 rounded-2xl border border-sand bg-white p-6 shadow-card">
          <CoverImage
            src={store.logo}
            label={store.name}
            className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-card"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl text-ink sm:text-3xl">{store.name}</h1>
            {store.tagline && <p className="mt-1 text-sm text-ink-muted">{store.tagline}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-soft">
              {(store.location?.city || store.location?.country) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {[store.location.city, store.location.state, store.location.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              )}
              <span>Selling since {formatDate(store.createdAt, { day: undefined })}</span>
              <span>{products.length} pieces listed</span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside>
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink">About the studio</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                {store.description}
              </p>
              {store.contactEmail && (
                <p className="mt-4 text-xs text-ink-soft">Contact: {store.contactEmail}</p>
              )}
            </div>
          </aside>

          <div>
            <h2 className="text-2xl text-ink">Pieces from {store.name}</h2>
            {products.length === 0 ? (
              <EmptyState
                className="mt-6"
                icon={Store}
                title="Nothing listed right now"
                description="This studio has not published any pieces yet. Check back soon."
              />
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={{ ...product, vendor: { name: store.name, slug: store.slug } }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
