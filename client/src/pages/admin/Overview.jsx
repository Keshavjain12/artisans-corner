import { useState } from 'react';
import { DollarSign, Package, ShoppingCart, Store, TrendingUp, Users } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import StatCard from '../../components/StatCard.jsx';
import { StatCardSkeleton } from '../../components/Skeletons.jsx';
import { CategoryPieChart, RevenueAreaChart } from '../../components/charts.jsx';
import { PageHeader } from '../../components/ui.jsx';
import adminService from '../../services/adminService.js';
import useAsync from '../../hooks/useAsync.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { ANALYTICS_RANGES } from '../../utils/constants.js';
import { formatCurrency, titleCase } from '../../utils/format.js';
import cn from '../../utils/cn.js';

export default function AdminOverview() {
  useDocumentTitle('Admin overview');
  const [range, setRange] = useState('30d');
  const { data, loading, error } = useAsync(() => adminService.analytics(range), [range]);

  const analytics = data?.data;
  const totals = analytics?.totals;

  return (
    <div>
      <PageHeader
        title="Marketplace overview"
        subtitle="Platform health, gross sales and commission revenue."
        action={
          <div className="flex gap-1.5" role="group" aria-label="Date range">
            {ANALYTICS_RANGES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                aria-pressed={range === option.value}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm transition-colors',
                  range === option.value
                    ? 'bg-clay-600 font-medium text-white'
                    : 'border border-sand bg-white text-ink-muted hover:border-clay-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard
              label="Gross sales"
              value={formatCurrency(totals?.grossSales || 0)}
              hint="In selected range"
              icon={TrendingUp}
            />
            <StatCard
              label="Platform revenue"
              value={formatCurrency(totals?.platformRevenue || 0)}
              hint="5% commission"
              icon={DollarSign}
              tone="moss"
            />
            <StatCard
              label="Paid to vendors"
              value={formatCurrency(totals?.vendorEarnings || 0)}
              icon={Store}
              tone="sand"
            />
            <StatCard
              label="Average order"
              value={formatCurrency(totals?.averageOrderValue || 0)}
              icon={ShoppingCart}
              tone="sand"
            />
            <StatCard label="Total users" value={totals?.totalUsers ?? 0} icon={Users} />
            <StatCard
              label="Vendors"
              value={totals?.totalVendors ?? 0}
              hint={`${totals?.activeStores ?? 0} active stores`}
              icon={Store}
            />
            <StatCard
              label="Products"
              value={totals?.totalProducts ?? 0}
              hint={`${totals?.activeProducts ?? 0} live`}
              icon={Package}
            />
            <StatCard
              label="Paid orders"
              value={totals?.totalOrders ?? 0}
              hint="All time"
              icon={ShoppingCart}
            />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Gross sales over time</h2>
          {loading ? (
            <div className="skeleton mt-4 h-72 rounded-xl" />
          ) : totals?.grossSales ? (
            <div className="mt-4">
              <RevenueAreaChart data={analytics.series} height={300} label="Gross sales" />
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              icon={TrendingUp}
              title="No paid orders in this range"
              description="Seed the database or complete a checkout to populate this chart."
            />
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Sales by category</h2>
          {analytics?.categoryBreakdown?.length ? (
            <div className="mt-4">
              <CategoryPieChart
                data={analytics.categoryBreakdown.map((row) => ({
                  ...row,
                  category: titleCase(row.category),
                }))}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">No category data for this range.</p>
          )}
        </div>
      </div>

      {analytics?.topStores?.length > 0 && (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="p-4 text-left text-sm font-semibold text-ink">
              Top performing shops
            </caption>
            <thead className="border-y border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="p-4 font-medium">Shop</th>
                <th scope="col" className="p-4 font-medium">Units</th>
                <th scope="col" className="p-4 font-medium">Sales</th>
                <th scope="col" className="p-4 font-medium">Platform fees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {analytics.topStores.map((store) => (
                <tr key={store.storeId}>
                  <td className="p-4 font-medium text-ink">{store.name}</td>
                  <td className="p-4 text-ink-muted">{store.units}</td>
                  <td className="p-4 text-ink">{formatCurrency(store.revenue)}</td>
                  <td className="p-4 text-moss-700">{formatCurrency(store.platformFees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
