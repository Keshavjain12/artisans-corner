import { useState } from 'react';
import { Users as UsersIcon } from 'lucide-react';
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
import { formatDate, titleCase } from '../../utils/format.js';

const ROLE_TONES = {
  admin: 'bg-clay-100 text-clay-800',
  vendor: 'bg-moss-100 text-moss-700',
  buyer: 'bg-sand text-ink-muted',
};

export default function AdminUsers() {
  useDocumentTitle('Users');
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [term, setTerm] = useState('');
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const q = useDebounce(term, 350);

  const { data, loading, error, run } = useAsync(
    () => adminService.users({ page, limit: 20, role, q }),
    [page, role, q]
  );
  const users = data?.data || [];

  const toggleActive = async () => {
    setSaving(true);
    try {
      await adminService.updateUser(target._id, { isActive: !target.isActive });
      toast.success(target.isActive ? 'Account deactivated' : 'Account reactivated');
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
      <PageHeader title="Users" subtitle="Everyone with an account on the marketplace." />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <input
            id="user-search"
            type="search"
            className="field"
            placeholder="Search by name or email"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="w-40"
          value={role}
          aria-label="Filter by role"
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <option value="buyer">Buyers</option>
          <option value="vendor">Vendors</option>
          <option value="admin">Admins</option>
        </Select>
      </div>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users matched" description="Try a different search." />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="p-4 font-medium">User</th>
                    <th scope="col" className="p-4 font-medium">Role</th>
                    <th scope="col" className="p-4 font-medium">Store</th>
                    <th scope="col" className="p-4 font-medium">Joined</th>
                    <th scope="col" className="p-4 font-medium">Status</th>
                    <th scope="col" className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-clay-50/40">
                      <td className="p-4">
                        <p className="font-medium text-ink">{user.name}</p>
                        <p className="text-xs text-ink-soft">{user.email}</p>
                      </td>
                      <td className="p-4">
                        <Badge tone={ROLE_TONES[user.role]}>{titleCase(user.role)}</Badge>
                      </td>
                      <td className="p-4 text-ink-muted">{user.store?.name || '-'}</td>
                      <td className="p-4 text-ink-muted">{formatDate(user.createdAt)}</td>
                      <td className="p-4">
                        <Badge
                          tone={user.isActive ? 'bg-moss-100 text-moss-700' : 'bg-red-50 text-red-700'}
                        >
                          {user.isActive ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant={user.isActive ? 'secondary' : 'primary'}
                          onClick={() => setTarget(user)}
                          disabled={user.role === 'admin'}
                        >
                          {user.isActive ? 'Deactivate' : 'Reactivate'}
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
        title={target?.isActive ? `Deactivate ${target?.name}?` : `Reactivate ${target?.name}?`}
        description={
          target?.isActive
            ? 'They will be signed out and blocked from signing in until reactivated. Their orders and products are kept.'
            : 'They will be able to sign in and use the marketplace again.'
        }
        confirmLabel={target?.isActive ? 'Deactivate' : 'Reactivate'}
        destructive={Boolean(target?.isActive)}
        loading={saving}
        onCancel={() => setTarget(null)}
        onConfirm={toggleActive}
      />
    </div>
  );
}
