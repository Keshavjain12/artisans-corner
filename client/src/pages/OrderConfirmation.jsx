import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Package } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import { Spinner } from '../components/ui.jsx';
import orderService from '../services/orderService.js';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function OrderConfirmation() {
  const { id } = useParams();
  useDocumentTitle('Order confirmed');

  const { data, loading, error } = useAsync(() => orderService.getOrder(id), [id]);
  const order = data?.data?.order;

  if (loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading your order" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Package}
          title="We could not load that order"
          description={error?.message || 'Check your orders page for the latest status.'}
          action={
            <Link to="/orders" className="btn-primary">
              View my orders
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-moss-100 text-moss-700">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl text-ink">Thank you - your order is confirmed</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Order <span className="font-medium text-ink">{order.orderNumber}</span> was placed on{' '}
          {formatDate(order.createdAt)}. Each maker has been notified and will begin packing.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl">
        <div className="card divide-y divide-sand">
          {order.items.map((item) => (
            <div key={item._id} className="flex gap-4 p-4">
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                {item.imageSnapshot && (
                  <img src={item.imageSnapshot} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{item.productNameSnapshot}</p>
                <p className="truncate text-xs text-ink-soft">{item.vendorNameSnapshot}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {item.quantity} x {formatCurrency(item.priceSnapshot)}
                </p>
              </div>
              <p className="text-sm font-medium text-ink">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}

          <dl className="space-y-2.5 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="text-ink">{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Shipping</dt>
              <dd className="text-ink">
                {order.shippingCost === 0 ? 'Free' : formatCurrency(order.shippingCost)}
              </dd>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Tax</dt>
                <dd className="text-ink">{formatCurrency(order.tax)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-sand pt-2.5 text-base">
              <dt className="font-medium text-ink">Total paid</dt>
              <dd className="font-semibold text-ink">{formatCurrency(order.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="card mt-5 p-5">
          <h2 className="text-sm font-semibold text-ink">Shipping to</h2>
          <address className="mt-2 text-sm not-italic leading-relaxed text-ink-muted">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.addressLine2 && (
              <>
                <br />
                {order.shippingAddress.addressLine2}
              </>
            )}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
            {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.country}
          </address>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={`/orders/${order._id}`} className="btn-primary">
            Track this order
          </Link>
          <Link to="/shop" className="btn-secondary">
            Keep browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
