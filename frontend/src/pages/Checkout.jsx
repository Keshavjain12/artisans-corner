import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Check, CreditCard, Lock, MapPin, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import StripeCheckout from '../components/StripeCheckout.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Button, Field, Input } from '../components/ui.jsx';
import { paymentService } from '../services/orderService.js';
import { clearCart, selectCartSubtotal } from '../store/cartSlice.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatCurrency } from '../utils/format.js';
import cn from '../utils/cn.js';

const STEPS = [
  { id: 1, label: 'Review cart', icon: ShoppingBag },
  { id: 2, label: 'Shipping', icon: MapPin },
  { id: 3, label: 'Payment', icon: CreditCard },
];

export default function Checkout() {
  useDocumentTitle('Checkout');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart.items);
  const subtotal = useSelector(selectCartSubtotal);
  const user = useSelector((state) => state.auth.user);

  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [payError, setPayError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: user?.defaultShippingAddress?.fullName || user?.name || '',
      addressLine1: user?.defaultShippingAddress?.addressLine1 || '',
      addressLine2: user?.defaultShippingAddress?.addressLine2 || '',
      city: user?.defaultShippingAddress?.city || '',
      state: user?.defaultShippingAddress?.state || '',
      postalCode: user?.defaultShippingAddress?.postalCode || '',
      country: user?.defaultShippingAddress?.country || '',
      phone: user?.defaultShippingAddress?.phone || user?.phone || '',
      saveAddress: true,
    },
  });

  if (items.length === 0 && !intent) {
    return (
      <div className="container-page py-16">
        <EmptyState
          as="h1"
          icon={ShoppingBag}
          title="There is nothing to check out"
          description="Add a piece to your cart and come back to complete your order."
          action={
            <Link to="/shop" className="btn-primary">
              Browse the marketplace
            </Link>
          }
        />
      </div>
    );
  }

  const startPayment = async (values) => {
    setCreating(true);
    setPayError('');
    try {
      const res = await paymentService.createIntent({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingAddress: {
          fullName: values.fullName,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2 || '',
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: values.country,
          phone: values.phone,
        },
        saveAddress: Boolean(values.saveAddress),
      });
      setIntent(res.data);
      setStep(3);
    } catch (error) {
      setPayError(error.message);
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const finishPayment = async (paymentIntentId) => {
    const res = await paymentService.confirm(paymentIntentId);
    dispatch(clearCart());
    toast.success('Payment received - thank you');
    navigate(`/order-confirmation/${res.data.order._id}`, { replace: true });
  };

  const totals = intent?.totals;

  const summary = (
    <aside className="lg:sticky lg:top-24 lg:h-fit">
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand">
                {item.image && (
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] text-white">
                  {item.quantity}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{item.name}</span>
                <span className="block truncate text-xs text-ink-soft">{item.vendorName}</span>
              </span>
              <span className="text-sm text-ink">{formatCurrency(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2.5 border-t border-sand pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="text-ink">{formatCurrency(totals?.subtotal ?? subtotal)}</dd>
          </div>
          {totals && (
            <>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="text-ink">
                  {totals.shippingCost === 0 ? 'Free' : formatCurrency(totals.shippingCost)}
                </dd>
              </div>
              {totals.tax > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Tax</dt>
                  <dd className="text-ink">{formatCurrency(totals.tax)}</dd>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between border-t border-sand pt-3 text-base">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="font-semibold text-ink">
              {formatCurrency(totals?.total ?? subtotal)}
            </dd>
          </div>
        </dl>

        {!totals && (
          <p className="mt-3 text-xs text-ink-soft">
            Shipping and the final total are confirmed by our server on the next step.
          </p>
        )}
      </div>
    </aside>
  );

  const shippingForm = (
    <form onSubmit={handleSubmit(startPayment)} className="card space-y-4 p-6" noValidate>
      <h2 className="text-lg font-semibold text-ink">Where should this go?</h2>

      <Field label="Full name" id="fullName" required error={errors.fullName?.message}>
        {({ id, invalid, describedBy }) => (
          <Input
            id={id}
            invalid={invalid}
            aria-describedby={describedBy}
            autoComplete="name"
            {...register('fullName', {
              required: 'Please enter the recipient name',
              minLength: { value: 2, message: 'That name looks too short' },
            })}
          />
        )}
      </Field>

      <Field label="Address" id="addressLine1" required error={errors.addressLine1?.message}>
        {({ id, invalid }) => (
          <Input
            id={id}
            invalid={invalid}
            autoComplete="address-line1"
            {...register('addressLine1', {
              required: 'Please enter a street address',
              minLength: { value: 4, message: 'That address looks too short' },
            })}
          />
        )}
      </Field>

      <Field label="Apartment, suite (optional)" id="addressLine2">
        {({ id }) => <Input id={id} autoComplete="address-line2" {...register('addressLine2')} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" id="city" required error={errors.city?.message}>
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              autoComplete="address-level2"
              {...register('city', { required: 'City is required' })}
            />
          )}
        </Field>
        <Field label="State / region" id="state" required error={errors.state?.message}>
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              autoComplete="address-level1"
              {...register('state', { required: 'State or region is required' })}
            />
          )}
        </Field>
        <Field label="Postal code" id="postalCode" required error={errors.postalCode?.message}>
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              autoComplete="postal-code"
              {...register('postalCode', {
                required: 'Postal code is required',
                minLength: { value: 3, message: 'Enter a valid postal code' },
              })}
            />
          )}
        </Field>
        <Field label="Country" id="country" required error={errors.country?.message}>
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              autoComplete="country-name"
              {...register('country', { required: 'Country is required' })}
            />
          )}
        </Field>
      </div>

      <Field label="Phone" id="phone" required error={errors.phone?.message} hint="Used by the courier only">
        {({ id, invalid }) => (
          <Input
            id={id}
            type="tel"
            invalid={invalid}
            autoComplete="tel"
            {...register('phone', {
              required: 'A contact number is required for delivery',
              minLength: { value: 6, message: 'Enter a valid phone number' },
            })}
          />
        )}
      </Field>

      <label className="flex items-center gap-2.5 text-sm text-ink-muted">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-sand text-clay-600 focus:ring-clay-400"
          {...register('saveAddress')}
        />
        Save this address for next time
      </label>

      {payError && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
          {payError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button type="submit" loading={creating} className="flex-1 py-3">
          Continue to payment
        </Button>
      </div>
    </form>
  );

  const paymentPanel = intent ? (
    <div className="card space-y-5 p-6">
      <h2 className="text-lg font-semibold text-ink">Payment</h2>

      {intent?.provider === 'stripe' ? (
        <StripeCheckout
          clientSecret={intent.clientSecret}
          publishableKey={intent.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY}
          amountLabel={formatCurrency(intent.totals.total)}
          onPaid={finishPayment}
        />
      ) : (
        <>
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Simulated payment mode</p>
            <p className="mt-1 text-amber-800">
              This server has no Stripe keys configured, so the payment is simulated. The order,
              inventory movement, commission and vendor payout are all created for real.
            </p>
          </div>
          <Button
            className="w-full py-3"
            loading={creating}
            onClick={async () => {
              setCreating(true);
              setPayError('');
              try {
                await finishPayment(intent.paymentIntentId);
              } catch (error) {
                setPayError(error.message);
                toast.error(error.message);
              } finally {
                setCreating(false);
              }
            }}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Complete simulated payment of {formatCurrency(intent.totals.total)}
          </Button>
        </>
      )}

      {payError && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
          {payError}
        </p>
      )}

      <p className="text-xs text-ink-soft">
        Order <span className="font-medium text-ink">{intent.orderNumber}</span> is reserved and
        will only be confirmed once payment succeeds.
      </p>
    </div>
  ) : null;

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="text-3xl text-ink">Checkout</h1>

      <ol className="mt-8 flex flex-wrap items-center gap-3" aria-label="Checkout progress">
        {STEPS.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm',
                step > entry.id
                  ? 'bg-moss-500 text-white'
                  : step === entry.id
                    ? 'bg-clay-600 text-white'
                    : 'bg-sand text-ink-soft'
              )}
              aria-current={step === entry.id ? 'step' : undefined}
            >
              {step > entry.id ? <Check className="h-4 w-4" aria-hidden="true" /> : entry.id}
            </span>
            <span
              className={cn(
                'text-sm',
                step === entry.id ? 'font-medium text-ink' : 'text-ink-muted'
              )}
            >
              {entry.label}
            </span>
            {entry.id !== STEPS.length && (
              <span className="mx-2 hidden h-px w-8 bg-sand sm:block" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {step === 1 && (
            <div className="card space-y-5 p-6">
              <h2 className="text-lg font-semibold text-ink">Review your cart</h2>
              <p className="text-sm text-ink-muted">
                {items.length} item{items.length === 1 ? '' : 's'} from{' '}
                {new Set(items.map((item) => item.vendorName)).size} studio(s). You can still change
                quantities in your{' '}
                <Link to="/cart" className="link-underline text-clay-700">
                  cart
                </Link>
                .
              </p>
              <Button className="w-full py-3" onClick={() => setStep(2)}>
                Continue to shipping
              </Button>
            </div>
          )}

          {step === 2 && shippingForm}
          {step === 3 && intent && paymentPanel}
        </div>

        {summary}
      </div>
    </div>
  );
}
