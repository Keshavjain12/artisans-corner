import { useState } from 'react';
import { Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatCard from '../../components/StatCard.jsx';
import { StatCardSkeleton, TableSkeleton } from '../../components/Skeletons.jsx';
import { Badge, Button, PageHeader } from '../../components/ui.jsx';
import adminService from '../../services/adminService.js';
import useAsync from '../../hooks/useAsync.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';
import { STATUS_STYLES } from '../../utils/constants.js';

export default function AdminRevenue() {
  useDocumentTitle('Revenue');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const { data, loading, error, run } = useAsync(
    () => adminService.revenue({ page, limit: 20 }),
    [page]
  );
  const payouts = data?.data?.payouts || [];
  const summary = data?.data?.summary;
  const byVendor = data?.data?.byVendor || [];

  const settle = async (payout) => {
    setBusyId(payout._id);
    try {
      await adminService.settlePayout(payout._id);
      toast.success('Payout marked as settled');
      await run();
    } catch (settleError) {
      toast.error(settleError.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Revenue &amp; commission"
        subtitle="What the marketplace earned, and what it owes each vendor."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard
              label="Gross merchandise value"
              value={formatCurrency(summary?.grossMerchandiseValue || 0)}
            />
            <StatCard
              label="Platform revenue"
              value={formatCurrency(summary?.platformRevenue || 0)}
              hint="5% commission"
              tone="moss"
            />
            <StatCard
              label="Vendor earnings"
              value={formatCurrency(summary?.vendorEarnings || 0)}
              tone="sand"
            />
            <StatCard
              label="Outstanding payouts"
              value={formatCurrency(summary?.outstandingPayouts || 0)}
              hint="Recorded, not yet settled"
              tone="sand"
            />
          </>
        )}
      </div>

      {byVendor.length > 0 && (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <caption className="p-4 text-left text-sm font-semibold text-ink">
              Commission by vendor
            </caption>
            <thead className="border-y border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="p-4 font-medium">Shop</th>
                <th scope="col" className="p-4 font-medium">Orders</th>
                <th scope="col" className="p-4 font-medium">Gross sales</th>
                <th scope="col" className="p-4 font-medium">Platform fees</th>
                <th scope="col" className="p-4 font-medium">Vendor earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {byVendor.map((row) => (
                <tr key={row.storeId}>
                  <td className="p-4 font-medium text-ink">{row.name}</td>
                  <td className="p-4 text-ink-muted">{row.orders}</td>
                  <td className="p-4 text-ink">{formatCurrency(row.grossSales)}</td>
                  <td className="p-4 text-moss-700">{formatCurrency(row.platformFees)}</td>
                  <td className="p-4 text-ink-muted">{formatCurrency(row.netEarnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-ink">Payout ledger</h2>
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payouts recorded"
            description="Each paid order writes one payout row per vendor involved."
          />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="p-4 font-medium">Order</th>
                    <th scope="col" className="p-4 font-medium">Shop</th>
                    <th scope="col" className="p-4 font-medium">Date</th>
                    <th scope="col" className="p-4 font-medium">Gross</th>
                    <th scope="col" className="p-4 font-medium">Fee</th>
                    <th scope="col" className="p-4 font-medium">Net</th>
                    <th scope="col" className="p-4 font-medium">Status</th>
                    <th scope="col" className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {payouts.map((payout) => (
                    <tr key={payout._id} className="hover:bg-clay-50/40">
                      <td className="p-4 font-medium text-ink">{payout.orderNumber}</td>
                      <td className="p-4 text-ink-muted">{payout.vendor?.name}</td>
                      <td className="p-4 text-ink-muted">{formatDate(payout.createdAt)}</td>
                      <td className="p-4 text-ink">{formatCurrency(payout.grossSales)}</td>
                      <td className="p-4 text-moss-700">{formatCurrency(payout.platformFee)}</td>
                      <td className="p-4 text-ink">{formatCurrency(payout.netEarnings)}</td>
                      <td className="p-4">
                        <Badge tone={STATUS_STYLES[payout.status]}>
                          {titleCase(payout.status)}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {payout.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={busyId === payout._id}
                            onClick={() => settle(payout)}
                          >
                            Mark settled
                          </Button>
                        )}
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
