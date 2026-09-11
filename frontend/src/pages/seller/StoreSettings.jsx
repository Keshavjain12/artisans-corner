import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { ExternalLink, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Button, Field, Input, PageHeader, Spinner, Textarea } from '../../components/ui.jsx';
import vendorService, { uploadService } from '../../services/vendorService.js';
import { fetchCurrentUser } from '../../store/authSlice.js';
import useAsync from '../../hooks/useAsync.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function StoreSettings() {
  useDocumentTitle('Store settings');
  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState('');
  const [banner, setBanner] = useState('');
  const [uploading, setUploading] = useState('');

  const { data, loading, run } = useAsync(() => vendorService.myStore(), []);
  const store = data?.data?.store;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!store) return;
    reset({
      name: store.name,
      tagline: store.tagline || '',
      description: store.description,
      city: store.location?.city || '',
      state: store.location?.state || '',
      country: store.location?.country || '',
      contactEmail: store.contactEmail || '',
      contactPhone: store.contactPhone || '',
      isActive: store.isActive,
    });
    setLogo(store.logo || '');
    setBanner(store.banner || '');
  }, [store, reset]);

  const upload = async (file, kind) => {
    setUploading(kind);
    try {
      const res = await uploadService.storeImage(file);
      if (kind === 'logo') setLogo(res.data.image.url);
      else setBanner(res.data.image.url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading('');
    }
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      await vendorService.updateStore({
        name: values.name,
        tagline: values.tagline,
        description: values.description,
        logo,
        banner,
        location: { city: values.city, state: values.state, country: values.country },
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        isActive: Boolean(values.isActive),
      });
      await Promise.all([run(), dispatch(fetchCurrentUser())]);
      toast.success('Store profile updated');
    } catch (error) {
      toast.error(error.message);
      (error.fieldErrors || []).forEach((issue) => toast.error(`${issue.field}: ${issue.message}`));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading store" />
      </div>
    );
  }

  const profileCard = (
    <div className="card space-y-4 p-6 xl:col-span-2">
      <h2 className="text-sm font-semibold text-ink">Profile</h2>

      <Field label="Store name" id="store-name" required error={errors.name?.message}>
        {({ id, invalid }) => (
          <Input
            id={id}
            invalid={invalid}
            {...register('name', { required: 'Your shop needs a name' })}
          />
        )}
      </Field>

      <Field label="Tagline" id="tagline">
        {({ id }) => <Input id={id} maxLength={120} {...register('tagline')} />}
      </Field>

      <Field label="About your studio" id="description" required error={errors.description?.message}>
        {({ id, invalid }) => (
          <Textarea
            id={id}
            rows={6}
            invalid={invalid}
            {...register('description', {
              required: 'Tell shoppers what you make',
              minLength: { value: 20, message: 'Please write at least 20 characters' },
            })}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" id="city">
          {({ id }) => <Input id={id} {...register('city')} />}
        </Field>
        <Field label="State" id="state">
          {({ id }) => <Input id={id} {...register('state')} />}
        </Field>
        <Field label="Country" id="country">
          {({ id }) => <Input id={id} {...register('country')} />}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact email" id="contactEmail">
          {({ id }) => <Input id={id} type="email" {...register('contactEmail')} />}
        </Field>
        <Field label="Contact phone" id="contactPhone">
          {({ id }) => <Input id={id} type="tel" {...register('contactPhone')} />}
        </Field>
      </div>
    </div>
  );

  const imageryCard = (
    <div className="card space-y-5 p-6">
      <h2 className="text-sm font-semibold text-ink">Imagery</h2>

      <div>
        <span className="label">Logo</span>
        <div className="flex items-center gap-4">
          <span className="h-16 w-16 overflow-hidden rounded-xl border border-sand bg-sand">
            {logo && <img src={logo} alt="" className="h-full w-full object-cover" />}
          </span>
          <label className="btn-secondary cursor-pointer">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {uploading === 'logo' ? 'Uploading...' : 'Change'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], 'logo')}
            />
          </label>
        </div>
      </div>

      <div>
        <span className="label">Banner</span>
        <span className="block h-24 w-full overflow-hidden rounded-xl border border-sand bg-sand">
          {banner && <img src={banner} alt="" className="h-full w-full object-cover" />}
        </span>
        <label className="btn-secondary mt-3 cursor-pointer">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {uploading === 'banner' ? 'Uploading...' : 'Change banner'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], 'banner')}
          />
        </label>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Store settings"
        subtitle="How your shop appears to buyers across the marketplace."
        action={
          store && (
            <Link to={`/shop/${store.slug}`} className="btn-secondary">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View storefront
            </Link>
          )
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-6 xl:grid-cols-3" noValidate>
        {profileCard}

        <div className="space-y-6">
          {imageryCard}

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-ink">Availability</h2>
            <label className="mt-3 flex items-start gap-2.5 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-sand text-clay-600 focus:ring-clay-400"
                {...register('isActive')}
              />
              <span>
                Shop is open. Unchecking this hides your storefront and every product from the
                marketplace until you re-open.
              </span>
            </label>
          </div>

          <Button type="submit" className="w-full py-3" loading={saving}>
            Save store profile
          </Button>
        </div>
      </form>
    </div>
  );
}
