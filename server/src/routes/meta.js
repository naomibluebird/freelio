import { Router } from 'express';
import { query, one } from '../db.js';
import { wrap } from '../utils.js';
import { AVAILABILITY, BUDGET_TYPES, CATEGORIES, CURRENCIES, JOB_TYPES, LEVELS, WORK_MODES } from '../constants.js';

const router = Router();

router.get('/meta', wrap(async (_req, res) => {
  const skills = await query('SELECT name FROM skills ORDER BY name');
  const counts = await query(`SELECT category, COUNT(*) AS n FROM projects WHERE status = 'open' GROUP BY category`);
  res.json({
    categories: CATEGORIES,
    categoryCounts: Object.fromEntries(counts.map((c) => [c.category, c.n])),
    jobTypes: JOB_TYPES,
    workModes: WORK_MODES,
    budgetTypes: BUDGET_TYPES,
    currencies: CURRENCIES,
    levels: LEVELS,
    availability: AVAILABILITY,
    skills: skills.map((s) => s.name),
  });
}));

router.get('/stats', wrap(async (_req, res) => {
  const p = await one(`SELECT COUNT(*) AS n FROM projects WHERE status = 'open'`);
  const f = await one(`SELECT COUNT(*) AS n FROM users WHERE role = 'freelancer'`);
  const c = await one(`SELECT COUNT(*) AS n FROM users WHERE role = 'client'`);
  const h = await one(`SELECT COUNT(*) AS n FROM applications WHERE status = 'accepted'`);
  res.json({ openProjects: p.n, freelancers: f.n, clients: c.n, hires: h.n });
}));

export default router;
