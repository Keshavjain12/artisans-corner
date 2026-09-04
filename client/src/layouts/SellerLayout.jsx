import { useSelector } from 'react-redux';
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';

const LINKS = [
  { to: '/dashboard/seller', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/seller/products', label: 'Products', icon: Package },
  { to: '/dashboard/seller/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/dashboard/seller/earnings', label: 'Earnings', icon: Wallet },
  { to: '/dashboard/seller/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/seller/settings', label: 'Store settings', icon: Settings },
];

export default function SellerLayout() {
  const store = useSelector((state) => state.auth.store);

  return (
    <DashboardShell
      title={store?.name || 'Seller dashboard'}
      subtitle="Seller dashboard"
      links={LINKS}
      badge={
        store && !store.isActive ? (
          <span className="badge bg-red-50 text-red-700">
            <Receipt className="h-3 w-3" aria-hidden="true" />
            Shop paused
          </span>
        ) : null
      }
    />
  );
}
