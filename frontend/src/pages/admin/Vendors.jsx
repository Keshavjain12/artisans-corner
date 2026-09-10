import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import { TableSkeleton } from '../../components/Skeletons.jsx';
import { Badge, Button, PageHeader, Select } from '../../components/ui.jsx';
import adminService from '../../services/adminService.js';
import useAsync from '../../hooks/useAsync.js';
import useDebounce from '../../hooks/useDebounce.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

export default function AdminVendors() {
  useDocumentTitle('Vendors');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const q = useDebounce(term, 350);

  const { data, loading, error, run } = useAsync(
    () => adminService.vendors({ page, limit: 20, status, q }),
    [page, status, q]
  );
  const stores = data?.data || [];

  const toggle = async () => {
    setSaving(true);
    try {
      await adminService.setVendorStatus(target._id, {
        isActive: !target.isActive,
        reason: target.isActive ? 'Suspended by an admin' : '',
      });
      toast.success(target.isActive ? 'Store suspended' : 'Store reinstated');
      setTarget(null);
      await run();
    } catch (updateError) {
      toast.error(updateError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Suspending a shop hides its storefront and every product it sells."
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="vendor-search" className="sr-only">
            Search shops
          </label>
          <input
            id="vendor-search"
            type="search"
            className="field"
            placeholder="Search by shop name"
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
          <option value="">All shops</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
        ) : stores.length === 0 ? (
          <EmptyState icon={Store} title="No shops matched" description="Try a different search." />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="p-4 font-medium">Shop</th>
                    <th scope="col" className="p-4 font-medium">Owner</th>
                    <th scope="col" className="p-4 font-medium">Joined</th>
                    <th scope="col" className="p-4 font-medium">Net sales</th>
                    <th scope="col" className="p-4 font-medium">Status</th>
                    <th scope="col" className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {stores.map((store) => (
                    <tr key={store._id} className="hover:bg-clay-50/40">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-sand">
                            {store.logo && (
                              <img src={store.logo} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <Link
                              to={`/shop/${store.slug}`}
                              className="block truncate font-medium text-ink hover:text-clay-700"
                            >
                              {store.name}
                            </Link>
                            <span className="block truncate text-xs text-ink-soft">
                              {[store.location?.city, store.location?.country]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-ink-muted">
                        <p>{store.owner?.name}</p>
                        <p className="text-xs text-ink-soft">{store.owner?.email}</p>
                      </td>
                      <td className="p-4 text-ink-muted">{formatDate(store.createdAt)}</td>
                      <td className="p-4 text-ink">{formatCurrency(store.totalSales)}</td>
                      <td className="p-4">
                        <Badge
                          tone={
                            store.isActive ? 'bg-moss-100 text-moss-700' : 'bg-red-50 text-red-700'
                          }
                        >
                          {store.isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant={store.isActive ? 'secondary' : 'primary'}
                          onClick={() => setTarget(store)}
                        >
                          {store.isActive ? 'Suspend' : 'Reinstate'}
                        </Button>
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

      <ConfirmDialog
        open={Boolean(target)}
        title={target?.isActive ? `Suspend ${target?.name}?` : `Reinstate ${target?.name}?`}
        description={
          target?.isActive
            ? 'The storefront and all of its products are hidden from buyers immediately. Existing orders are unaffected.'
            : 'The shop and its products become visible on the marketplace again.'
        }
        confirmLabel={target?.isActive ? 'Suspend shop' : 'Reinstate shop'}
        destructive={Boolean(target?.isActive)}
        loading={saving}
        onCancel={() => setTarget(null)}
        onConfirm={toggle}
      />
    </div>
  );
}
