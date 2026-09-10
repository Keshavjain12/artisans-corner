import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import { TableSkeleton } from '../../components/Skeletons.jsx';
import { Badge, Button, PageHeader, Select } from '../../components/ui.jsx';
import adminService from '../../services/adminService.js';
import useAsync from '../../hooks/useAsync.js';
import useDebounce from '../../hooks/useDebounce.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency, titleCase } from '../../utils/format.js';

export default function AdminProducts() {
  useDocumentTitle('Products');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const [busyId, setBusyId] = useState(null);
  const q = useDebounce(term, 350);

  const { data, loading, error, run } = useAsync(
    () => adminService.products({ page, limit: 20, status, q }),
    [page, status, q]
  );
  const products = data?.data || [];

  const moderate = async (product) => {
    setBusyId(product._id);
    try {
      await adminService.setProductStatus(product._id, { isActive: !product.isActive });
      toast.success(product.isActive ? 'Product hidden' : 'Product published');
      await run();
    } catch (moderateError) {
      toast.error(moderateError.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Moderate listings across every shop. Hidden products stay in past orders."
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="admin-product-search" className="sr-only">
            Search products
          </label>
          <input
            id="admin-product-search"
            type="search"
            className="field"
            placeholder="Search all products"
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
          <option value="">All products</option>
          <option value="active">Live</option>
          <option value="hidden">Hidden</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="No products matched" description="Try a different search." />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="p-4 font-medium">Product</th>
                    <th scope="col" className="p-4 font-medium">Shop</th>
                    <th scope="col" className="p-4 font-medium">Category</th>
                    <th scope="col" className="p-4 font-medium">Price</th>
                    <th scope="col" className="p-4 font-medium">Status</th>
                    <th scope="col" className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {products.map((product) => (
                    <tr key={product._id} className="hover:bg-clay-50/40">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-sand">
                            {product.images?.[0]?.url && (
                              <img
                                src={product.images[0].url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </span>
                          <Link
                            to={`/product/${product.slug}`}
                            className="min-w-0 truncate font-medium text-ink hover:text-clay-700"
                          >
                            {product.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 text-ink-muted">{product.vendor?.name}</td>
                      <td className="p-4 text-ink-muted">{titleCase(product.category)}</td>
                      <td className="p-4 text-ink">{formatCurrency(product.price)}</td>
                      <td className="p-4">
                        {product.isArchived ? (
                          <Badge tone="bg-stone-100 text-stone-700">Archived</Badge>
                        ) : product.isActive ? (
                          <Badge tone="bg-moss-100 text-moss-700">Live</Badge>
                        ) : (
                          <Badge tone="bg-amber-50 text-amber-700">Hidden</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant={product.isActive ? 'secondary' : 'primary'}
                          loading={busyId === product._id}
                          onClick={() => moderate(product)}
                        >
                          {product.isActive ? 'Hide' : 'Publish'}
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
    </div>
  );
}
