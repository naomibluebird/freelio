import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, wrap } from '../utils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/stats', wrap(async (_req, res) => {
  const [users, projects, open, applications, featuredP, featuredF] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM users'),
    one('SELECT COUNT(*) AS n FROM projects'),
    one(`SELECT COUNT(*) AS n FROM projects WHERE status = 'open'`),
    one('SELECT COUNT(*) AS n FROM applications'),
    one('SELECT COUNT(*) AS n FROM projects WHERE is_featured = 1'),
    one('SELECT COUNT(*) AS n FROM freelancer_profiles WHERE is_featured = 1'),
  ]);
  res.json({
    users: users.n, projects: projects.n, openProjects: open.n, applications: applications.n,
    featuredProjects: featuredP.n, featuredFreelancers: featuredF.n,
  });
}));

router.get('/projects', wrap(async (_req, res) => {
  const rows = await query(
    `SELECT p.id, p.title, p.status, p.job_type, p.work_mode, p.is_featured, p.created_at, u.name AS client_name,
       (SELECT COUNT(*) FROM applications a WHERE a.project_id = p.id) AS applicant_count
     FROM projects p JOIN users u ON u.id = p.client_id ORDER BY p.created_at DESC LIMIT 200`);
  res.json({ projects: rows.map((r) => ({ ...r, is_featured: !!r.is_featured })) });
}));

router.get('/freelancers', wrap(async (_req, res) => {
  const rows = await query(
    `SELECT u.id, u.name, fp.title, fp.is_featured FROM users u JOIN freelancer_profiles fp ON fp.user_id = u.id ORDER BY u.created_at DESC LIMIT 200`);
  res.json({ freelancers: rows.map((r) => ({ ...r, is_featured: !!r.is_featured })) });
}));

router.get('/users', wrap(async (_req, res) => {
  res.json({ users: await query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 300') });
}));

router.patch('/projects/:id/feature', wrap(async (req, res) => {
  const r = await query('UPDATE projects SET is_featured = ? WHERE id = ?', [req.body.featured ? 1 : 0, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Project not found.');
  res.json({ ok: true });
}));

router.patch('/freelancers/:id/feature', wrap(async (req, res) => {
  const r = await query('UPDATE freelancer_profiles SET is_featured = ? WHERE user_id = ?', [req.body.featured ? 1 : 0, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Freelancer not found.');
  res.json({ ok: true });
}));

router.delete('/users/:id', wrap(async (req, res) => {
  const target = await one('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.role === 'admin') throw new HttpError(400, 'Admin accounts cannot be removed here.');
  await query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

export default router;
