import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, PROJECT_SKILLS_SQL, shapeProject, wrap } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, wrap(async (req, res) => {
  const rows = await query(
    `SELECT p.*, ${PROJECT_SKILLS_SQL} AS skills, u.name AS client_name, cp.company_name,
       (SELECT COUNT(*) FROM applications a WHERE a.project_id = p.id) AS applicant_count
     FROM saved_projects sp
     JOIN projects p ON p.id = sp.project_id
     JOIN users u ON u.id = p.client_id
     LEFT JOIN client_profiles cp ON cp.user_id = p.client_id
     WHERE sp.user_id = ? ORDER BY sp.created_at DESC`, [req.user.id]);
  res.json({ projects: rows.map(shapeProject) });
}));

// Toggle
router.post('/:projectId', requireAuth, wrap(async (req, res) => {
  if (!(await one('SELECT id FROM projects WHERE id = ?', [req.params.projectId]))) throw new HttpError(404, 'Project not found.');
  const existing = await one('SELECT 1 AS x FROM saved_projects WHERE user_id = ? AND project_id = ?', [req.user.id, req.params.projectId]);
  if (existing) {
    await query('DELETE FROM saved_projects WHERE user_id = ? AND project_id = ?', [req.user.id, req.params.projectId]);
    return res.json({ saved: false });
  }
  await query('INSERT INTO saved_projects (user_id, project_id) VALUES (?, ?)', [req.user.id, req.params.projectId]);
  res.json({ saved: true });
}));

export default router;
