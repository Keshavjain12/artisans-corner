import { LayoutDashboard, Package, Receipt, ShoppingCart, Store, Users } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';

const LINKS = [
  { to: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/admin/users', label: 'Users', icon: Users },
  { to: '/dashboard/admin/vendors', label: 'Vendors', icon: Store },
  { to: '/dashboard/admin/products', label: 'Products', icon: Package },
  { to: '/dashboard/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/dashboard/admin/revenue', label: 'Revenue', icon: Receipt },
];

export default function AdminLayout() {
  return (
    <DashboardShell
      title="Marketplace administration"
      subtitle="Platform-wide moderation and reporting"
      links={LINKS}
      badge={<span className="badge bg-clay-100 text-clay-800">Admin</span>}
    />
  );
}
