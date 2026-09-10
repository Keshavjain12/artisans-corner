import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  Clock,
  DollarSign,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { StatCardSkeleton } from '../../components/Skeletons.jsx';
import { OrdersBarChart, RevenueAreaChart } from '../../components/charts.jsx';
import { PageHeader } from '../../components/ui.jsx';
import vendorService from '../../services/vendorService.js';
import useAsync from '../../hooks/useAsync.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency } from '../../utils/format.js';

export default function SellerOverview() {
  useDocumentTitle('Seller overview');
  const { data, loading, error } = useAsync(() => vendorService.analytics('30d'), []);
  const analytics = data?.data;
  const totals = analytics?.totals;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Your shop over the last 30 days"
        action={
          <Link to="/dashboard/seller/products/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add product
          </Link>
        }
      />

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard
              label="Total sales"
              value={formatCurrency(totals?.revenue || 0)}
              hint="Merchandise value before fees"
              icon={TrendingUp}
            />
            <StatCard
              label="Net earnings"
              value={formatCurrency(totals?.netEarnings || 0)}
              hint={`After ${formatCurrency(totals?.platformFees || 0)} platform fee`}
              icon={DollarSign}
              tone="moss"
            />
            <StatCard
              label="Orders"
              value={totals?.orders ?? 0}
              hint={`${totals?.unitsSold ?? 0} units sold`}
              icon={ShoppingCart}
            />
            <StatCard
              label="Pending fulfilment"
              value={totals?.pendingOrders ?? 0}
              hint="Waiting to be shipped"
              icon={Clock}
              tone="sand"
            />
            <StatCard
              label="Products"
              value={totals?.productCount ?? 0}
              hint={`${totals?.activeProductCount ?? 0} live on the marketplace`}
              icon={Package}
              tone="sand"
            />
            <StatCard
              label="Average order"
              value={formatCurrency(totals?.averageOrderValue || 0)}
              hint="Across paid orders"
              icon={Boxes}
              tone="sand"
            />
          </>
        )}
      </div>

      {totals?.lowStockCount > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            {totals.lowStockCount} product{totals.lowStockCount === 1 ? ' is' : 's are'} down to three
            or fewer in stock.{' '}
            <Link to="/dashboard/seller/products" className="link-underline font-medium">
              Review inventory
            </Link>
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Sales over time</h2>
          {loading ? (
            <div className="skeleton mt-4 h-64 rounded-xl" />
          ) : totals?.revenue ? (
            <div className="mt-4">
              <RevenueAreaChart data={analytics.series} />
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              icon={TrendingUp}
              title="No sales in this period yet"
              description="Once an order is paid it will appear on this chart."
            />
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Orders per day</h2>
          {loading ? (
            <div className="skeleton mt-4 h-56 rounded-xl" />
          ) : (
            <div className="mt-4">
              <OrdersBarChart data={analytics?.series || []} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
