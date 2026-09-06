import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Spinner } from '../components/ui.jsx';

/**
 * Gate for authenticated areas. `roles` restricts by role and `requireStore`
 * additionally demands a completed vendor onboarding.
 *
 * These checks are a UX convenience only - every protected API route enforces
 * the same rules server-side.
 */
export function ProtectedRoute({ roles, requireStore = false }) {
  const { user, store, status } = useSelector((state) => state.auth);
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Checked before the role test: a buyer heading for the seller dashboard is
  // better served by the "open your shop" page than by a silent bounce home.
  if (requireStore && !store) {
    return <Navigate to="/become-a-seller" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
