import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import cartReducer, { persistCart } from './cartSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

let previousItems = store.getState().cart.items;
store.subscribe(() => {
  const { items } = store.getState().cart;
  if (items !== previousItems) {
    previousItems = items;
    persistCart(items);
  }
});

export default store;
