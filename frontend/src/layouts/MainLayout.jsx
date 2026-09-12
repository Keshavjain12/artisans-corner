import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { paymentService } from '../services/orderService.js';
import useAsync from '../hooks/useAsync.js';

function DemoBanner() {
  const config = useAsync(() => paymentService.config(), []);
  if (!config.data?.data?.demo) return null;

  return (
    <div className="bg-ink px-4 py-2 text-center text-xs text-cream">
      Demo deployment: checkout uses a simulated payment because Stripe onboarding is
      invite-only in India. Orders, stock, the 5% commission and vendor payouts are all real.{' '}
      <Link to="/shop" className="underline underline-offset-2">
        Start shopping
      </Link>
    </div>
  );
}

export function MainLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>
      <DemoBanner />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;
