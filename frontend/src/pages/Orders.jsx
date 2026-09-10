import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import Pagination from '../components/Pagination.jsx';
import { Badge } from '../components/ui.jsx';
import orderService from '../services/orderService.js';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatCurrency, formatDate, titleCase } from '../utils/format.js';
import { STATUS_STYLES } from '../utils/constants.js';
import { useState } from 'react';

export default function Orders() {
  useDocumentTitle('My orders');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAsync(() => orderService.myOrders({ page, limit: 8 }), [page]);

  const orders = data?.data || [];

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="text-3xl text-ink">My orders</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Every purchase you have made, with its current status.
      </p>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <EmptyState icon={Package} title="We could not load your orders" description={error.message} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you buy something from a maker it will appear here, with tracking and the option to leave a review."
            action={
              <Link to="/shop" className="btn-primary">
                Find something handmade
              </Link>
            }
          />
        ) : (
          <>
            <ul className="space-y-4">
              {orders.map((order) => (
                <li key={order._id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-ink">{order.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        Placed {formatDate(order.createdAt)} &middot;{' '}
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_STYLES[order.orderStatus]}>
                        {titleCase(order.orderStatus.replace('_', '-'))}
                      </Badge>
                      <Badge tone={STATUS_STYLES[order.paymentStatus]}>
                        {titleCase(order.paymentStatus)}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {order.items.slice(0, 4).map((item) => (
                      <span
                        key={item._id}
                        className="h-12 w-12 overflow-hidden rounded-xl bg-sand"
                        title={item.productNameSnapshot}
                      >
                        {item.imageSnapshot && (
                          <img src={item.imageSnapshot} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                    ))}
                    {order.items.length > 4 && (
                      <span className="text-xs text-ink-soft">+{order.items.length - 4} more</span>
                    )}

                    <div className="ml-auto flex items-center gap-4">
                      <span className="font-medium text-ink">{formatCurrency(order.total)}</span>
                      <Link to={`/orders/${order._id}`} className="btn-secondary">
                        View order
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <Pagination meta={data?.meta} className="mt-8" onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
