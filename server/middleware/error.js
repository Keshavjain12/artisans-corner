import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Translates driver/library errors into the shared error envelope. */
function normalise(err) {
  if (err instanceof ApiError) return err;

  if (err?.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new ApiError(400, 'Please check the highlighted fields', details);
  }

  if (err?.name === 'CastError') {
    return new ApiError(400, `Invalid value for "${err.path}"`);
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new ApiError(409, `That ${field} is already in use`);
  }

  if (err?.name === 'JsonWebTokenError') return ApiError.unauthorized('Invalid session token');
  if (err?.name === 'TokenExpiredError') return ApiError.unauthorized('Your session has expired');

  if (err?.code === 'LIMIT_FILE_SIZE') return new ApiError(413, 'That image is larger than 5MB');
  if (err?.code === 'LIMIT_UNEXPECTED_FILE') return new ApiError(400, 'Too many files uploaded');

  return null;
}

 
export function errorHandler(err, req, res, _next) {
  const normalised = normalise(err);
  const apiError = normalised || new ApiError(err.statusCode || 500, err.message || 'Server error');
  const statusCode = apiError.statusCode || 500;

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = {
    success: false,
    message:
      statusCode >= 500 && env.isProd
        ? 'Something went wrong on our end. Please try again.'
        : apiError.message,
  };

  if (apiError.details) body.errors = apiError.details;
  // Stack traces never leave the server in production.
  if (!env.isProd && err.stack) body.error = err.stack;

  res.status(statusCode).json(body);
}
