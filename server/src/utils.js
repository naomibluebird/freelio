import { query } from './db.js';

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const splitList = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

/** Insert skill names (if missing) and return their ids. */
export async function skillIds(names = []) {
  const clean = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))].slice(0, 20);
  if (!clean.length) return [];
  await query('INSERT IGNORE INTO skills (name) VALUES ?', [clean.map((n) => [n.slice(0, 60)])]);
  const rows = await query('SELECT id FROM skills WHERE name IN (?)', [clean]);
  return rows.map((r) => r.id);
}

export async function setProjectSkills(projectId, names) {
  await query('DELETE FROM project_skills WHERE project_id = ?', [projectId]);
  const ids = await skillIds(names);
  if (ids.length) await query('INSERT INTO project_skills (project_id, skill_id) VALUES ?', [ids.map((id) => [projectId, id])]);
}

export async function setProfileSkills(profileId, names) {
  await query('DELETE FROM freelancer_skills WHERE profile_id = ?', [profileId]);
  const ids = await skillIds(names);
  if (ids.length) await query('INSERT INTO freelancer_skills (profile_id, skill_id) VALUES ?', [ids.map((id) => [profileId, id])]);
}

export async function setProfileCertifications(profileId, certs = []) {
  await query('DELETE FROM certifications WHERE profile_id = ?', [profileId]);
  const clean = certs.filter((c) => c && String(c.name || '').trim()).slice(0, 20);
  if (clean.length) {
    await query('INSERT INTO certifications (profile_id, name, issuer, year) VALUES ?', [
      clean.map((c) => [profileId, String(c.name).trim().slice(0, 160), String(c.issuer || '').trim().slice(0, 160), c.year || null]),
    ]);
  }
}

/** Returns { [profileId]: [{ id, name, issuer, year }] } for the given profile ids. */
export async function loadCertifications(profileIds = []) {
  const map = {};
  for (const id of profileIds) map[id] = [];
  if (!profileIds.length) return map;
  const rows = await query('SELECT id, profile_id, name, issuer, year FROM certifications WHERE profile_id IN (?) ORDER BY year DESC, id ASC', [profileIds]);
  for (const r of rows) map[r.profile_id]?.push({ id: r.id, name: r.name, issuer: r.issuer, year: r.year });
  return map;
}

export const PROJECT_SKILLS_SQL = `(SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ',')
  FROM project_skills ps JOIN skills s ON s.id = ps.skill_id WHERE ps.project_id = p.id)`;

export const FREELANCER_SKILLS_SQL = `(SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ',')
  FROM freelancer_skills fs JOIN skills s ON s.id = fs.skill_id WHERE fs.profile_id = fp.id)`;

export const shapeProject = (r) => ({
  ...r,
  is_featured: !!r.is_featured,
  skills: splitList(r.skills),
});

export const shapeFreelancer = (r) => ({
  ...r,
  is_featured: !!r.is_featured,
  skills: splitList(r.skills),
  rating: r.rating ? Number(Number(r.rating).toFixed(1)) : null,
  review_count: Number(r.review_count || 0),
});