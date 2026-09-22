import jwt from 'jsonwebtoken';
import { HttpError } from '../utils.js';
import { one } from '../db.js';

const SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';

export const COOKIE_NAME = 'freelio_token';

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, SECRET(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

async function loadUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET());
    return await one('SELECT id, name, email, role FROM users WHERE id = ?', [payload.id]);
  } catch {
    return null;
  }
}

/** Attaches req.user when logged in, but never blocks. */
export const optionalAuth = async (req, _res, next) => {
  try {
    req.user = await loadUser(req);
    next();
  } catch (e) {
    next(e);
  }
};

export const requireAuth = async (req, _res, next) => {
  try {
    req.user = await loadUser(req);
    if (!req.user) throw new HttpError(401, 'Please log in to continue.');
    next();
  } catch (e) {
    next(e);
  }
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have access to this action.'));
  next();
};
