import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Eye, Package, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import { TableSkeleton } from '../../components/Skeletons.jsx';
import { Badge, PageHeader, Select } from '../../components/ui.jsx';
import vendorService from '../../services/vendorService.js';
import useAsync from '../../hooks/useAsync.js';
import useDebounce from '../../hooks/useDebounce.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency, titleCase } from '../../utils/format.js';

const STATUS_FILTERS = [
  { value: 'all', label: 'All products' },
  { value: 'active', label: 'Live' },
  { value: 'draft', label: 'Hidden' },
  { value: 'archived', label: 'Archived' },
];

export default function SellerProducts() {
  useDocumentTitle('Products');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [term, setTerm] = useState('');
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const q = useDebounce(term, 350);

  const { data, loading, error, run } = useAsync(
    () => vendorService.myProducts({ page, limit: 20, status, q }),
    [page, status, q]
  );
  const products = data?.data || [];

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await vendorService.deleteProduct(target._id);
      toast.success(res.message);
      setTarget(null);
      await run();
    } catch (deleteError) {
      toast.error(deleteError.message);
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = (product) => {
    if (product.isArchived) return <Badge tone="bg-stone-100 text-stone-700">Archived</Badge>;
    if (!product.isActive) return <Badge tone="bg-amber-50 text-amber-700">Hidden</Badge>;
    if (product.stock === 0) return <Badge tone="bg-red-50 text-red-700">Out of stock</Badge>;
    return <Badge tone="bg-moss-100 text-moss-700">Live</Badge>;
  };

  const row = (product) => (
    <tr key={product._id} className="hover:bg-clay-50/40">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-sand">
            {product.images?.[0]?.url && (
              <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{product.name}</span>
            <span className="block truncate text-xs text-ink-soft">
              {product.sku || product.slug}
            </span>
          </span>
        </div>
      </td>
      <td className="p-4 text-ink-muted">{titleCase(product.category)}</td>
      <td className="p-4 text-ink">{formatCurrency(product.price)}</td>
      <td className="p-4 text-ink-muted">{product.stock}</td>
      <td className="p-4 text-ink-muted">{product.unitsSold}</td>
      <td className="p-4">{statusBadge(product)}</td>
      <td className="p-4">
        <div className="flex justify-end gap-1.5">
          <Link
            to={`/product/${product.slug}`}
            className="btn-ghost p-2"
            aria-label={`View ${product.name}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to={`/dashboard/seller/products/${product._id}/edit`}
            className="btn-ghost p-2"
            aria-label={`Edit ${product.name}`}
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setTarget(product)}
            className="btn-ghost p-2 text-red-600 hover:bg-red-50"
            aria-label={`Delete ${product.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Everything you have listed on the marketplace"
        action={
          <Link to="/dashboard/seller/products/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add product
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="product-search" className="sr-only">
            Search your products
          </label>
          <input
            id="product-search"
            type="search"
            className="field"
            placeholder="Search your products"
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
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={term ? 'No products matched that search' : 'You have not listed anything yet'}
            description={
              term
                ? 'Try a different search term or clear the status filter.'
                : 'Add your first piece - photos, a price and a short story about how it is made.'
            }
            action={
              <Link to="/dashboard/seller/products/new" className="btn-primary">
                Add your first product
              </Link>
            }
          />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="p-4 font-medium">Product</th>
                    <th scope="col" className="p-4 font-medium">Category</th>
                    <th scope="col" className="p-4 font-medium">Price</th>
                    <th scope="col" className="p-4 font-medium">Stock</th>
                    <th scope="col" className="p-4 font-medium">Sold</th>
                    <th scope="col" className="p-4 font-medium">Status</th>
                    <th scope="col" className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">{products.map(row)}</tbody>
              </table>
            </div>

            <Pagination meta={data?.meta} className="mt-8" onChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        title={`Delete "${target?.name || ''}"?`}
        description="Products that appear in past orders are archived instead of deleted, so order history stays intact."
        confirmLabel="Delete product"
        loading={deleting}
        onCancel={() => setTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
