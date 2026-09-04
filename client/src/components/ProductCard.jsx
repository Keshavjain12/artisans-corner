import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import StarRating from './StarRating.jsx';
import { addItem } from '../store/cartSlice.js';
import { formatCurrency } from '../utils/format.js';
import cn from '../utils/cn.js';

function ProductCardBase({ product, className }) {
  const dispatch = useDispatch();
  const outOfStock = product.stock <= 0;
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;

  const handleAdd = (event) => {
    event.preventDefault();
    dispatch(addItem(product, 1));
    toast.success(`${product.name} added to your cart`);
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-sand bg-white transition-shadow duration-300 hover:shadow-lift',
        className
      )}
    >
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-sand"
      >
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.images[0].alt || product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-soft">
            No image yet
          </div>
        )}

        {onSale && !outOfStock && (
          <span className="badge absolute left-3 top-3 bg-clay-600 text-white">Sale</span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-medium text-ink">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.vendor?.name && (
          <Link
            to={`/shop/${product.vendor.slug}`}
            className="text-xs uppercase tracking-wide text-ink-soft hover:text-clay-600"
          >
            {product.vendor.name}
          </Link>
        )}

        <h3 className="font-display text-[15px] leading-snug text-ink">
          <Link to={`/product/${product.slug}`} className="hover:text-clay-700">
            {product.name}
          </Link>
        </h3>

        <StarRating value={product.ratingAverage} count={product.reviewCount} size="sm" />

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="flex items-baseline gap-2">
            <span className="font-medium text-ink">{formatCurrency(product.price)}</span>
            {onSale && (
              <span className="text-xs text-ink-soft line-through">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
          </p>

          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={`Add ${product.name} to cart`}
            className="rounded-xl border border-clay-200 p-2 text-clay-700 transition-colors hover:border-clay-500 hover:bg-clay-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);
export default ProductCard;
