import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingBag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import QuantityStepper from '../components/QuantityStepper.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Button } from '../components/ui.jsx';
import { paymentService } from '../services/orderService.js';
import { clearCart, removeItem, selectCartSubtotal, updateQuantity } from '../store/cartSlice.js';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatCurrency } from '../utils/format.js';

export default function Cart() {
  useDocumentTitle('Your cart');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart.items);
  const subtotal = useSelector(selectCartSubtotal);
  const user = useSelector((state) => state.auth.user);
  const [confirmClear, setConfirmClear] = useState(false);

  // Shipping and tax rules come from the server so this estimate matches the
  // authoritative total calculated at checkout.
  const config = useAsync(() => paymentService.config(), []);
  const rules = config.data?.data;

  const shipping =
    !rules || subtotal === 0 ? 0 : subtotal >= rules.freeShippingThreshold ? 0 : rules.shippingFlatRate;
  const tax = rules ? Math.round(subtotal * rules.taxRate * 100) / 100 : 0;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <h1 className="mb-8 text-3xl text-ink">Your cart</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Pieces you add stay here, even if you close the tab and come back later."
          action={
            <Link to="/shop" className="btn-primary">
              Browse the marketplace
            </Link>
          }
        />
      </div>
    );
  }

  const vendorCount = new Set(items.map((item) => item.vendorSlug || item.vendorName)).size;

  const lines = (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.productId} className="card flex gap-4 p-4">
          <Link
            to={`/product/${item.slug}`}
            className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-sand"
          >
            {item.image && (
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {item.vendorName && (
                  <p className="truncate text-xs uppercase tracking-wide text-ink-soft">
                    {item.vendorName}
                  </p>
                )}
                <h2 className="truncate font-display text-base text-ink">
                  <Link to={`/product/${item.slug}`} className="hover:text-clay-700">
                    {item.name}
                  </Link>
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">{formatCurrency(item.price)} each</p>
              </div>
              <p className="shrink-0 font-medium text-ink">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={item.quantity}
                max={item.stock}
                onChange={(quantity) =>
                  dispatch(updateQuantity({ productId: item.productId, quantity }))
                }
                label={`Quantity for ${item.name}`}
              />
              {item.stock <= item.quantity && (
                <span className="text-xs text-amber-700">Stock limit reached</span>
              )}
              <button
                type="button"
                onClick={() => {
                  dispatch(removeItem(item.productId));
                  toast.success('Removed from your cart');
                }}
                className="ml-auto inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl text-ink">Your cart</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {items.length} item{items.length === 1 ? '' : 's'}
            {vendorCount > 1 && ` from ${vendorCount} studios`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          className="text-sm text-ink-soft underline hover:text-red-600"
        >
          Clear cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {lines}

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-ink">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="text-ink">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="text-ink">{shipping === 0 ? 'Free' : formatCurrency(shipping)}</dd>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Tax</dt>
                  <dd className="text-ink">{formatCurrency(tax)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-sand pt-3 text-base">
                <dt className="font-medium text-ink">Total</dt>
                <dd className="font-semibold text-ink">{formatCurrency(total)}</dd>
              </div>
            </dl>

            {rules && subtotal < rules.freeShippingThreshold && (
              <p className="mt-3 rounded-xl bg-clay-50 px-3 py-2 text-xs text-clay-800">
                Add {formatCurrency(rules.freeShippingThreshold - subtotal)} more for free shipping.
              </p>
            )}

            <Button
              className="mt-5 w-full py-3"
              onClick={() => navigate(user ? '/checkout' : '/login?redirect=/checkout')}
            >
              {user ? 'Continue to checkout' : 'Sign in to check out'}
            </Button>

            <p className="mt-3 text-center text-xs text-ink-soft">
              Totals are recalculated on our server before any payment is taken.
            </p>
          </div>

          <Link to="/shop" className="btn-ghost mt-3 w-full">
            Continue shopping
          </Link>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Empty your cart?"
        description="This removes every item. You can always add them again from the marketplace."
        confirmLabel="Clear cart"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          dispatch(clearCart());
          setConfirmClear(false);
          toast.success('Cart cleared');
        }}
      />
    </div>
  );
}
