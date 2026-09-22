import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db.js';
import { HttpError, PROJECT_SKILLS_SQL, setProjectSkills, shapeProject, splitList, wrap } from '../utils.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { BUDGET_TYPES, CATEGORIES, CURRENCIES, JOB_TYPES, LEVELS, WORK_MODES } from '../constants.js';

const router = Router();

const BASE_SELECT = `
  SELECT p.*, ${PROJECT_SKILLS_SQL} AS skills,
    u.name AS client_name, cp.company_name, cp.location AS client_location,
    (SELECT COUNT(*) FROM applications a WHERE a.project_id = p.id) AS applicant_count
  FROM projects p
  JOIN users u ON u.id = p.client_id
  LEFT JOIN client_profiles cp ON cp.user_id = p.client_id`;

const projectSchema = z.object({
  title: z.string().trim().min(5, 'Give the project a clear title').max(180),
  description: z.string().trim().min(30, 'Describe the work in at least 30 characters').max(8000),
  category: z.enum(CATEGORIES),
  job_type: z.enum(JOB_TYPES),
  work_mode: z.enum(WORK_MODES),
  location: z.string().trim().max(120).optional().default(''),
  budget_min: z.coerce.number().nonnegative().optional().nullable(),
  budget_max: z.coerce.number().nonnegative().optional().nullable(),
  budget_type: z.enum(BUDGET_TYPES).default('fixed'),
  currency: z.enum(CURRENCIES).default('USD'),
  experience_level: z.enum(LEVELS).default('mid'),
  deadline: z.string().optional().nullable().transform((v) => (v ? v : null)),
  skills: z.array(z.string()).max(20).optional().default([]),
}).refine((d) => d.budget_min == null || d.budget_max == null || d.budget_max >= d.budget_min, {
  message: 'Maximum budget must be at least the minimum',
  path: ['budget_max'],
});

const SORTS = {
  newest: 'p.is_featured DESC, p.created_at DESC',
  oldest: 'p.created_at ASC',
  budget_high: 'p.budget_max DESC, p.created_at DESC',
  budget_low: 'p.budget_min ASC, p.created_at DESC',
};

// GET /api/projects  - public browse with filters
router.get('/', wrap(async (req, res) => {
  const { q, category, level, min_budget, currency, sort = 'newest' } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 10));

  const where = [`p.status = 'open'`];
  const params = [];

  const jobTypes = splitList(req.query.job_type).filter((v) => JOB_TYPES.includes(v));
  const modes = splitList(req.query.work_mode).filter((v) => WORK_MODES.includes(v));
  if (jobTypes.length) { where.push('p.job_type IN (?)'); params.push(jobTypes); }
  if (modes.length) { where.push('p.work_mode IN (?)'); params.push(modes); }
  if (category && CATEGORIES.includes(category)) { where.push('p.category = ?'); params.push(category); }
  if (level && LEVELS.includes(level)) { where.push('p.experience_level = ?'); params.push(level); }
  if (currency && CURRENCIES.includes(currency)) { where.push('p.currency = ?'); params.push(currency); }
  if (min_budget && Number(min_budget) > 0) { where.push('(p.budget_max IS NULL OR p.budget_max >= ?)'); params.push(Number(min_budget)); }
  if (req.query.featured === 'true') where.push('p.is_featured = 1');
  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    where.push(`(p.title LIKE ? OR p.description LIKE ? OR cp.company_name LIKE ? OR EXISTS (
      SELECT 1 FROM project_skills ps JOIN skills s ON s.id = ps.skill_id WHERE ps.project_id = p.id AND s.name LIKE ?))`);
    params.push(like, like, like, like);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const orderSql = SORTS[sort] || SORTS.newest;

  const total = (await one(
    `SELECT COUNT(*) AS n FROM projects p JOIN users u ON u.id = p.client_id
     LEFT JOIN client_profiles cp ON cp.user_id = p.client_id ${whereSql}`, params)).n;

  const rows = await query(`${BASE_SELECT} ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ projects: rows.map(shapeProject), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

router.get('/featured', wrap(async (_req, res) => {
  const rows = await query(`${BASE_SELECT} WHERE p.status = 'open' AND p.is_featured = 1 ORDER BY p.created_at DESC LIMIT 6`);
  res.json({ projects: rows.map(shapeProject) });
}));

// Client's own projects
router.get('/mine', requireAuth, requireRole('client'), wrap(async (req, res) => {
  const rows = await query(`${BASE_SELECT} WHERE p.client_id = ? ORDER BY p.created_at DESC`, [req.user.id]);
  res.json({ projects: rows.map(shapeProject) });
}));

router.get('/:id', optionalAuth, wrap(async (req, res) => {
  const row = await one(`${BASE_SELECT} WHERE p.id = ?`, [req.params.id]);
  if (!row) throw new HttpError(404, 'This project could not be found.');

  const project = shapeProject(row);
  const isOwner = req.user?.id === row.client_id;

  let viewer = { saved: false, application: null, isOwner };
  if (req.user) {
    viewer.saved = !!(await one('SELECT 1 AS x FROM saved_projects WHERE user_id = ? AND project_id = ?', [req.user.id, row.id]));
    viewer.application = await one('SELECT id, status, created_at FROM applications WHERE project_id = ? AND freelancer_id = ?', [row.id, req.user.id]);
  }
  const more = await query(`${BASE_SELECT} WHERE p.status = 'open' AND p.id <> ? AND p.category = ? ORDER BY p.created_at DESC LIMIT 3`, [row.id, row.category]);
  res.json({ project, viewer, related: more.map(shapeProject) });
}));

router.post('/', requireAuth, requireRole('client'), validate(projectSchema), wrap(async (req, res) => {
  const d = req.body;
  const result = await query(
    `INSERT INTO projects (client_id, title, description, category, job_type, work_mode, location, budget_min, budget_max,
      budget_type, currency, experience_level, deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.user.id, d.title, d.description, d.category, d.job_type, d.work_mode, d.location, d.budget_min ?? null, d.budget_max ?? null,
      d.budget_type, d.currency, d.experience_level, d.deadline]);
  await setProjectSkills(result.insertId, d.skills);
  res.status(201).json({ id: result.insertId });
}));

