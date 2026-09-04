import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import StatCard from '../../components/StatCard.jsx';
import { StatCardSkeleton } from '../../components/Skeletons.jsx';
import { OrdersBarChart, RevenueAreaChart, TopProductsChart } from '../../components/charts.jsx';
import { PageHeader } from '../../components/ui.jsx';
import vendorService from '../../services/vendorService.js';
import useAsync from '../../hooks/useAsync.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { ANALYTICS_RANGES } from '../../utils/constants.js';
import { formatCurrency } from '../../utils/format.js';
import cn from '../../utils/cn.js';

export default function SellerAnalytics() {
  useDocumentTitle('Analytics');
  const [range, setRange] = useState('30d');
  const { data, loading, error } = useAsync(() => vendorService.analytics(range), [range]);

  const analytics = data?.data;
  const totals = analytics?.totals;
  const hasSales = (totals?.revenue || 0) > 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Calculated live from your paid orders."
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard label="Total revenue" value={formatCurrency(totals?.revenue || 0)} />
            <StatCard label="Platform fees" value={`-${formatCurrency(totals?.platformFees || 0)}`} />
            <StatCard
              label="Net earnings"
              value={formatCurrency(totals?.netEarnings || 0)}
              tone="moss"
            />
            <StatCard label="Orders" value={totals?.orders ?? 0} tone="sand" />
            <StatCard label="Units sold" value={totals?.unitsSold ?? 0} tone="sand" />
            <StatCard
              label="Average order value"
              value={formatCurrency(totals?.averageOrderValue || 0)}
              tone="sand"
            />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Revenue</h2>
          {loading ? (
            <div className="skeleton mt-4 h-64 rounded-xl" />
          ) : hasSales ? (
            <div className="mt-4">
              <RevenueAreaChart data={analytics.series} height={300} />
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              icon={BarChart3}
              title="No sales in this range"
              description="Try a longer date range, or share your shop link to get your first order."
            />
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Orders per day</h2>
          <div className="mt-4">
            <OrdersBarChart data={analytics?.series || []} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Best sellers</h2>
          {analytics?.topProducts?.length ? (
            <div className="mt-4">
              <TopProductsChart data={analytics.topProducts} />
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              icon={BarChart3}
              title="Nothing sold yet"
              description="Your best-selling pieces will be ranked here."
            />
          )}
        </div>
      </div>

      {analytics?.topProducts?.length > 0 && (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="p-4 font-medium">Product</th>
                <th scope="col" className="p-4 font-medium">Units</th>
                <th scope="col" className="p-4 font-medium">Revenue</th>
                <th scope="col" className="p-4 font-medium">You earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {analytics.topProducts.map((product) => (
                <tr key={product.productId}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-sand">
                        {product.image && (
                          <img src={product.image} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="truncate text-ink">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-ink-muted">{product.units}</td>
                  <td className="p-4 text-ink">{formatCurrency(product.revenue)}</td>
                  <td className="p-4 font-medium text-moss-700">
                    {formatCurrency(product.earnings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
