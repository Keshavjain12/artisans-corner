import { useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Lock } from 'lucide-react';
import { Button } from './ui.jsx';

/** Cached per publishable key so the Stripe script loads once per session. */
const stripeCache = new Map();
const getStripe = (key) => {
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key));
  return stripeCache.get(key);
};

const APPEARANCE = {
  theme: 'flat',
  variables: {
    colorPrimary: '#8F5739',
    colorBackground: '#FFFFFF',
    colorText: '#1F1B18',
    colorDanger: '#DC2626',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
};

function PaymentForm({ onPaid, amountLabel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError('');

    // `if_required` keeps the shopper on the page for card payments, while
    // still supporting redirect-based methods when Stripe needs them.
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/orders` },
    });

    if (result.error) {
      setError(result.error.message || 'That payment could not be completed.');
      setSubmitting(false);
      return;
    }

    try {
      await onPaid(result.paymentIntent.id);
    } catch (confirmError) {
      setError(confirmError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full py-3" loading={submitting} disabled={!stripe}>
        <Lock className="h-4 w-4" aria-hidden="true" />
        Pay {amountLabel}
      </Button>

      <p className="text-center text-xs text-ink-soft">
        Payments are processed by Stripe. Card details never touch our servers.
      </p>
    </form>
  );
}

export function StripeCheckout({ clientSecret, publishableKey, onPaid, amountLabel }) {
  const stripePromise = useMemo(
    () => (publishableKey ? getStripe(publishableKey) : null),
    [publishableKey]
  );

  if (!stripePromise || !clientSecret) {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Stripe is not configured on this server, so card payment is unavailable.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: APPEARANCE }}>
      <PaymentForm onPaid={onPaid} amountLabel={amountLabel} />
    </Elements>
  );
}

export default StripeCheckout;
