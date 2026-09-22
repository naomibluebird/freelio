import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db.js';
import { wrap } from '../utils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/me/profile', requireAuth, requireRole('client'), wrap(async (req, res) => {
  const profile = await one(
    `SELECT u.name, u.email, cp.company_name, cp.website, cp.about, cp.location
     FROM users u LEFT JOIN client_profiles cp ON cp.user_id = u.id WHERE u.id = ?`, [req.user.id]);
  res.json({ profile });
}));

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  company_name: z.string().trim().max(160).default(''),
  website: z.string().trim().max(255).default(''),
  about: z.string().trim().max(4000).default(''),
  location: z.string().trim().max(120).default(''),
});

router.put('/me', requireAuth, requireRole('client'), validate(schema), wrap(async (req, res) => {
  const d = req.body;
  await query('UPDATE users SET name = ? WHERE id = ?', [d.name, req.user.id]);
  await query('UPDATE client_profiles SET company_name=?, website=?, about=?, location=? WHERE user_id=?',
    [d.company_name, d.website, d.about, d.location, req.user.id]);
  res.json({ ok: true });
}));

export default router;
