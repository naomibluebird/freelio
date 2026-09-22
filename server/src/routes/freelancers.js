import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db.js';
import { FREELANCER_SKILLS_SQL, HttpError, setFreelancerSkills, shapeFreelancer, splitList, wrap } from '../utils.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AVAILABILITY, CURRENCIES } from '../constants.js';

const router = Router();

const BASE_SELECT = `
  SELECT u.id, u.name, fp.title, fp.bio, fp.hourly_rate, fp.rate_currency, fp.location, fp.experience_years,
    fp.availability, fp.portfolio_url, fp.github_url, fp.is_featured, u.created_at,
    ${FREELANCER_SKILLS_SQL} AS skills,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.freelancer_id = u.id) AS rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.freelancer_id = u.id) AS review_count,
    (SELECT COUNT(*) FROM applications a WHERE a.freelancer_id = u.id AND a.status = 'accepted') AS hires
  FROM users u JOIN freelancer_profiles fp ON fp.user_id = u.id`;

const SORTS = {
  featured: 'fp.is_featured DESC, rating DESC, u.created_at DESC',
  rating: 'rating DESC, review_count DESC',
  rate_low: 'fp.hourly_rate ASC',
  rate_high: 'fp.hourly_rate DESC',
  newest: 'u.created_at DESC',
};

router.get('/', wrap(async (req, res) => {
  const { q, availability, skill, sort = 'featured' } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
  const where = [`u.role = 'freelancer'`];
  const params = [];

  if (availability && AVAILABILITY.includes(availability)) { where.push('fp.availability = ?'); params.push(availability); }
  if (skill) {
    where.push(`EXISTS (SELECT 1 FROM freelancer_skills fs JOIN skills s ON s.id = fs.skill_id WHERE fs.user_id = u.id AND s.name = ?)`);
    params.push(skill);
  }
  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    where.push(`(u.name LIKE ? OR fp.title LIKE ? OR fp.bio LIKE ? OR EXISTS (
      SELECT 1 FROM freelancer_skills fs JOIN skills s ON s.id = fs.skill_id WHERE fs.user_id = u.id AND s.name LIKE ?))`);
    params.push(like, like, like, like);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const total = (await one(`SELECT COUNT(*) AS n FROM users u JOIN freelancer_profiles fp ON fp.user_id = u.id ${whereSql}`, params)).n;
  const rows = await query(`${BASE_SELECT} ${whereSql} ORDER BY ${SORTS[sort] || SORTS.featured} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ freelancers: rows.map(shapeFreelancer), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

router.get('/featured', wrap(async (_req, res) => {
  const rows = await query(`${BASE_SELECT} WHERE u.role = 'freelancer' AND fp.is_featured = 1 ORDER BY rating DESC, u.created_at DESC LIMIT 8`);
  res.json({ freelancers: rows.map(shapeFreelancer) });
}));

// My own profile (for the edit form)
router.get('/me/profile', requireAuth, requireRole('freelancer'), wrap(async (req, res) => {
  const row = await one(`${BASE_SELECT} WHERE u.id = ?`, [req.user.id]);
  res.json({ profile: shapeFreelancer(row) });
}));

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  title: z.string().trim().max(160).default(''),
  bio: z.string().trim().max(4000).default(''),
  hourly_rate: z.coerce.number().nonnegative().optional().nullable(),
  rate_currency: z.enum(CURRENCIES).default('USD'),
  location: z.string().trim().max(120).default(''),
  experience_years: z.coerce.number().int().min(0).max(60).default(0),
  availability: z.enum(AVAILABILITY).default('available'),
  portfolio_url: z.string().trim().max(255).default(''),
  github_url: z.string().trim().max(255).default(''),
  skills: z.array(z.string()).max(20).default([]),
});

router.put('/me', requireAuth, requireRole('freelancer'), validate(profileSchema), wrap(async (req, res) => {
  const d = req.body;
  await query('UPDATE users SET name = ? WHERE id = ?', [d.name, req.user.id]);
  await query(
    `UPDATE freelancer_profiles SET title=?, bio=?, hourly_rate=?, rate_currency=?, location=?, experience_years=?,
      availability=?, portfolio_url=?, github_url=? WHERE user_id=?`,
    [d.title, d.bio, d.hourly_rate ?? null, d.rate_currency, d.location, d.experience_years, d.availability, d.portfolio_url, d.github_url, req.user.id]);
  await setFreelancerSkills(req.user.id, d.skills);
  res.json({ ok: true });
}));

router.get('/:id', optionalAuth, wrap(async (req, res) => {
  const row = await one(`${BASE_SELECT} WHERE u.id = ? AND u.role = 'freelancer'`, [req.params.id]);
  if (!row) throw new HttpError(404, 'This freelancer could not be found.');
  const reviews = await query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS client_name, p.title AS project_title
     FROM reviews r JOIN users u ON u.id = r.client_id JOIN projects p ON p.id = r.project_id
     WHERE r.freelancer_id = ? ORDER BY r.created_at DESC`, [req.params.id]);

  // Projects this client could review this freelancer for (accepted applications)
  let reviewable = [];
  if (req.user?.role === 'client') {
    reviewable = await query(
      `SELECT p.id, p.title FROM applications a JOIN projects p ON p.id = a.project_id
       WHERE a.freelancer_id = ? AND p.client_id = ? AND a.status = 'accepted'
         AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.project_id = p.id AND r.freelancer_id = a.freelancer_id AND r.client_id = p.client_id)`,
      [req.params.id, req.user.id]);
  }
  res.json({ freelancer: shapeFreelancer(row), reviews, reviewable });
}));

const reviewSchema = z.object({
  project_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(''),
});

router.post('/:id/reviews', requireAuth, requireRole('client'), validate(reviewSchema), wrap(async (req, res) => {
  const { project_id, rating, comment } = req.body;
  const ok = await one(
    `SELECT a.id FROM applications a JOIN projects p ON p.id = a.project_id
     WHERE a.freelancer_id = ? AND a.project_id = ? AND p.client_id = ? AND a.status = 'accepted'`,
    [req.params.id, project_id, req.user.id]);
  if (!ok) throw new HttpError(403, 'You can review a freelancer after accepting their application on your project.');
  try {
    await query('INSERT INTO reviews (freelancer_id, client_id, project_id, rating, comment) VALUES (?,?,?,?,?)',
      [req.params.id, req.user.id, project_id, rating, comment]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'You already reviewed this freelancer for that project.');
    throw e;
  }
  res.status(201).json({ ok: true });
}));

export default router;
