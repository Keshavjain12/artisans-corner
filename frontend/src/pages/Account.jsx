import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input } from '../components/ui.jsx';
import authService from '../services/authService.js';
import { setUser } from '../store/authSlice.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { formatDate } from '../utils/format.js';

export default function Account() {
  useDocumentTitle('My profile');
  const dispatch = useDispatch();
  const { user, store } = useSelector((state) => state.auth);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });
  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const saveProfile = async (values) => {
    setSavingProfile(true);
    try {
      const res = await authService.updateProfile(values);
      dispatch(setUser(res.data.user));
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (values) => {
    setSavingPassword(true);
    try {
      await authService.changePassword(values);
      toast.success('Password updated');
      passwordForm.reset();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="text-3xl text-ink">My profile</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Member since {formatDate(user?.createdAt)} &middot; signed in as {user?.email}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-ink">Your details</h2>

          <Field label="Name" id="account-name" required error={profileForm.formState.errors.name?.message}>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                {...profileForm.register('name', { required: 'Name is required' })}
              />
            )}
          </Field>

          <Field label="Phone" id="account-phone" hint="Shared with couriers only">
            {({ id }) => <Input id={id} type="tel" {...profileForm.register('phone')} />}
          </Field>

          <Field label="Email" id="account-email" hint="Email cannot be changed in this project">
            {({ id }) => <Input id={id} value={user?.email || ''} readOnly disabled />}
          </Field>

          <Button type="submit" loading={savingProfile}>
            Save changes
          </Button>
        </form>

        <div className="space-y-6">
          <form onSubmit={passwordForm.handleSubmit(savePassword)} className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold text-ink">Change password</h2>

            <Field
              label="Current password"
              id="current-password"
              required
              error={passwordForm.formState.errors.currentPassword?.message}
            >
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  invalid={invalid}
                  {...passwordForm.register('currentPassword', { required: 'Required' })}
                />
              )}
            </Field>

            <Field
              label="New password"
              id="new-password"
              required
              error={passwordForm.formState.errors.newPassword?.message}
              hint="At least 8 characters, with a letter and a number"
            >
              {({ id, invalid, describedBy }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  invalid={invalid}
                  aria-describedby={describedBy}
                  {...passwordForm.register('newPassword', {
                    required: 'Choose a new password',
                    minLength: { value: 8, message: 'Use at least 8 characters' },
                  })}
                />
              )}
            </Field>

            <Field
              label="Confirm new password"
              id="confirm-new-password"
              required
              error={passwordForm.formState.errors.confirmPassword?.message}
            >
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  invalid={invalid}
                  {...passwordForm.register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === passwordForm.watch('newPassword') || 'Passwords do not match',
                  })}
                />
              )}
            </Field>

            <Button type="submit" variant="secondary" loading={savingPassword}>
              Update password
            </Button>
          </form>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ink">Selling</h2>
            {store ? (
              <>
                <p className="mt-1.5 text-sm text-ink-muted">
                  You run <span className="font-medium text-ink">{store.name}</span> on the
                  marketplace.
                </p>
                <Link to="/dashboard/seller" className="btn-primary mt-4">
                  Open seller dashboard
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1.5 text-sm text-ink-muted">
                  Make things by hand? Open a shop with the same account - you keep 95% of every
                  sale.
                </p>
                <Link to="/become-a-seller" className="btn-primary mt-4">
                  <Store className="h-4 w-4" aria-hidden="true" />
                  Become a seller
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
