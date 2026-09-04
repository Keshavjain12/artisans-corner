import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import { TableSkeleton } from '../../components/Skeletons.jsx';
import { Badge, PageHeader, Select } from '../../components/ui.jsx';
import adminService from '../../services/adminService.js';
import useAsync from '../../hooks/useAsync.js';
import useDebounce from '../../hooks/useDebounce.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';
import { STATUS_STYLES } from '../../utils/constants.js';

const STATUSES = ['', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  useDocumentTitle('Orders');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const q = useDebounce(term, 350);

  const { data, loading, error } = useAsync(
    () => adminService.orders({ page, limit: 20, status, q }),
    [page, status, q]
  );
  const orders = data?.data || [];

  return (
    <div>
      <PageHeader title="Orders" subtitle="Every paid order across the marketplace." />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            type="search"
            className="field"
            placeholder="Search by order number"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="w-44"
          value={status}
          aria-label="Filter by status"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {STATUSES.map((value) => (
            <option key={value || 'all'} value={value}>
              {value ? titleCase(value) : 'All statuses'}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders found"
            description="Once buyers complete checkout their orders appear here."
          />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="p-4 font-medium">Order</th>
                    <th scope="col" className="p-4 font-medium">Buyer</th>
                    <th scope="col" className="p-4 font-medium">Date</th>
                    <th scope="col" className="p-4 font-medium">Items</th>
                    <th scope="col" className="p-4 font-medium">Total</th>
                    <th scope="col" className="p-4 font-medium">Platform fee</th>
                    <th scope="col" className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-clay-50/40">
                      <td className="p-4">
                        <Link
                          to={`/orders/${order._id}`}
                          className="font-medium text-ink hover:text-clay-700"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="p-4 text-ink-muted">
                        <p>{order.buyer?.name}</p>
                        <p className="text-xs text-ink-soft">{order.buyer?.email}</p>
                      </td>
                      <td className="p-4 text-ink-muted">{formatDate(order.createdAt)}</td>
                      <td className="p-4 text-ink-muted">{order.items.length}</td>
                      <td className="p-4 text-ink">{formatCurrency(order.total)}</td>
                      <td className="p-4 text-moss-700">{formatCurrency(order.platformFee)}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone={STATUS_STYLES[order.orderStatus]}>
                            {titleCase(order.orderStatus.replace('_', '-'))}
                          </Badge>
                          <Badge tone={STATUS_STYLES[order.paymentStatus]}>
                            {titleCase(order.paymentStatus)}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination meta={data?.meta} className="mt-8" onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
