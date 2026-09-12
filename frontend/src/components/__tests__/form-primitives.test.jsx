import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Input, Select, Textarea } from '../ui.jsx';

afterEach(cleanup);

function SignUpForm({ onValid }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { name: '', email: '', bio: '', plan: '' } });

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <label htmlFor="name">Name</label>
      <Input id="name" {...register('name', { required: 'Please tell us your name' })} />
      {errors.name && <p role="alert">{errors.name.message}</p>}

      <label htmlFor="email">Email</label>
      <Input id="email" {...register('email', { required: 'Email is required' })} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <label htmlFor="bio">Bio</label>
      <Textarea id="bio" {...register('bio', { required: 'Bio is required' })} />
      {errors.bio && <p role="alert">{errors.bio.message}</p>}

      <label htmlFor="plan">Plan</label>
      <Select id="plan" {...register('plan', { required: 'Pick a plan' })}>
        <option value="">Choose</option>
        <option value="buyer">Buyer</option>
      </Select>
      {errors.plan && <p role="alert">{errors.plan.message}</p>}

      <button type="submit">Create account</button>
    </form>
  );
}

describe('form primitives forward their ref to react-hook-form', () => {
  it('submits the typed values instead of reporting empty required fields', async () => {
    const onValid = vi.fn();
    render(<SignUpForm onValid={onValid} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Keshav raj Jain' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'krj@gmail.com' } });
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'I make ceramics.' } });
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'buyer' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));

    expect(onValid.mock.calls[0][0]).toMatchObject({
      name: 'Keshav raj Jain',
      email: 'krj@gmail.com',
      bio: 'I make ceramics.',
      plan: 'buyer',
    });
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('still reports genuinely empty required fields', async () => {
    const onValid = vi.fn();
    render(<SignUpForm onValid={onValid} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(4));
    expect(onValid).not.toHaveBeenCalled();
    expect(screen.getByText('Please tell us your name')).toBeTruthy();
  });

  it('marks an invalid field for assistive technology', () => {
    render(<Input invalid aria-label="Broken field" />);
    expect(screen.getByLabelText('Broken field').getAttribute('aria-invalid')).toBe('true');
  });
});
