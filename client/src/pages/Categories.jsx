import { Link } from 'react-router-dom';
import CoverImage from '../components/CoverImage.jsx';
import catalogService from '../services/catalogService.js';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export default function Categories() {
  useDocumentTitle('Categories');
  const { data, loading } = useAsync(() => catalogService.listCategories(), []);
  const categories = data?.data || [];

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="text-3xl text-ink sm:text-4xl">Browse by craft</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Every category is filled by working studios. Pick a craft to see what is currently listed.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[4/3] rounded-2xl" />
            ))
          : categories.map((category) => (
              <Link
                key={category.slug}
                to={`/shop?category=${category.slug}`}
                className="group overflow-hidden rounded-2xl border border-sand bg-white transition-shadow hover:shadow-lift"
              >
                <CoverImage
                  src={category.image}
                  label={category.name}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-4">
                  <h2 className="font-display text-base text-ink">{category.name}</h2>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{category.description}</p>
                  <p className="mt-2 text-xs font-medium text-clay-700">
                    {category.productCount} piece{category.productCount === 1 ? '' : 's'}
                  </p>
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}
