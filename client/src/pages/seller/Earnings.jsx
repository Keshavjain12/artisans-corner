import { useState } from 'react';
import { Wallet } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatCard from '../../components/StatCard.jsx';
import { StatCardSkeleton, TableSkeleton } from '../../components/Skeletons.jsx';
import { Badge, PageHeader } from '../../components/ui.jsx';
import vendorService from '../../services/vendorService.js';
import useAsync from '../../hooks/useAsync.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';
import { STATUS_STYLES } from '../../utils/constants.js';

export default function SellerEarnings() {
  useDocumentTitle('Earnings');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAsync(
    () => vendorService.payouts({ page, limit: 20 }),
    [page]
  );

  const payouts = data?.data?.payouts || [];
  const summary = data?.data?.summary;

  return (
    <div>
      <PageHeader
        title="Earnings"
        subtitle="What each paid order earned you, after the 5% platform fee."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard label="Gross sales" value={formatCurrency(summary?.grossSales || 0)} />
            <StatCard
              label="Platform fees"
              value={`-${formatCurrency(summary?.platformFees || 0)}`}
              hint="5% commission"
            />
            <StatCard
              label="Net earnings"
              value={formatCurrency(summary?.netEarnings || 0)}
              tone="moss"
            />
            <StatCard
              label="Awaiting payout"
              value={formatCurrency(summary?.pendingPayout || 0)}
              hint="Recorded, not yet settled"
              tone="sand"
            />
          </>
        )}
      </div>

      <p className="mt-4 rounded-xl bg-clay-50 px-4 py-3 text-xs text-clay-900">
        Payouts are recorded in the marketplace ledger. Bank transfers are outside the scope of this
        project, so an admin marks a payout as settled once it has been paid.
      </p>

      <div className="mt-8">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No earnings recorded yet"
            description="Every paid order creates a payout row here, showing the sale, the fee and what you keep."
          />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="p-4 font-medium">Order</th>
                    <th scope="col" className="p-4 font-medium">Date</th>
                    <th scope="col" className="p-4 font-medium">Gross</th>
                    <th scope="col" className="p-4 font-medium">Fee</th>
                    <th scope="col" className="p-4 font-medium">Net</th>
                    <th scope="col" className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {payouts.map((payout) => (
                    <tr key={payout._id} className="hover:bg-clay-50/40">
                      <td className="p-4 font-medium text-ink">{payout.orderNumber}</td>
                      <td className="p-4 text-ink-muted">{formatDate(payout.createdAt)}</td>
                      <td className="p-4 text-ink">{formatCurrency(payout.grossSales)}</td>
                      <td className="p-4 text-ink-muted">-{formatCurrency(payout.platformFee)}</td>
                      <td className="p-4 font-medium text-moss-700">
                        {formatCurrency(payout.netEarnings)}
                      </td>
                      <td className="p-4">
                        <Badge tone={STATUS_STYLES[payout.status]}>
                          {titleCase(payout.status)}
                        </Badge>
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
