import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import authReducer from './store/authSlice.js';
import cartReducer from './store/cartSlice.js';

/** A fresh store per test, so no test leaks session or cart state into the next. */
export function makeStore(preloadedState) {
  return configureStore({
    reducer: { auth: authReducer, cart: cartReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
    preloadedState,
  });
}

export const signedOut = {
  auth: { user: null, store: null, token: null, status: 'idle', error: null },
};

export const signedInAs = (role = 'buyer', store = null) => ({
  auth: {
    user: { id: 'u1', name: 'Test Person', email: 'test@example.com', role, isActive: true },
    store,
    token: 'test-token',
    status: 'authenticated',
    error: null,
  },
});

/** Renders a component inside the providers every page in this app relies on. */
export function renderWithProviders(ui, { preloadedState, route = '/', store = makeStore(preloadedState) } = {}) {
  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {children}
      </MemoryRouter>
    </Provider>
  );
  return { store, ...render(ui, { wrapper: Wrapper }) };
}
