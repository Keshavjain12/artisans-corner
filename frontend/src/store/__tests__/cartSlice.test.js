import { beforeEach, describe, expect, it, vi } from 'vitest';
import reducer, {
  CART_KEY,
  addItem,
  clearCart,
  persistCart,
  removeItem,
  selectCartCount,
  selectCartSubtotal,
  updateQuantity,
} from '../cartSlice.js';

const product = (over = {}) => ({
  _id: 'p1',
  slug: 'hand-thrown-mug',
  name: 'Hand-Thrown Mug',
  price: 28,
  stock: 4,
  images: [{ url: 'https://example.test/mug.jpg' }],
  vendor: { name: 'Kiln & Coast', slug: 'kiln-and-coast' },
  ...over,
});

const emptyState = { items: [], lastAdded: null };

async function reloadSliceAfterRefresh() {
  vi.resetModules();
  const fresh = await import('../cartSlice.js');
  return fresh.default(undefined, { type: '@@INIT' });
}

beforeEach(() => {
  localStorage.clear();
});

describe('cart contents', () => {
  it('stores everything the cart page needs to render a line', () => {
    const state = reducer(emptyState, addItem(product(), 2));
    expect(state.items[0]).toMatchObject({
      productId: 'p1',
      slug: 'hand-thrown-mug',
      name: 'Hand-Thrown Mug',
      price: 28,
      quantity: 2,
      stock: 4,
      image: 'https://example.test/mug.jpg',
      vendorName: 'Kiln & Coast',
      vendorSlug: 'kiln-and-coast',
    });
  });

  it('merges a repeat add instead of duplicating the line', () => {
    let state = reducer(emptyState, addItem(product(), 1));
    state = reducer(state, addItem(product(), 2));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
  });

  it('keeps items from different vendors side by side', () => {
    let state = reducer(emptyState, addItem(product(), 1));
    state = reducer(state, addItem(product({ _id: 'p2', name: 'Silver Hoops' }), 1));
    expect(state.items).toHaveLength(2);
    expect(selectCartCount({ cart: state })).toBe(2);
  });

  it('updates and removes lines, and clears the whole cart', () => {
    let state = reducer(emptyState, addItem(product(), 1));
    state = reducer(state, updateQuantity({ productId: 'p1', quantity: 3 }));
    expect(state.items[0].quantity).toBe(3);

    state = reducer(state, addItem(product({ _id: 'p2' }), 1));
    state = reducer(state, removeItem('p1'));
    expect(state.items.map((i) => i.productId)).toEqual(['p2']);

    state = reducer(state, clearCart());
    expect(state.items).toHaveLength(0);
  });

  it('computes the subtotal without floating-point drift', () => {
    let state = reducer(emptyState, addItem(product({ price: 0.1 }), 1));
    state = reducer(state, addItem(product({ _id: 'p2', price: 0.2 }), 1));
    expect(selectCartSubtotal({ cart: state })).toBe(0.3);
  });
});

describe('inventory limits', () => {
  it('clamps an add to the available stock', () => {
    const state = reducer(emptyState, addItem(product({ stock: 3 }), 10));
    expect(state.items[0].quantity).toBe(3);
  });

  it('clamps a repeat add that would exceed stock', () => {
    let state = reducer(emptyState, addItem(product({ stock: 4 }), 3));
    state = reducer(state, addItem(product({ stock: 4 }), 3));
    expect(state.items[0].quantity).toBe(4);
  });

  it('clamps a manual quantity change', () => {
    let state = reducer(emptyState, addItem(product({ stock: 2 }), 1));
    state = reducer(state, updateQuantity({ productId: 'p1', quantity: 99 }));
    expect(state.items[0].quantity).toBe(2);
  });

  it('never drops below one', () => {
    let state = reducer(emptyState, addItem(product(), 1));
    state = reducer(state, updateQuantity({ productId: 'p1', quantity: 0 }));
    expect(state.items[0].quantity).toBe(1);
  });

  it('caps a single line even when stock is effectively unlimited', () => {
    const state = reducer(emptyState, addItem(product({ stock: 9999 }), 500));
    expect(state.items[0].quantity).toBe(20);
  });
});

describe('persistence across a refresh', () => {
  it('writes the cart to localStorage and reads it back', async () => {
    const state = reducer(emptyState, addItem(product(), 2));
    persistCart(state.items);

    const rehydrated = await reloadSliceAfterRefresh();

    expect(rehydrated.items).toHaveLength(1);
    expect(rehydrated.items[0]).toMatchObject({ productId: 'p1', quantity: 2, price: 28 });
  });

  it('survives corrupt storage instead of crashing the app', async () => {
    localStorage.setItem(CART_KEY, '{not json');
    expect((await reloadSliceAfterRefresh()).items).toEqual([]);
  });

  it('ignores stored entries that are not real cart lines', async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([{ nonsense: true }, { productId: 'p9', quantity: 0 }])
    );
    expect((await reloadSliceAfterRefresh()).items).toEqual([]);
  });
});
