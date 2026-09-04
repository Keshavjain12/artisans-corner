import { createSlice } from '@reduxjs/toolkit';
import { MAX_QTY_PER_LINE } from '../utils/constants.js';

export const CART_KEY = 'ac_cart_v1';

/**
 * The cart is a *convenience* copy of what the shopper picked. Prices here are
 * only for display - the server re-prices everything from the database at
 * checkout, so a tampered cart cannot change what is charged.
 */
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.productId && item?.quantity > 0);
  } catch {
    return [];
  }
}

export function persistCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* private browsing - the cart simply will not survive a refresh */
  }
}

const clampQuantity = (quantity, stock) =>
  Math.max(1, Math.min(Number(quantity) || 1, Math.min(stock || MAX_QTY_PER_LINE, MAX_QTY_PER_LINE)));

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: loadCart(), lastAdded: null },
  reducers: {
    addItem: {
      reducer(state, action) {
        const incoming = action.payload;
        const existing = state.items.find((item) => item.productId === incoming.productId);
        if (existing) {
          existing.quantity = clampQuantity(existing.quantity + incoming.quantity, incoming.stock);
          existing.price = incoming.price;
          existing.stock = incoming.stock;
        } else {
          state.items.push({ ...incoming, quantity: clampQuantity(incoming.quantity, incoming.stock) });
        }
        state.lastAdded = incoming.productId;
      },
      prepare(product, quantity = 1) {
        return {
          payload: {
            productId: product._id || product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.images?.[0]?.url || '',
            stock: product.stock,
            vendorName: product.vendor?.name || product.vendorName || '',
            vendorSlug: product.vendor?.slug || product.vendorSlug || '',
            quantity,
          },
        };
      },
    },
    updateQuantity(state, action) {
      const { productId, quantity } = action.payload;
      const item = state.items.find((entry) => entry.productId === productId);
      if (item) item.quantity = clampQuantity(quantity, item.stock);
    },
    removeItem(state, action) {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },
    clearCart(state) {
      state.items = [];
      state.lastAdded = null;
    },
    /** Refreshes price/stock after the server re-prices the basket. */
    reconcileCart(state, action) {
      const serverLines = action.payload || [];
      state.items = state.items
        .map((item) => {
          const line = serverLines.find((entry) => String(entry.product) === String(item.productId));
          return line ? { ...item, price: line.unitPrice } : item;
        })
        .filter(Boolean);
    },
  },
});

export const { addItem, updateQuantity, removeItem, clearCart, reconcileCart } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartSubtotal = (state) =>
  Math.round(
    state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100
  ) / 100;

export default cartSlice.reducer;
