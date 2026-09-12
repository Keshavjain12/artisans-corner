import { describe, expect, it, jest } from '@jest/globals';

jest.unstable_mockModule('../config/env.js', () => ({
  default: { isProd: true, nodeEnv: 'production' },
}));

const { errorHandler } = await import('../middleware/error.js');
const { default: ApiError } = await import('../utils/ApiError.js');

const run = (err) => {
  const req = { method: 'POST', originalUrl: '/api/uploads/products' };
  let status;
  let body;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
  let loggedCalls = 0;
  try {
    errorHandler(err, req, res, () => {});
    loggedCalls = logged.mock.calls.length;
  } finally {
    logged.mockRestore();
  }

  return { status, body, loggedCalls };
};

describe('the error envelope in production', () => {
  it('never returns a stack trace', () => {
    const boom = new Error('connect ECONNREFUSED 10.0.0.5:27017');
    boom.statusCode = 502;

    const { status, body } = run(boom);

    expect(status).toBe(502);
    expect(body.error).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|artisans-corner\\backend|\.js:\d/);
  });

  it('replaces a server fault with a sentence that gives nothing away', () => {
    const { body } = run(new Error('Mongo auth failed for user seed_admin'));

    expect(body.success).toBe(false);
    expect(body.message).toBe('Something went wrong on our end. Please try again.');
    expect(body.message).not.toMatch(/seed_admin|Mongo/);
  });

  it('still logs the fault server-side, where the operator can see it', () => {
    const { loggedCalls } = run(new Error('Cloudinary is down'));
    expect(loggedCalls).toBeGreaterThan(0);
  });

  it('keeps a 4xx message intact, because that one is meant for the client', () => {
    const { status, body } = run(ApiError.badRequest('That image is larger than 5MB'));

    expect(status).toBe(400);
    expect(body.message).toBe('That image is larger than 5MB');
    expect(body.error).toBeUndefined();
  });

  it('keeps field-level validation details, which came from the client anyway', () => {
    const { body } = run(
      new ApiError(400, 'Please check the highlighted fields', [
        { field: 'price', message: 'Price must be at least 1' },
      ])
    );

    expect(body.errors).toEqual([{ field: 'price', message: 'Price must be at least 1' }]);
  });

  it('does not log a client mistake as a server fault', () => {
    const { loggedCalls } = run(ApiError.notFound('Route not found: GET /api/nope'));
    expect(loggedCalls).toBe(0);
  });
});
