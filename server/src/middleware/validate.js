import { HttpError } from '../utils.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first.path.join('.') || 'input';
    return next(new HttpError(400, `${field}: ${first.message}`));
  }
  req.body = result.data;
  next();
};
