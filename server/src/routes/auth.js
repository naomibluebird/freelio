import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { one, query } from '../db.js';
import { wrap, HttpError } from '../utils.js';
import { validate } from '../middleware/validate.js';
import { COOKIE_NAME, cookieOptions, optionalAuth, requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters').max(100),
  role: z.enum(['freelancer', 'client']),
  company_name: z.string().trim().max(160).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

router.post('/register', validate(registerSchema), wrap(async (req, res) => {
  const { name, email, password, role, company_name } = req.body;
  if (await one('SELECT id FROM users WHERE email = ?', [email])) throw new HttpError(409, 'An account with this email already exists.');

  const hash = await bcrypt.hash(password, 10);
  const result = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
  const id = result.insertId;

  if (role === 'freelancer') await query('INSERT INTO freelancer_profiles (user_id) VALUES (?)', [id]);
  else await query('INSERT INTO client_profiles (user_id, company_name) VALUES (?, ?)', [id, company_name || '']);

  const user = { id, name, email, role };
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.status(201).json({ user });
}));

router.post('/login', validate(loginSchema), wrap(async (req, res) => {
  const { email, password } = req.body;
  const row = await one('SELECT * FROM users WHERE email = ?', [email]);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) throw new HttpError(401, 'Email or password is incorrect.');
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.json({ user });
}));

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', optionalAuth, (req, res) => res.json({ user: req.user || null }));

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'Use at least 8 characters').max(100),
});

router.post('/change-password', requireAuth, validate(passwordSchema), wrap(async (req, res) => {
  const row = await one('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(req.body.current_password, row.password_hash))) throw new HttpError(400, 'Current password is incorrect.');
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(req.body.new_password, 10), req.user.id]);
  res.json({ ok: true });
}));

export default router;
