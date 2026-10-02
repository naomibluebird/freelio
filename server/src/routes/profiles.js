import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db.js';
import { FREELANCER_SKILLS_SQL, HttpError, loadCertifications, setProfileCertifications, setProfileSkills, splitList, wrap } from '../utils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AVAILABILITY, CURRENCIES, LEVELS } from '../constants.js';

const router = Router();
router.use(requireAuth, requireRole('freelancer'));

const MAX_PROFILES = 5;

const PROFILE_SELECT = `
  SELECT fp.id, fp.user_id, fp.title, fp.bio, fp.experience_level, fp.hourly_rate, fp.rate_currency, fp.location, fp.experience_years,
    fp.availability, fp.portfolio_url, fp.github_url, fp.is_primary, fp.created_at,
    ${FREELANCER_SKILLS_SQL} AS skills
  FROM freelancer_profiles fp`;

const shape = (r) => ({ ...r, is_primary: !!r.is_primary, skills: splitList(r.skills) });

router.get('/mine', wrap(async (req, res) => {
  const rows = await query(`${PROFILE_SELECT} WHERE fp.user_id = ? ORDER BY fp.is_primary DESC, fp.created_at ASC`, [req.user.id]);
  const certsByProfile = await loadCertifications(rows.map((r) => r.id));
  res.json({ profiles: rows.map((r) => ({ ...shape(r), certifications: certsByProfile[r.id] || [] })) });
}));

const certificationField = z.object({
  name: z.string().trim().min(1).max(160),
  issuer: z.string().trim().max(160).optional().default(''),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional().nullable(),
});

const profileSchema = z.object({
  title: z.string().trim().min(2, 'Give this profile a title, e.g. Video Editor').max(160),
  bio: z.string().trim().max(4000).default(''),
  experience_level: z.enum(LEVELS).default('entry'),
  hourly_rate: z.coerce.number().nonnegative().optional().nullable(),
  rate_currency: z.enum(CURRENCIES).default('USD'),
  location: z.string().trim().max(120).default(''),
  experience_years: z.coerce.number().int().min(0).max(60).default(0),
  availability: z.enum(AVAILABILITY).default('available'),
  portfolio_url: z.string().trim().max(255).default(''),
  github_url: z.string().trim().max(255).default(''),
  skills: z.array(z.string()).max(20).default([]),
  certifications: z.array(certificationField).max(20).default([]),
});

router.post('/', validate(profileSchema), wrap(async (req, res) => {
  const count = (await one('SELECT COUNT(*) AS n FROM freelancer_profiles WHERE user_id = ?', [req.user.id])).n;
  if (count >= MAX_PROFILES) throw new HttpError(400, `You can have up to ${MAX_PROFILES} profiles.`);

  const d = req.body;
  const result = await query(
    `INSERT INTO freelancer_profiles (user_id, title, bio, experience_level, hourly_rate, rate_currency, location, experience_years,
      availability, portfolio_url, github_url, is_primary) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)`,
    [req.user.id, d.title, d.bio, d.experience_level, d.hourly_rate ?? null, d.rate_currency, d.location, d.experience_years, d.availability, d.portfolio_url, d.github_url]);
  await setProfileSkills(result.insertId, d.skills);
  await setProfileCertifications(result.insertId, d.certifications);
  res.status(201).json({ id: result.insertId });
}));

async function ownProfile(req) {
  const row = await one('SELECT * FROM freelancer_profiles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!row) throw new HttpError(404, 'This profile could not be found.');
  return row;
}

router.put('/:id', validate(profileSchema), wrap(async (req, res) => {
  await ownProfile(req);
  const d = req.body;
  await query(
    `UPDATE freelancer_profiles SET title=?, bio=?, experience_level=?, hourly_rate=?, rate_currency=?, location=?, experience_years=?,
      availability=?, portfolio_url=?, github_url=? WHERE id=?`,
    [d.title, d.bio, d.experience_level, d.hourly_rate ?? null, d.rate_currency, d.location, d.experience_years, d.availability, d.portfolio_url, d.github_url, req.params.id]);
  await setProfileSkills(req.params.id, d.skills);
  await setProfileCertifications(req.params.id, d.certifications);
  res.json({ ok: true });
}));

router.patch('/:id/primary', wrap(async (req, res) => {
  await ownProfile(req);
  await query('UPDATE freelancer_profiles SET is_primary = 0 WHERE user_id = ?', [req.user.id]);
  await query('UPDATE freelancer_profiles SET is_primary = 1 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

router.delete('/:id', wrap(async (req, res) => {
  const profile = await ownProfile(req);
  const count = (await one('SELECT COUNT(*) AS n FROM freelancer_profiles WHERE user_id = ?', [req.user.id])).n;
  if (count <= 1) throw new HttpError(400, 'You need at least one profile — edit it instead of deleting it.');

  await query('DELETE FROM freelancer_profiles WHERE id = ?', [req.params.id]);

  if (profile.is_primary) {
    const next = await one('SELECT id FROM freelancer_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1', [req.user.id]);
    if (next) await query('UPDATE freelancer_profiles SET is_primary = 1 WHERE id = ?', [next.id]);
  }
  res.json({ ok: true });
}));

export default router;