import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { one, query } from '../db.js';
import { wrap, HttpError, setProfileSkills, setProfileCertifications } from '../utils.js';
import { validate } from '../middleware/validate.js';
import { COOKIE_NAME, cookieOptions, optionalAuth, requireAuth, signToken } from '../middleware/auth.js';
import { AVAILABILITY, CURRENCIES } from '../constants.js';

const router = Router();

const MIN_AGE = 18;

function isOldEnough(dateStr) {
  const dob = new Date(dateStr);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear = (today.getMonth() > dob.getMonth()) ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age >= MIN_AGE;
}

const identityFields = {
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters').max(100),
  date_of_birth: z.string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Enter a valid date')
    .refine(isOldEnough, `You must be at least ${MIN_AGE} to join Freelio`),
};

const certificationField = z.object({
  name: z.string().trim().min(1).max(160),
  issuer: z.string().trim().max(160).optional().default(''),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional().nullable(),
});

const freelancerRegisterSchema = z.object({
  role: z.literal('freelancer'),
  ...identityFields,
  title: z.string().trim().min(2, 'Tell clients what you do, e.g. Video Editor').max(160),
  bio: z.string().trim().max(4000).optional().default(''),
  hourly_rate: z.coerce.number().nonnegative().optional().nullable(),
  rate_currency: z.enum(CURRENCIES).default('USD'),
  location: z.string().trim().max(120).optional().default(''),
  experience_years: z.coerce.number().int().min(0).max(60).default(0),
  availability: z.enum(AVAILABILITY).default('available'),
  portfolio_url: z.string().trim().max(255).optional().default(''),
  github_url: z.string().trim().max(255).optional().default(''),
  skills: z.array(z.string()).max(20).optional().default([]),
  certifications: z.array(certificationField).max(20).optional().default([]),
});

const clientRegisterSchema = z.object({
  role: z.literal('client'),
  ...identityFields,
  company_name: z.string().trim().max(160).optional(),
});

const registerSchema = z.discriminatedUnion('role', [freelancerRegisterSchema, clientRegisterSchema]);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

router.post('/register', validate(registerSchema), wrap(async (req, res) => {
  const d = req.body;
  if (await one('SELECT id FROM users WHERE email = ?', [d.email])) throw new HttpError(409, 'An account with this email already exists.');

  const hash = await bcrypt.hash(d.password, 10);
  const result = await query('INSERT INTO users (name, email, password_hash, role, date_of_birth) VALUES (?, ?, ?, ?, ?)',
    [d.name, d.email, hash, d.role, d.date_of_birth]);
  const id = result.insertId;

  if (d.role === 'freelancer') {
    const profileResult = await query(
      `INSERT INTO freelancer_profiles (user_id, title, bio, hourly_rate, rate_currency, location, experience_years,
        availability, portfolio_url, github_url, is_primary) VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
      [id, d.title, d.bio, d.hourly_rate ?? null, d.rate_currency, d.location, d.experience_years, d.availability, d.portfolio_url, d.github_url]);
    await setProfileSkills(profileResult.insertId, d.skills);
    await setProfileCertifications(profileResult.insertId, d.certifications);
  } else {
    await query('INSERT INTO client_profiles (user_id, company_name) VALUES (?, ?)', [id, d.company_name || '']);
  }

  const user = { id, name: d.name, email: d.email, role: d.role };
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