import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import { TableSkeleton } from '../../components/Skeletons.jsx';
import { Badge, Button, PageHeader, Select } from '../../components/ui.jsx';
import vendorService from '../../services/vendorService.js';
import orderService from '../../services/orderService.js';
import useAsync from '../../hooks/useAsync.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';
import { STATUS_STYLES } from '../../utils/constants.js';

const NEXT_STATUS = { processing: 'confirmed', confirmed: 'shipped', shipped: 'delivered' };
const FILTERS = ['', 'processing', 'confirmed', 'shipped', 'delivered'];

function OrderCard({ order, updating, onAdvance }) {
  const itemStatus = order.items[0]?.fulfillmentStatus || 'processing';
  const next = NEXT_STATUS[itemStatus];

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink">{order.orderNumber}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatDate(order.createdAt)} - {order.buyer?.name}
          </p>
        </div>
        <Badge tone={STATUS_STYLES[itemStatus]}>{titleCase(itemStatus)}</Badge>
      </div>

      <ul className="mt-4 space-y-2.5">
        {order.items.map((item) => (
          <li key={item._id} className="flex items-center gap-3">
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-sand">
              {item.imageSnapshot && (
                <img src={item.imageSnapshot} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{item.productNameSnapshot}</span>
              <span className="block text-xs text-ink-soft">
                {item.quantity} x {formatCurrency(item.priceSnapshot)}
              </span>
            </span>
            <span className="text-sm text-ink">{formatCurrency(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-4 border-t border-sand pt-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Ship to</h3>
          <address className="mt-1.5 text-sm not-italic leading-relaxed text-ink-muted">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.addressLine1}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
            {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.country} - {order.shippingAddress.phone}
          </address>
        </div>

        <div className="sm:text-right">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between sm:justify-end sm:gap-6">
              <dt className="text-ink-muted">Your sales</dt>
              <dd className="text-ink">{formatCurrency(order.vendorTotals.subtotal)}</dd>
            </div>
            <div className="flex justify-between sm:justify-end sm:gap-6">
              <dt className="text-ink-muted">Platform fee</dt>
              <dd className="text-ink">-{formatCurrency(order.vendorTotals.platformFee)}</dd>
            </div>
            <div className="flex justify-between font-medium sm:justify-end sm:gap-6">
              <dt className="text-ink">You earn</dt>
              <dd className="text-moss-700">
                {formatCurrency(order.vendorTotals.vendorEarnings)}
              </dd>
            </div>
          </dl>

          {next && (
            <Button className="mt-3" size="sm" loading={updating} onClick={() => onAdvance(next)}>
              Mark {next}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function SellerOrders() {
  useDocumentTitle('Store orders');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [updating, setUpdating] = useState(null);

  const { data, loading, error, run } = useAsync(
    () => vendorService.orders({ page, limit: 10, status }),
    [page, status]
  );
  const orders = data?.data || [];

  const advance = async (order, next) => {
    setUpdating(order.id);
    try {
      await orderService.updateStatus(order.id, { status: next });
      toast.success(`Order marked ${next}`);
      await run();
    } catch (updateError) {
      toast.error(updateError.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Orders containing your products - you only ever see your own lines."
        action={
          <Select
            className="w-44"
            value={status}
            aria-label="Filter by fulfilment status"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {FILTERS.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? titleCase(value) : 'All statuses'}
              </option>
            ))}
          </Select>
        }
      />

      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="When someone buys one of your pieces the order appears here, with the address you need to ship it."
          />
        ) : (
          <>
            <ul className="space-y-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  updating={updating === order.id}
                  onAdvance={(next) => advance(order, next)}
                />
              ))}
            </ul>
            <Pagination meta={data?.meta} className="mt-8" onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
