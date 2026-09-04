import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { api, registerBuyer, resetDb, startTestDb, stopTestDb } from './helpers.js';

beforeAll(startTestDb, 120000);
afterAll(stopTestDb);
beforeEach(resetDb);

describe('POST /api/auth/register', () => {
  it('creates an account and returns a token without the password', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Ava Thompson',
      email: 'ava@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.role).toBe('buyer');
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('rejects mismatched password confirmation', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Ava',
      email: 'ava2@example.com',
      password: 'Password123',
      confirmPassword: 'Password124',
    });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain('confirmPassword');
  });

  it('rejects a weak password and an invalid email', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Ava',
      email: 'not-an-email',
      password: 'short',
      confirmPassword: 'short',
    });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('refuses a duplicate email', async () => {
    await registerBuyer({ email: 'dupe@example.com' });
    const res = await api().post('/api/auth/register').send({
      name: 'Copy',
      email: 'dupe@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    expect(res.status).toBe(409);
  });

  it('ignores a self-assigned admin role', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Sneaky',
      email: 'sneaky@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      role: 'admin',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('buyer');
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with valid credentials', async () => {
    const account = await registerBuyer({ email: 'login@example.com' });
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: account.password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('rejects a wrong password without revealing which field failed', async () => {
    await registerBuyer({ email: 'login2@example.com' });
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'login2@example.com', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('requires a token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the signed-in user', async () => {
    const account = await registerBuyer();
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${account.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(account.email);
  });
});
