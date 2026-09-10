/**
 * The product card is the main way anything enters the cart, so its wiring to
 * the store - and its out-of-stock guard - are worth pinning down.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import ProductCard from '../ProductCard.jsx';
import CoverImage from '../CoverImage.jsx';
import { renderWithProviders, signedOut } from '../../test-utils.jsx';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(cleanup);

const product = (over = {}) => ({
  _id: 'p1',
  slug: 'hand-thrown-mug',
  name: 'Hand-Thrown Mug',
  price: 28,
  compareAtPrice: null,
  stock: 4,
  ratingAverage: 4.5,
  reviewCount: 12,
  images: [{ url: 'https://example.test/mug.jpg', alt: 'A mug' }],
  vendor: { name: 'Kiln & Coast', slug: 'kiln-and-coast' },
  ...over,
});

describe('ProductCard', () => {
  it('shows the details a shopper decides on', () => {
    renderWithProviders(<ProductCard product={product()} />, { preloadedState: signedOut });

    expect(screen.getByText('Hand-Thrown Mug')).toBeTruthy();
    expect(screen.getByText('Kiln & Coast')).toBeTruthy();
    expect(screen.getByText('$28.00')).toBeTruthy();
    expect(screen.getByText('Rated 4.5 out of 5')).toBeTruthy();
    expect(screen.getByAltText('A mug')).toBeTruthy();
  });

  it('adds the product to the cart', () => {
    const { store } = renderWithProviders(<ProductCard product={product()} />, {
      preloadedState: signedOut,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Hand-Thrown Mug to cart' }));

    const { items } = store.getState().cart;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: 'p1', quantity: 1, price: 28, stock: 4 });
  });

  it('disables buying when the piece is sold out', () => {
    renderWithProviders(<ProductCard product={product({ stock: 0 })} />, {
      preloadedState: signedOut,
    });

    expect(screen.getByText('Out of stock')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Hand-Thrown Mug to cart' }).disabled).toBe(true);
  });

  it('shows the original price when a piece is on sale', () => {
    renderWithProviders(<ProductCard product={product({ compareAtPrice: 40 })} />, {
      preloadedState: signedOut,
    });

    expect(screen.getByText('Sale')).toBeTruthy();
    expect(screen.getByText('$40.00')).toBeTruthy();
  });

  it('copes with a product that has no photo yet', () => {
    renderWithProviders(<ProductCard product={product({ images: [] })} />, {
      preloadedState: signedOut,
    });
    expect(screen.getByText('No image yet')).toBeTruthy();
  });
});

describe('CoverImage', () => {
  it('renders the image when there is one', () => {
    renderWithProviders(<CoverImage src="https://example.test/banner.jpg" alt="Shop banner" />, {
      preloadedState: signedOut,
    });
    expect(screen.getByAltText('Shop banner')).toBeTruthy();
  });

  it('falls back to a monogram rather than a broken image', () => {
    // A shop that has not uploaded a banner must not look defective.
    const { container } = renderWithProviders(<CoverImage src="" label="Terra & Thread" />, {
      preloadedState: signedOut,
    });
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('T')).toBeTruthy();
  });
});
