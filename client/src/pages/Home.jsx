import { Link } from 'react-router-dom';
import { ArrowRight, Award, HeartHandshake, PackageCheck, Sparkles } from 'lucide-react';
import CoverImage from '../components/CoverImage.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/Skeletons.jsx';
import catalogService from '../services/catalogService.js';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatCurrency } from '../utils/format.js';

const PROMISES = [
  {
    icon: HeartHandshake,
    title: 'Made by a person, not a factory',
    body: 'Every listing is created by the maker themselves. You can read their story and message the studio that made your piece.',
  },
  {
    icon: Award,
    title: '95% goes to the maker',
    body: 'We keep a flat 5% to run the marketplace. No listing fees, no ad auctions, no hidden cuts.',
  },
  {
    icon: PackageCheck,
    title: 'Verified reviews only',
    body: 'Reviews can only be written by someone who actually bought and received the piece.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'The vase arrived wrapped in newspaper from the studio with a handwritten note. It has become the thing people ask about when they visit.',
    name: 'Elena M.',
    detail: 'Bought a hand-painted vase',
  },
  {
    quote:
      'I have replaced almost all our mass-produced kitchen things with pieces from three makers here. Everything has held up beautifully.',
    name: 'Josh R.',
    detail: 'Regular buyer since 2024',
  },
  {
    quote:
      'As a seller the dashboard is the clearest I have used. I can see exactly what I earned on every order, fees included.',
    name: 'Ines F.',
    detail: 'Kiln & Coast, Lisbon',
  },
];

export default function Home() {
  useDocumentTitle('Handmade, direct from the maker');

  const featured = useAsync(() => catalogService.listProducts({ featured: 'true', limit: 8 }), []);
  const trending = useAsync(
    () => catalogService.listProducts({ sort: 'best-selling', limit: 4 }),
    []
  );
  const categories = useAsync(() => catalogService.listCategories(), []);
  const stores = useAsync(() => catalogService.listStores({ limit: 4 }), []);

  return (
    <>
      <section className="relative overflow-hidden border-b border-sand bg-clay-50/60">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="badge bg-white text-clay-700 shadow-card">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Six studios. Thirty pieces. All handmade.
            </span>
            <h1 className="mt-5 text-4xl leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
              Things made slowly,
              <br />
              by people you can name.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted">
              Artisan&rsquo;s Corner is a marketplace for independent makers - potters, weavers,
              silversmiths and printmakers - selling directly to the people who will live with their
              work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary px-6 py-3">
                Browse the marketplace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/become-a-seller" className="btn-secondary px-6 py-3">
                Open your own shop
              </Link>
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-4">
            {(featured.data?.data || []).slice(0, 4).map((product, index) => (
              <Link
                key={product._id}
                to={`/product/${product.slug}`}
                className={`overflow-hidden rounded-2xl border border-sand bg-white shadow-card transition-transform duration-300 hover:-translate-y-1 ${
                  index % 2 === 1 ? 'mt-8' : ''
                }`}
              >
                <img
                  src={product.images?.[0]?.url}
                  alt={product.name}
                  className="aspect-[4/5] w-full object-cover"
                  loading={index < 2 ? 'eager' : 'lazy'}
                />
                <div className="p-3">
                  <p className="truncate text-xs text-ink-soft">{product.vendor?.name}</p>
                  <p className="truncate text-sm text-ink">{product.name}</p>
                  <p className="text-sm font-medium text-clay-700">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </Link>
            ))}
            {featured.loading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={`skeleton aspect-[4/5] rounded-2xl ${index % 2 === 1 ? 'mt-8' : ''}`}
                />
              ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl text-ink sm:text-3xl">Browse by craft</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Ten categories, each one filled by working studios.
            </p>
          </div>
          <Link to="/categories" className="btn-ghost hidden sm:inline-flex">
            All categories
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(categories.data?.data || []).slice(0, 5).map((category) => (
            <Link
              key={category.slug}
              to={`/shop?category=${category.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-sand bg-white"
            >
              <CoverImage
                src={category.image}
                label={category.name}
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="p-3.5">
                <h3 className="text-sm font-medium text-ink">{category.name}</h3>
                <p className="text-xs text-ink-soft">{category.productCount} pieces</p>
              </div>
            </Link>
          ))}
          {categories.loading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[4/3] rounded-2xl" />
            ))}
        </div>
      </section>

      <section className="container-page py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl text-ink sm:text-3xl">Featured this week</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Picked by us, made by them - limited runs and one-off pieces.
            </p>
          </div>
          <Link to="/shop" className="btn-ghost hidden sm:inline-flex">
            Shop all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8">
          {featured.loading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {(featured.data?.data || []).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-sand bg-white py-16">
        <div className="container-page">
          <h2 className="text-2xl text-ink sm:text-3xl">Why shop handmade?</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="rounded-2xl bg-clay-50/60 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-clay-600 shadow-card">
                  <promise.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{promise.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{promise.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl text-ink sm:text-3xl">Popular artisans</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Independent studios currently selling on the marketplace.
            </p>
          </div>
          <Link to="/artisans" className="btn-ghost hidden sm:inline-flex">
            Meet them all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(stores.data?.data || []).map((store) => (
            <Link
              key={store._id}
              to={`/shop/${store.slug}`}
              className="group overflow-hidden rounded-2xl border border-sand bg-white transition-shadow hover:shadow-lift"
            >
              <CoverImage
                src={store.banner}
                label={store.name}
                className="h-28 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="p-4">
                <h3 className="font-display text-base text-ink">{store.name}</h3>
                <p className="mt-1 text-xs text-ink-soft">
                  {[store.location?.city, store.location?.country].filter(Boolean).join(', ')}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{store.tagline}</p>
                <p className="mt-3 text-xs font-medium text-clay-700">
                  {store.productCount} pieces listed
                </p>
              </div>
            </Link>
          ))}
          {stores.loading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-64 rounded-2xl" />
            ))}
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="rounded-2xl border border-sand bg-white p-8 sm:p-12">
          <h2 className="text-2xl text-ink sm:text-3xl">What buyers say</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <figure key={testimonial.name} className="rounded-2xl bg-clay-50/60 p-6">
                <blockquote className="text-sm leading-relaxed text-ink">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-xs text-ink-soft">
                  <span className="font-medium text-ink">{testimonial.name}</span>
                  {' - '}
                  {testimonial.detail}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {(trending.data?.data || []).length > 0 && (
        <section className="container-page pb-20">
          <h2 className="text-2xl text-ink sm:text-3xl">Trending right now</h2>
          <p className="mt-1.5 text-sm text-ink-muted">The pieces selling fastest this month.</p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {trending.data.data.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-sand bg-clay-600 py-16 text-white">
        <div className="container-page flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl text-white sm:text-3xl">Do you make things by hand?</h2>
            <p className="mt-2 max-w-xl text-sm text-clay-100">
              Set up a shop in a few minutes, list your work, and keep 95% of every sale. No listing
              fees and no monthly subscription.
            </p>
          </div>
          <Link
            to="/become-a-seller"
            className="btn bg-white px-6 py-3 text-clay-700 hover:bg-clay-50"
          >
            Start selling
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