async function ownProject(req) {
  const row = await one('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!row) throw new HttpError(404, 'This project could not be found.');
  if (row.client_id !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'You can only change your own projects.');
  return row;
}

router.put('/:id', requireAuth, validate(projectSchema), wrap(async (req, res) => {
  await ownProject(req);
  const d = req.body;
  await query(
    `UPDATE projects SET title=?, description=?, category=?, job_type=?, work_mode=?, location=?, budget_min=?, budget_max=?,
      budget_type=?, currency=?, experience_level=?, deadline=? WHERE id=?`,
    [d.title, d.description, d.category, d.job_type, d.work_mode, d.location, d.budget_min ?? null, d.budget_max ?? null,
      d.budget_type, d.currency, d.experience_level, d.deadline, req.params.id]);
  await setProjectSkills(req.params.id, d.skills);
  res.json({ ok: true });
}));

router.patch('/:id/status', requireAuth, wrap(async (req, res) => {
  await ownProject(req);
  const status = req.body.status;
  if (!['open', 'closed', 'filled'].includes(status)) throw new HttpError(400, 'Choose open, closed or filled.');
  await query('UPDATE projects SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ok: true });
}));

router.delete('/:id', requireAuth, wrap(async (req, res) => {
  await ownProject(req);
  await query('DELETE FROM projects WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// --- Applications for a project ---
const applySchema = z.object({
  cover_letter: z.string().trim().min(30, 'Write at least 30 characters about why you are a fit').max(4000),
  proposed_rate: z.coerce.number().nonnegative().optional().nullable(),
});

router.post('/:id/apply', requireAuth, requireRole('freelancer'), validate(applySchema), wrap(async (req, res) => {
  const project = await one('SELECT id, status FROM projects WHERE id = ?', [req.params.id]);
  if (!project) throw new HttpError(404, 'This project could not be found.');
  if (project.status !== 'open') throw new HttpError(400, 'This project is no longer accepting applications.');
  if (await one('SELECT id FROM applications WHERE project_id = ? AND freelancer_id = ?', [project.id, req.user.id])) {
    throw new HttpError(409, 'You have already applied to this project.');
  }
  const r = await query('INSERT INTO applications (project_id, freelancer_id, cover_letter, proposed_rate) VALUES (?,?,?,?)',
    [project.id, req.user.id, req.body.cover_letter, req.body.proposed_rate ?? null]);
  res.status(201).json({ id: r.insertId });
}));

router.get('/:id/applications', requireAuth, wrap(async (req, res) => {
  const project = await ownProject(req);
  const rows = await query(
    `SELECT a.*, u.name, u.email, fp.title, fp.hourly_rate, fp.rate_currency, fp.location, fp.experience_years, fp.portfolio_url,
      (SELECT GROUP_CONCAT(s.name SEPARATOR ',') FROM freelancer_skills fs JOIN skills s ON s.id = fs.skill_id WHERE fs.user_id = u.id) AS skills
     FROM applications a JOIN users u ON u.id = a.freelancer_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
     WHERE a.project_id = ? ORDER BY FIELD(a.status,'accepted','shortlisted','pending','rejected'), a.created_at DESC`, [project.id]);
  res.json({ project: { id: project.id, title: project.title, currency: project.currency, status: project.status }, applications: rows.map((r) => ({ ...r, skills: splitList(r.skills) })) });
}));

export default router;
