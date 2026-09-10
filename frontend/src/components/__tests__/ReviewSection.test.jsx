/**
 * The review panel has three honest states, and getting them wrong is worse
 * than showing nothing: a buyer who has already reviewed a piece used to be
 * told that only verified buyers could review it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import ReviewSection from '../ReviewSection.jsx';
import { renderWithProviders, signedInAs, signedOut } from '../../test-utils.jsx';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const pending = vi.fn();
const create = vi.fn();
const update = vi.fn();
const getProductReviews = vi.fn();

vi.mock('../../services/orderService.js', () => ({
  reviewService: {
    pending: (...args) => pending(...args),
    create: (...args) => create(...args),
    update: (...args) => update(...args),
  },
}));

vi.mock('../../services/catalogService.js', () => ({
  default: { getProductReviews: (...args) => getProductReviews(...args) },
}));

const product = { _id: 'p1', name: 'Speckled Milk Jug', ratingAverage: 4, reviewCount: 1 };

const myReview = {
  _id: 'r1',
  rating: 3,
  title: 'Lovely glaze',
  comment: 'A little smaller than I hoped, but beautifully made.',
  createdAt: '2026-02-14T00:00:00.000Z',
  user: { _id: 'u1', name: 'Test Person' },
};

/** Shapes the two calls the panel makes on mount. */
function serve({ reviews = [], viewerReview = null, reviewable = [] } = {}) {
  getProductReviews.mockResolvedValue({
    data: { reviews, viewerReview, distribution: [] },
    meta: { total: reviews.length },
  });
  pending.mockResolvedValue({ data: reviewable });
}

beforeEach(() => {
  create.mockResolvedValue({ data: { ratingAverage: 5, reviewCount: 2 } });
  update.mockResolvedValue({ data: { ratingAverage: 5, reviewCount: 1 } });
});

afterEach(cleanup);

describe('ReviewSection', () => {
  it('asks a signed-out visitor to sign in', async () => {
    serve();
    renderWithProviders(<ReviewSection product={product} />, { preloadedState: signedOut });

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeTruthy();
    expect(screen.queryByText(/Only verified buyers/)).toBeNull();
    expect(pending).not.toHaveBeenCalled();
  });

  it('offers the form to a buyer with an unreviewed order', async () => {
    serve({ reviewable: [{ productId: 'p1' }] });
    renderWithProviders(<ReviewSection product={product} />, {
      preloadedState: signedInAs('buyer'),
    });

    expect(await screen.findByText('Write your review')).toBeTruthy();
    expect(screen.queryByText(/Only verified buyers/)).toBeNull();
  });

  it('tells a buyer who has not bought it that reviews are for verified buyers', async () => {
    serve();
    renderWithProviders(<ReviewSection product={product} />, {
      preloadedState: signedInAs('buyer'),
    });

    expect(await screen.findByText(/Only verified buyers/)).toBeTruthy();
    expect(screen.queryByText('Write your review')).toBeNull();
  });

  it('recognises a review the buyer has already written, and edits it', async () => {
    /* The pending list is empty here precisely because the review exists - the
       old code read that as "never bought it". */
    serve({ reviews: [myReview], viewerReview: myReview });
    renderWithProviders(<ReviewSection product={product} />, {
      preloadedState: signedInAs('buyer'),
    });

    expect(await screen.findByText(/You reviewed this piece/)).toBeTruthy();
    expect(screen.queryByText(/Only verified buyers/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit your review' }));

    expect(screen.getByText('Edit your review')).toBeTruthy();
    const comment = screen.getByLabelText(/Your review/);
    expect(comment.value).toBe(myReview.comment);

    fireEvent.change(comment, { target: { value: 'It has grown on me - the size suits the shelf.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('r1', {
      rating: 3,
      title: 'Lovely glaze',
      comment: 'It has grown on me - the size suits the shelf.',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('posts a new review rather than an update when there is none yet', async () => {
    serve({ reviewable: [{ productId: 'p1' }] });
    const onRatingChange = vi.fn();
    renderWithProviders(<ReviewSection product={product} onRatingChange={onRatingChange} />, {
      preloadedState: signedInAs('buyer'),
    });

    await screen.findByText('Write your review');
    fireEvent.change(screen.getByLabelText(/Your review/), {
      target: { value: 'Packed with real care and the glaze is lovely.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post review' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({
      productId: 'p1',
      rating: 5,
      title: '',
      comment: 'Packed with real care and the glaze is lovely.',
    });
    expect(update).not.toHaveBeenCalled();
    expect(onRatingChange).toHaveBeenCalledWith({ ratingAverage: 5, reviewCount: 2 });
  });
});
