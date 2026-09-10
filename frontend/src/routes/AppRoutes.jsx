import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { Spinner } from '../components/ui.jsx';

/* Route-level code splitting keeps the marketplace bundle small; the
   dashboards and their charts only load for the people who use them. */
const Home = lazy(() => import('../pages/Home.jsx'));
const Shop = lazy(() => import('../pages/Shop.jsx'));
const Categories = lazy(() => import('../pages/Categories.jsx'));
const Artisans = lazy(() => import('../pages/Artisans.jsx'));
const StorePage = lazy(() => import('../pages/StorePage.jsx'));
const ProductDetail = lazy(() => import('../pages/ProductDetail.jsx'));
const Cart = lazy(() => import('../pages/Cart.jsx'));
const Checkout = lazy(() => import('../pages/Checkout.jsx'));
const OrderConfirmation = lazy(() => import('../pages/OrderConfirmation.jsx'));
const Login = lazy(() => import('../pages/Login.jsx'));
const Register = lazy(() => import('../pages/Register.jsx'));
const Account = lazy(() => import('../pages/Account.jsx'));
const Orders = lazy(() => import('../pages/Orders.jsx'));
const OrderDetail = lazy(() => import('../pages/OrderDetail.jsx'));
const BecomeSeller = lazy(() => import('../pages/BecomeSeller.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

const SellerLayout = lazy(() => import('../layouts/SellerLayout.jsx'));
const SellerOverview = lazy(() => import('../pages/seller/Overview.jsx'));
const SellerProducts = lazy(() => import('../pages/seller/Products.jsx'));
const SellerProductForm = lazy(() => import('../pages/seller/ProductForm.jsx'));
const SellerOrders = lazy(() => import('../pages/seller/Orders.jsx'));
const SellerEarnings = lazy(() => import('../pages/seller/Earnings.jsx'));
const SellerAnalytics = lazy(() => import('../pages/seller/Analytics.jsx'));
const SellerSettings = lazy(() => import('../pages/seller/StoreSettings.jsx'));

const AdminLayout = lazy(() => import('../layouts/AdminLayout.jsx'));
const AdminOverview = lazy(() => import('../pages/admin/Overview.jsx'));
const AdminUsers = lazy(() => import('../pages/admin/Users.jsx'));
const AdminVendors = lazy(() => import('../pages/admin/Vendors.jsx'));
const AdminProducts = lazy(() => import('../pages/admin/Products.jsx'));
const AdminOrders = lazy(() => import('../pages/admin/Orders.jsx'));
const AdminRevenue = lazy(() => import('../pages/admin/Revenue.jsx'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner label="Loading page" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/artisans" element={<Artisans />} />
          <Route path="/shop/:slug" element={<StorePage />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
            <Route path="/account" element={<Account />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/become-a-seller" element={<BecomeSeller />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<ProtectedRoute roles={['vendor', 'admin']} requireStore />}>
          <Route path="/dashboard/seller" element={<SellerLayout />}>
            <Route index element={<SellerOverview />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/new" element={<SellerProductForm />} />
            <Route path="products/:id/edit" element={<SellerProductForm />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="earnings" element={<SellerEarnings />} />
            <Route path="analytics" element={<SellerAnalytics />} />
            <Route path="settings" element={<SellerSettings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/dashboard/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="revenue" element={<AdminRevenue />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
