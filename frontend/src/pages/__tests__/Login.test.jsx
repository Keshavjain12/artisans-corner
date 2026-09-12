/**
 * Where a signed-in user is sent from /login. The redirect comes from the URL,
 * so anything that a browser would treat as another site must fall back home.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Login from '../Login.jsx';
import { renderWithProviders, signedInAs } from '../../test-utils.jsx';

vi.mock('../../services/authService.js', () => ({
  default: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

afterEach(cleanup);

function Landed() {
  const location = useLocation();
  return <p data-testid="landed">{location.pathname + location.search}</p>;
}

const landAfterLogin = async (redirect) => {
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Landed />} />
    </Routes>,
    { preloadedState: signedInAs('buyer'), route: `/login?redirect=${encodeURIComponent(redirect)}` }
  );
  return (await screen.findByTestId('landed')).textContent;
};

describe('Login redirect', () => {
  it('follows an in-app path', async () => {
    expect(await landAfterLogin('/checkout')).toBe('/checkout');
  });

  it('keeps the query string of an in-app path', async () => {
    expect(await landAfterLogin('/shop?category=pottery')).toBe('/shop?category=pottery');
  });

  it.each([
    ['an absolute URL', 'https://evil.example'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash the browser reads as //', '/\\evil.example'],
    ['a tab the browser strips', '/\t/evil.example'],
    ['a relative path', 'evil.example'],
  ])('refuses %s and goes home instead', async (_, redirect) => {
    expect(await landAfterLogin(redirect)).toBe('/');
  });
});
