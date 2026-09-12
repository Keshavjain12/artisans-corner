import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import Register from '../Register.jsx';
import { renderWithProviders, signedOut } from '../../test-utils.jsx';

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

const authService = (await import('../../services/authService.js')).default;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const NAME = /^Name/;
const EMAIL = /^Email/;
const PASSWORD = /^Password/;
const CONFIRM = /^Confirm password/;

describe('Register page', () => {
  it('submits the details the user typed', async () => {
    authService.register.mockResolvedValue({
      success: true,
      data: {
        token: 'jwt-token',
        user: { id: 'u1', name: 'Keshav raj Jain', email: 'krj@gmail.com', role: 'buyer' },
        store: null,
      },
    });

    renderWithProviders(<Register />, { preloadedState: signedOut });

    fill(NAME, 'Keshav raj Jain');
    fill(EMAIL, 'krj@gmail.com');
    fill(PASSWORD, 'Passw0rd123');
    fill(CONFIRM, 'Passw0rd123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(authService.register).toHaveBeenCalledTimes(1));
    expect(authService.register.mock.calls[0][0]).toMatchObject({
      name: 'Keshav raj Jain',
      email: 'krj@gmail.com',
      password: 'Passw0rd123',
      confirmPassword: 'Passw0rd123',
    });

    expect(screen.queryByText('Please tell us your name')).toBeNull();
    expect(screen.queryByText('Email is required')).toBeNull();
  });

  it('stores the session so the user is signed in afterwards', async () => {
    authService.register.mockResolvedValue({
      success: true,
      data: {
        token: 'jwt-token',
        user: { id: 'u1', name: 'Keshav raj Jain', email: 'krj@gmail.com', role: 'buyer' },
        store: null,
      },
    });

    const { store } = renderWithProviders(<Register />, { preloadedState: signedOut });

    fill(NAME, 'Keshav raj Jain');
    fill(EMAIL, 'krj@gmail.com');
    fill(PASSWORD, 'Passw0rd123');
    fill(CONFIRM, 'Passw0rd123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(store.getState().auth.user?.email).toBe('krj@gmail.com'));
    expect(store.getState().auth.status).toBe('authenticated');
  });

  it('reports genuinely empty fields', async () => {
    renderWithProviders(<Register />, { preloadedState: signedOut });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByText('Please tell us your name')).toBeTruthy());
    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation', async () => {
    renderWithProviders(<Register />, { preloadedState: signedOut });

    fill(NAME, 'Keshav raj Jain');
    fill(EMAIL, 'krj@gmail.com');
    fill(PASSWORD, 'Passw0rd123');
    fill(CONFIRM, 'Passw0rd124');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByText('Passwords do not match')).toBeTruthy());
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('enforces the password rules the API also enforces', async () => {
    renderWithProviders(<Register />, { preloadedState: signedOut });

    fill(NAME, 'Keshav raj Jain');
    fill(EMAIL, 'not-an-email');
    fill(PASSWORD, 'short');
    fill(CONFIRM, 'short');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByText('Enter a valid email address')).toBeTruthy());
    expect(screen.getByText('Use at least 8 characters')).toBeTruthy();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('surfaces a server-side failure to the user', async () => {
    const failure = new Error('An account with that email already exists');
    authService.register.mockRejectedValue(failure);

    renderWithProviders(<Register />, { preloadedState: signedOut });

    fill(NAME, 'Keshav raj Jain');
    fill(EMAIL, 'taken@example.com');
    fill(PASSWORD, 'Passw0rd123');
    fill(CONFIRM, 'Passw0rd123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('already exists')
    );
  });
});
