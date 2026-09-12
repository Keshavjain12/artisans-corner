import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import StarRating from './StarRating.jsx';
import EmptyState from './EmptyState.jsx';
import { Button, Field, Textarea } from './ui.jsx';
import { reviewService } from '../services/orderService.js';
import catalogService from '../services/catalogService.js';
import useAsync from '../hooks/useAsync.js';
import { formatDate } from '../utils/format.js';

export function ReviewSection({ product, onRatingChange }) {
  const user = useSelector((state) => state.auth.user);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const reviews = useAsync(
    () => catalogService.getProductReviews(product._id, { limit: 20 }),
    [product._id, user?.id]
  );
  const pending = useAsync(
    () => (user ? reviewService.pending() : Promise.resolve({ data: [] })),
    [user?.id]
  );

  const canReview = (pending.data?.data || []).some(
    (entry) => String(entry.productId) === String(product._id)
  );
  const list = reviews.data?.data?.reviews || [];
  const myReview = reviews.data?.data?.viewerReview || null;
  const distribution = reviews.data?.data?.distribution || [];
  const totalReviews = reviews.data?.meta?.total || list.length;

  const startEditing = () => {
    setRating(myReview.rating);
    setTitle(myReview.title || '');
    setComment(myReview.comment);
    setError('');
    setEditing(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = editing
        ? await reviewService.update(myReview._id, { rating, title, comment })
        : await reviewService.create({ productId: product._id, rating, title, comment });
      toast.success(editing ? 'Your review has been updated' : 'Thanks for reviewing this piece');
      setEditing(false);
      setComment('');
      setTitle('');
      setRating(5);
      onRatingChange?.(res.data);
      await Promise.all([reviews.run(), pending.run()]);
    } catch (submitError) {
      setError(submitError.message);
      toast.error(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const summary = (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl text-ink">
          {(product.ratingAverage || 0).toFixed(1)}
        </span>
        <span className="text-sm text-ink-soft">out of 5</span>
      </div>
      <StarRating value={product.ratingAverage} className="mt-2" />
      <p className="mt-1 text-sm text-ink-muted">
        Based on {product.reviewCount || 0} verified purchase
        {product.reviewCount === 1 ? '' : 's'}
      </p>

      <ul className="mt-5 space-y-1.5">
        {distribution.map((row) => {
          const percent = totalReviews ? Math.round((row.count / totalReviews) * 100) : 0;
          return (
            <li key={row.rating} className="flex items-center gap-2 text-xs text-ink-muted">
              <span className="w-12">{row.rating} star</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                <span
                  className="block h-full rounded-full bg-clay-500"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="w-6 text-right">{row.count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const form = (
    <form onSubmit={submit} className="card mb-8 space-y-4 p-5">
      <h3 className="text-base font-semibold text-ink">
        {editing ? 'Edit your review' : 'Write your review'}
      </h3>
      <div>
        <span className="label">Your rating</span>
        <StarRating value={rating} onChange={setRating} idPrefix="review-rating" />
      </div>
      <Field label="Headline" id="review-title" hint="Optional">
        {({ id }) => (
          <input
            id={id}
            className="field"
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Sums up your experience"
          />
        )}
      </Field>
      <Field label="Your review" id="review-comment" required error={error}>
        {({ id, invalid }) => (
          <Textarea
            id={id}
            rows={4}
            required
            minLength={5}
            maxLength={1500}
            invalid={invalid}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="How does it feel in your hands? How was it packed?"
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          {editing ? 'Save changes' : 'Post review'}
        </Button>
        {editing && (
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  return (
    <section className="mt-16 border-t border-sand pt-12" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-2xl text-ink">
        Reviews
      </h2>

      <div className="mt-6 grid gap-10 lg:grid-cols-[260px_1fr]">
        {summary}

        <div>
          {user && (canReview || editing) && form}

          {user && myReview && !editing && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-moss-100 px-4 py-3 text-sm text-moss-700">
              <span>You reviewed this piece on {formatDate(myReview.createdAt)}.</span>
              <button
                type="button"
                onClick={startEditing}
                className="link-underline font-medium text-moss-700"
              >
                Edit your review
              </button>
            </div>
          )}

          {user && !canReview && !myReview && !editing && (
            <p className="mb-8 rounded-xl bg-clay-50 px-4 py-3 text-sm text-ink-muted">
              Only verified buyers can review this piece - the option appears here once your order
              for it has been paid.
            </p>
          )}

          {!user && (
            <p className="mb-8 rounded-xl bg-clay-50 px-4 py-3 text-sm text-ink-muted">
              <Link to="/login" className="link-underline font-medium text-clay-700">
                Sign in
              </Link>{' '}
              to review a piece you have bought.
            </p>
          )}

          {reviews.loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No reviews yet"
              description="This piece has not been reviewed. Verified buyers can be the first."
            />
          ) : (
            <ul className="space-y-5">
              {list.map((review) => (
                <li key={review._id} className="card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-100 text-sm font-semibold text-clay-700">
                        {review.user?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink">{review.user?.name}</p>
                        <p className="text-xs text-ink-soft">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  {review.title && (
                    <h3 className="mt-3 text-sm font-semibold text-ink">{review.title}</h3>
                  )}
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{review.comment}</p>
                  <span className="badge mt-3 bg-moss-100 text-moss-700">Verified purchase</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default ReviewSection;
