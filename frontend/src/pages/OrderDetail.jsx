import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';
import { Badge, Button, Spinner } from '../components/ui.jsx';
import orderService from '../services/orderService.js';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatCurrency, formatDate, titleCase } from '../utils/format.js';
import { STATUS_STYLES } from '../utils/constants.js';

export default function OrderDetail() {
  const { id } = useParams();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { data, loading, error, run } = useAsync(() => orderService.getOrder(id), [id]);

  const order = data?.data?.order;
  useDocumentTitle(order ? `Order ${order.orderNumber}` : 'Order');

  if (loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading order" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Package}
          title="Order not found"
          description={error?.message || 'This order may belong to another account.'}
          action={
            <Link to="/orders" className="btn-primary">
              Back to my orders
            </Link>
          }
        />
      </div>
    );
  }

  const cancellable = !['shipped', 'delivered', 'cancelled'].includes(order.orderStatus);

  const cancel = async () => {
    setCancelling(true);
    try {
      await orderService.cancelOrder(order._id);
      toast.success('Order cancelled');
      setConfirmCancel(false);
      await run();
    } catch (cancelError) {
      toast.error(cancelError.message);
    } finally {
      setCancelling(false);
    }
  };

  const itemList = (
    <div className="card divide-y divide-sand">
      {order.items.map((item) => (
        <div key={item._id} className="flex flex-wrap gap-4 p-4">
          <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sand">
            {item.imageSnapshot && (
              <img src={item.imageSnapshot} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to={`/product/${item.productSlugSnapshot}`}
              className="text-sm font-medium text-ink hover:text-clay-700"
            >
              {item.productNameSnapshot}
            </Link>
            <p className="mt-0.5 text-xs text-ink-soft">{item.vendorNameSnapshot}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {item.quantity} x {formatCurrency(item.priceSnapshot)} (price at purchase)
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_STYLES[item.fulfillmentStatus]}>
                {titleCase(item.fulfillmentStatus)}
              </Badge>
              {item.trackingNumber && (
                <span className="text-xs text-ink-soft">Tracking {item.trackingNumber}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{formatCurrency(item.subtotal)}</p>
            {order.paymentStatus === 'paid' && !item.reviewed && (
              <Link
                to={`/product/${item.productSlugSnapshot}`}
                className="mt-2 inline-block text-xs text-clay-700 underline"
              >
                Write a review
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container-page py-10 lg:py-14">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-clay-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-ink">{order.orderNumber}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Placed {formatDate(order.createdAt)}
            {order.paidAt ? ` - paid ${formatDate(order.paidAt)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_STYLES[order.orderStatus]}>
            {titleCase(order.orderStatus.replace('_', '-'))}
          </Badge>
          <Badge tone={STATUS_STYLES[order.paymentStatus]}>{titleCase(order.paymentStatus)}</Badge>
        </div>
      </div>

      <div className="card mt-8 p-6">
        <OrderTimeline status={order.orderStatus} history={order.statusHistory} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {itemList}

        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink">Payment summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
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
              <div className="flex justify-between border-t border-sand pt-2 text-base">
                <dt className="font-medium text-ink">Total</dt>
                <dd className="font-semibold text-ink">{formatCurrency(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink">Shipping address</h2>
            <address className="mt-2 text-sm not-italic leading-relaxed text-ink-muted">
              {order.shippingAddress.fullName}
              <br />
              {order.shippingAddress.addressLine1}
              <br />
              {order.shippingAddress.addressLine2 && (
                <>
                  {order.shippingAddress.addressLine2}
                  <br />
                </>
              )}
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
              <br />
              {order.shippingAddress.phone}
            </address>
          </div>

          {cancellable && (
            <Button variant="secondary" className="w-full" onClick={() => setConfirmCancel(true)}>
              Cancel this order
            </Button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        description="The makers will be notified and any reserved stock is returned to their shop."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        loading={cancelling}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={cancel}
      />
    </div>
  );
}
