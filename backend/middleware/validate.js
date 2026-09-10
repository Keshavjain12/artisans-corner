import ApiError from '../utils/ApiError.js';

/**
 * Validates and *replaces* the given request part with the parsed result, so
 * controllers only ever see whitelisted, coerced values.
 * Usage: `router.post('/', validate(createProductSchema), controller)`
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Please check the highlighted fields', details));
    }
    if (source === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    return next();
  };

export default validate;
