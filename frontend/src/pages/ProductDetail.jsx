import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowLeft, Package, ShieldCheck, ShoppingBag, Store, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductCard from '../components/ProductCard.jsx';
import QuantityStepper from '../components/QuantityStepper.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import StarRating from '../components/StarRating.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Button } from '../components/ui.jsx';
import catalogService from '../services/catalogService.js';
import { addItem } from '../store/cartSlice.js';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatCurrency, titleCase } from '../utils/format.js';
import cn from '../utils/cn.js';

export default function ProductDetail() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const { data, loading, error, setData } = useAsync(
    () => catalogService.getProduct(slug),
    [slug]
  );

  const product = data?.data?.product;
  const related = data?.data?.related || [];
  useDocumentTitle(product?.name);

  useEffect(() => {
    setActiveImage(0);
    setQuantity(1);
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page grid gap-10 py-12 lg:grid-cols-2">
        <div className="skeleton aspect-square rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-4 w-1/4 rounded" />
          <div className="skeleton h-9 w-3/4 rounded" />
          <div className="skeleton h-5 w-1/3 rounded" />
          <div className="skeleton h-28 w-full rounded" />
          <div className="skeleton h-12 w-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={Package}
          title="We could not find that piece"
          description={error?.message || 'It may have sold out or been taken down by the maker.'}
          action={
            <Link to="/shop" className="btn-primary">
              Back to the marketplace
            </Link>
          }
        />
      </div>
    );
  }

  const outOfStock = product.stock <= 0;
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;

  const addToCart = () => {
    dispatch(addItem(product, quantity));
    toast.success(`${product.name} added to your cart`);
  };

  const buyNow = () => {
    dispatch(addItem(product, quantity));
    navigate('/checkout');
  };

  const applyRatingUpdate = (stats) => {
    setData({
      ...data,
      data: {
        ...data.data,
        product: {
          ...product,
          ratingAverage: stats.ratingAverage,
          reviewCount: stats.reviewCount,
        },
      },
    });
  };

  return (
    <div className="container-page py-8 lg:py-12">
      <nav className="mb-6 flex items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
        <Link to="/shop" className="inline-flex items-center gap-1.5 hover:text-clay-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Marketplace
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/shop?category=${product.category}`} className="hover:text-clay-700">
          {titleCase(product.category)}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-2xl border border-sand bg-white">
            {product.images?.length ? (
              <img
                src={(product.images[activeImage] || product.images[0]).url}
                alt={(product.images[activeImage] || product.images[0]).alt || product.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-sand text-sm text-ink-soft">
                No image provided
              </div>
            )}
          </div>

          {product.images?.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {product.images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1} of ${product.images.length}`}
                  aria-current={index === activeImage}
                  className={cn(
                    'h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors',
                    index === activeImage ? 'border-clay-500' : 'border-sand hover:border-clay-300'
                  )}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.vendor && (
            <Link
              to={`/shop/${product.vendor.slug}`}
              className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-clay-700"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              {product.vendor.name}
            </Link>
          )}

          <h1 className="mt-3 text-3xl leading-tight text-ink sm:text-4xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <StarRating value={product.ratingAverage} count={product.reviewCount} />
            <span className="text-sm text-ink-soft">
              {product.unitsSold > 0 ? `${product.unitsSold} sold` : 'New listing'}
            </span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-3xl text-ink">{formatCurrency(product.price)}</span>
            {onSale && (
              <span className="text-base text-ink-soft line-through">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
            {onSale && (
              <span className="badge bg-clay-100 text-clay-800">
                Save {formatCurrency(product.compareAtPrice - product.price)}
              </span>
            )}
          </div>

          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            {product.description}
          </p>

          <div className="mt-6" aria-live="polite">
            {outOfStock ? (
              <span className="badge bg-red-50 text-red-700">Out of stock</span>
            ) : product.stock <= 3 ? (
              <span className="badge bg-amber-50 text-amber-700">
                Only {product.stock} left - made in small batches
              </span>
            ) : (
              <span className="badge bg-moss-100 text-moss-700">In stock, ready to ship</span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} max={product.stock} onChange={setQuantity} />
            <Button onClick={addToCart} disabled={outOfStock} className="px-6 py-3">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Add to cart
            </Button>
            <Button
              onClick={buyNow}
              disabled={outOfStock}
              variant="secondary"
              className="px-6 py-3"
            >
              Buy now
            </Button>
          </div>

          <dl className="mt-8 divide-y divide-sand border-y border-sand text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-ink-muted">Category</dt>
              <dd className="text-ink">{titleCase(product.category)}</dd>
            </div>
            {product.sku && (
              <div className="flex justify-between py-3">
                <dt className="text-ink-muted">SKU</dt>
                <dd className="text-ink">{product.sku}</dd>
              </div>
            )}
            {product.tags?.length > 0 && (
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-ink-muted">Tags</dt>
                <dd className="flex flex-wrap justify-end gap-1.5">
                  {product.tags.map((tag) => (
                    <Link key={tag} to={`/shop?tag=${tag}`} className="badge bg-sand text-ink-muted">
                      {tag}
                    </Link>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-clay-50/70 p-4">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-clay-600" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-ink-muted">
                Flat $5 shipping, free over $75. Makers dispatch within 2-4 working days.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-clay-50/70 p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-clay-600" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-ink-muted">
                Secure Stripe checkout. 95% of this sale goes directly to the studio.
              </p>
            </div>
          </div>

          {product.vendor && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-sand bg-white p-4">
              {product.vendor.logo && (
                <img
                  src={product.vendor.logo}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{product.vendor.name}</p>
                <p className="truncate text-xs text-ink-soft">
                  {[product.vendor.location?.city, product.vendor.location?.country]
                    .filter(Boolean)
                    .join(', ') || 'Independent studio'}
                </p>
              </div>
              <Link to={`/shop/${product.vendor.slug}`} className="btn-secondary ml-auto shrink-0">
                Visit shop
              </Link>
            </div>
          )}
        </div>
      </div>

      <ReviewSection product={product} onRatingChange={applyRatingUpdate} />

      {related.length > 0 && (
        <section className="mt-16 border-t border-sand pt-12">
          <h2 className="text-2xl text-ink">You might also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
