import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button, Field, Input } from '../components/ui.jsx';
import { login } from '../store/authSlice.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

const DEMO_ACCOUNTS = [
  { label: 'Demo buyer', email: 'buyer@artisanscorner.demo', password: 'DemoBuyer123!' },
  { label: 'Demo vendor', email: 'vendor@artisanscorner.demo', password: 'DemoVendor123!' },
  { label: 'Demo admin', email: 'admin@artisanscorner.demo', password: 'DemoAdmin123!' },
];

export default function Login() {
  useDocumentTitle('Sign in');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { user, status, error } = useSelector((state) => state.auth);

  /* Only in-app paths: "?redirect=https://elsewhere" must not survive, and a
     protocol-relative "//host" is a URL to somebody else's site. */
  const requested = params.get('redirect') || location.state?.from?.pathname || '/';
  const redirectTo = /^\/(?!\/)/.test(requested) ? requested : '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '' } });

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const onSubmit = async (values) => {
    const result = await dispatch(login(values));
    if (login.fulfilled.match(result)) {
      toast.success(result.payload.message || 'Signed in');
    }
  };

  const fillDemoAccount = (account) => {
    setValue('email', account.email);
    setValue('password', account.password);
  };

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="card p-7">
          <h1 className="text-2xl text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Sign in to track orders, review pieces and manage your shop.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Field label="Email" id="email" required error={errors.email?.message}>
              {({ id, invalid, describedBy }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  invalid={invalid}
                  aria-describedby={describedBy}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                  })}
                />
              )}
            </Field>

            <Field label="Password" id="password" required error={errors.password?.message}>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  invalid={invalid}
                  {...register('password', { required: 'Password is required' })}
                />
              )}
            </Field>

            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full py-3" loading={status === 'loading'}>
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-muted">
            New here?{' '}
            <Link to="/register" className="link-underline font-medium text-clay-700">
              Create an account
            </Link>
          </p>
        </div>

        <div className="card mt-4 p-5">
          <h2 className="text-sm font-semibold text-ink">Demo accounts</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Seeded by <code className="rounded bg-sand px-1">npm run seed</code>. One click fills the
            form.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemoAccount(account)}
                className="badge bg-sand text-ink-muted hover:bg-clay-100 hover:text-clay-800"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
