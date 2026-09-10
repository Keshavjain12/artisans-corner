import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button, Field, Input } from '../components/ui.jsx';
import { register as registerUser } from '../store/authSlice.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export default function Register() {
  useDocumentTitle('Create an account');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, status, error } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });
  const password = watch('password');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const onSubmit = async (values) => {
    const result = await dispatch(registerUser(values));
    if (registerUser.fulfilled.match(result)) {
      toast.success('Welcome to Artisan\u2019s Corner');
    }
  };

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="card p-7">
          <h1 className="text-2xl text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            One account to buy handmade goods - and to open your own shop whenever you are ready.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Field label="Name" id="name" required error={errors.name?.message}>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  autoComplete="name"
                  invalid={invalid}
                  {...register('name', {
                    required: 'Please tell us your name',
                    minLength: { value: 2, message: 'That name looks too short' },
                  })}
                />
              )}
            </Field>

            <Field label="Email" id="email" required error={errors.email?.message}>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  invalid={invalid}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                  })}
                />
              )}
            </Field>

            <Field
              label="Password"
              id="password"
              required
              error={errors.password?.message}
              hint="At least 8 characters, with a letter and a number"
            >
              {({ id, invalid, describedBy }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  invalid={invalid}
                  aria-describedby={describedBy}
                  {...register('password', {
                    required: 'Please choose a password',
                    minLength: { value: 8, message: 'Use at least 8 characters' },
                    validate: {
                      hasLetter: (value) => /[a-zA-Z]/.test(value) || 'Include at least one letter',
                      hasNumber: (value) => /[0-9]/.test(value) || 'Include at least one number',
                    },
                  })}
                />
              )}
            </Field>

            <Field
              label="Confirm password"
              id="confirmPassword"
              required
              error={errors.confirmPassword?.message}
            >
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  invalid={invalid}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                />
              )}
            </Field>

            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full py-3" loading={status === 'loading'}>
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="link-underline font-medium text-clay-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
