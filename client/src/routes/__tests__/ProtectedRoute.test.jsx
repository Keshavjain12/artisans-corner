/**
 * Route guards are a UX convenience - the API enforces the same rules - but a
 * broken guard either locks legitimate users out of their dashboard or shows
 * them an admin screen that then fails every request.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute.jsx';
import { renderWithProviders, signedInAs, signedOut } from '../../test-utils.jsx';

afterEach(cleanup);

const Guarded = ({ roles, requireStore }) => (
  <Routes>
    <Route path="/login" element={<p>login page</p>} />
    <Route path="/" element={<p>home page</p>} />
    <Route path="/become-a-seller" element={<p>onboarding page</p>} />
    <Route element={<ProtectedRoute roles={roles} requireStore={requireStore} />}>
      <Route path="/dashboard/seller" element={<p>seller dashboard</p>} />
      <Route path="/dashboard/admin" element={<p>admin dashboard</p>} />
    </Route>
  </Routes>
);

const store = { id: 's1', name: 'Test Studio', slug: 'test-studio', isActive: true };

describe('ProtectedRoute', () => {
  it('sends a signed-out visitor to the login page', () => {
    renderWithProviders(<Guarded />, { preloadedState: signedOut, route: '/dashboard/seller' });
    expect(screen.getByText('login page')).toBeTruthy();
  });

  it('shows a waiting state while the stored session is being checked', () => {
    renderWithProviders(<Guarded />, {
      preloadedState: { auth: { user: null, store: null, token: 't', status: 'loading', error: null } },
      route: '/dashboard/seller',
    });
    // It must not bounce to /login before /auth/me has answered.
    expect(screen.queryByText('login page')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('keeps a buyer out of the admin dashboard', () => {
    renderWithProviders(<Guarded roles={['admin']} />, {
      preloadedState: signedInAs('buyer'),
      route: '/dashboard/admin',
    });
    expect(screen.getByText('home page')).toBeTruthy();
  });

  it('lets an admin into the admin dashboard', () => {
    renderWithProviders(<Guarded roles={['admin']} />, {
      preloadedState: signedInAs('admin'),
      route: '/dashboard/admin',
    });
    expect(screen.getByText('admin dashboard')).toBeTruthy();
  });

  it('sends a vendor with no store to onboarding', () => {
    renderWithProviders(<Guarded roles={['vendor', 'admin']} requireStore />, {
      preloadedState: signedInAs('vendor', null),
      route: '/dashboard/seller',
    });
    expect(screen.getByText('onboarding page')).toBeTruthy();
  });

  it('lets a vendor with a store into the seller dashboard', () => {
    renderWithProviders(<Guarded roles={['vendor', 'admin']} requireStore />, {
      preloadedState: signedInAs('vendor', store),
      route: '/dashboard/seller',
    });
    expect(screen.getByText('seller dashboard')).toBeTruthy();
  });

  it('lets a vendor who is also a buyer keep both capabilities', () => {
    // The brief is explicit: vendor and buyer must not be mutually exclusive.
    const { store: reduxStore } = renderWithProviders(
      <Guarded roles={['vendor', 'admin']} requireStore />,
      { preloadedState: signedInAs('vendor', store), route: '/dashboard/seller' }
    );
    expect(screen.getByText('seller dashboard')).toBeTruthy();
    expect(reduxStore.getState().cart.items).toEqual([]);
  });
});
