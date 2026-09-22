import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, wrap } from '../utils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { APPLICATION_STATUS } from '../constants.js';

const router = Router();

// Freelancer: my applications
router.get('/mine', requireAuth, requireRole('freelancer'), wrap(async (req, res) => {
  const rows = await query(
    `SELECT a.id, a.status, a.created_at, a.proposed_rate, p.id AS project_id, p.title, p.job_type, p.work_mode, p.currency, p.status AS project_status,
       cp.company_name, u.name AS client_name
     FROM applications a
     JOIN projects p ON p.id = a.project_id
     JOIN users u ON u.id = p.client_id
     LEFT JOIN client_profiles cp ON cp.user_id = p.client_id
     WHERE a.freelancer_id = ? ORDER BY a.created_at DESC`, [req.user.id]);
  res.json({ applications: rows });
}));

// Client: shortlist / accept / reject
router.patch('/:id/status', requireAuth, wrap(async (req, res) => {
  const { status } = req.body;
  if (!APPLICATION_STATUS.includes(status)) throw new HttpError(400, 'Unknown application status.');
  const row = await one(
    `SELECT a.id, p.client_id FROM applications a JOIN projects p ON p.id = a.project_id WHERE a.id = ?`, [req.params.id]);
  if (!row) throw new HttpError(404, 'Application not found.');
  if (row.client_id !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'Only the project owner can review applicants.');
  await query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ok: true });
}));

// Freelancer: withdraw
router.delete('/:id', requireAuth, requireRole('freelancer'), wrap(async (req, res) => {
  const r = await query('DELETE FROM applications WHERE id = ? AND freelancer_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Application not found.');
  res.json({ ok: true });
}));

export default router;
