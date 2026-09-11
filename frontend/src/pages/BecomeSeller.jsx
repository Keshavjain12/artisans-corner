import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Check, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Textarea } from '../components/ui.jsx';
import vendorService, { uploadService } from '../services/vendorService.js';
import { fetchCurrentUser } from '../store/authSlice.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

const BENEFITS = [
  'Keep 95% of every sale - the platform fee is a flat 5%',
  'No listing fees, no monthly subscription, no ad auctions',
  'Your own storefront page, product pages and analytics',
  'Buyers can only review pieces they actually bought',
];

export default function BecomeSeller() {
  useDocumentTitle('Become a seller');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { store } = useSelector((state) => state.auth);
  const [submitting, setSubmitting] = useState(false);
  const [logo, setLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Someone who already runs a shop belongs in their dashboard.
  if (store) return <Navigate to="/dashboard/seller" replace />;

  const uploadLogo = async (file) => {
    setUploadingLogo(true);
    try {
      const res = await uploadService.storeImage(file);
      setLogo(res.data.image.url);
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await vendorService.onboard({
        name: values.name,
        tagline: values.tagline,
        description: values.description,
        logo,
        location: { city: values.city, state: values.state, country: values.country },
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
      });
      // Refresh the session so the new vendor role and store are in Redux.
      await dispatch(fetchCurrentUser());
      toast.success('Your shop is live');
      navigate('/dashboard/seller', { replace: true });
    } catch (error) {
      toast.error(error.message);
      // Name the offending fields; the message alone does not.
      (error.fieldErrors || []).forEach((issue) => toast.error(`${issue.field}: ${issue.message}`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="text-3xl text-ink sm:text-4xl">Open your shop</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Becoming a seller does not create a second account - your existing account simply gains a
            storefront, a product manager and a sales dashboard. You can keep buying as normal.
          </p>

          <ul className="mt-7 space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex gap-3 text-sm text-ink-muted">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss-100 text-moss-700">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6" noValidate>
          <h2 className="text-lg font-semibold text-ink">Your store profile</h2>

          <Field label="Store name" id="store-name" required error={errors.name?.message}>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                placeholder="Terra &amp; Thread"
                {...register('name', {
                  required: 'Your shop needs a name',
                  minLength: { value: 2, message: 'That name looks too short' },
                })}
              />
            )}
          </Field>

          <Field label="Tagline" id="store-tagline" hint="One line shoppers see on your storefront">
            {({ id }) => (
              <Input
                id={id}
                maxLength={120}
                placeholder="Slow pottery and block print from Jaipur"
                {...register('tagline')}
              />
            )}
          </Field>

          <Field
            label="About your studio"
            id="store-description"
            required
            error={errors.description?.message}
            hint="At least 20 characters - what you make, and how"
          >
            {({ id, invalid, describedBy }) => (
              <Textarea
                id={id}
                rows={5}
                invalid={invalid}
                aria-describedby={describedBy}
                {...register('description', {
                  required: 'Tell shoppers what you make',
                  minLength: { value: 20, message: 'Please write at least 20 characters' },
                })}
              />
            )}
          </Field>

          <div>
            <span className="label">Store logo</span>
            <div className="flex items-center gap-4">
              <span className="h-16 w-16 overflow-hidden rounded-xl border border-sand bg-sand">
                {logo && <img src={logo} alt="" className="h-full w-full object-cover" />}
              </span>
              <label className="btn-secondary cursor-pointer">
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    event.target.files?.[0] && uploadLogo(event.target.files[0])
                  }
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" id="store-city">
              {({ id }) => <Input id={id} {...register('city')} />}
            </Field>
            <Field label="State" id="store-state">
              {({ id }) => <Input id={id} {...register('state')} />}
            </Field>
            <Field label="Country" id="store-country">
              {({ id }) => <Input id={id} {...register('country')} />}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email" id="store-email">
              {({ id }) => <Input id={id} type="email" {...register('contactEmail')} />}
            </Field>
            <Field label="Contact phone" id="store-phone">
              {({ id }) => <Input id={id} type="tel" {...register('contactPhone')} />}
            </Field>
          </div>

          <Button type="submit" className="w-full py-3" loading={submitting}>
            Create my shop
          </Button>
        </form>
      </div>
    </div>
  );
}
