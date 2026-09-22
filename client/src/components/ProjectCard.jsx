import { Link } from 'react-router-dom';

const modeBadge = { remote: 'type-remote', 'on-site': 'type-onsite', hybrid: 'type-hybrid' };

function formatBudget(p) {
  const sym = p.currency === 'ETB' ? 'ETB ' : '$';
  const suffix = p.budget_type === 'hourly' ? '/hr' : p.budget_type === 'monthly' ? '/mo' : '';
  if (p.budget_min && p.budget_max) return `${sym}${Number(p.budget_min).toLocaleString()}–${Number(p.budget_max).toLocaleString()}${suffix}`;
  if (p.budget_max) return `Up to ${sym}${Number(p.budget_max).toLocaleString()}${suffix}`;
  if (p.budget_min) return `From ${sym}${Number(p.budget_min).toLocaleString()}${suffix}`;
  return 'Budget on request';
}

export default function ProjectCard({ project, onToggleSave, saved }) {
  return (
    <article className={`project-card${project.is_featured ? ' is-featured' : ''}`}>
      <div className="card-top">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge badge--${modeBadge[project.work_mode]}`}>{project.work_mode}</span>
          <span className="badge badge--job">{project.job_type}</span>
          {project.is_featured && <span className="badge badge--featured">✦ Featured</span>}
        </div>
        {onToggleSave && (
          <button className={`save-btn${saved ? ' active' : ''}`} onClick={() => onToggleSave(project.id)} aria-label="Save project" title="Save project">
            {saved ? '★' : '☆'}
          </button>
        )}
      </div>
      <Link to={`/projects/${project.id}`}>
        <h3>{project.title}</h3>
      </Link>
      <div className="company">{project.company_name || project.client_name}{project.location ? ` · ${project.location}` : ''}</div>
      <p className="desc">{project.description}</p>
      {project.skills?.length > 0 && (
        <div className="tag-row">
          {project.skills.slice(0, 4).map((s) => <span className="tag" key={s}>{s}</span>)}
        </div>
      )}
      <div className="card-bottom">
        <span className="budget">{formatBudget(project)}</span>
        <span className="meta-sm">{project.applicant_count ?? 0} proposals</span>
      </div>
      <Link to={`/projects/${project.id}`} className="card-view-link">
        View details <span className="arrow">→</span>
      </Link>
    </article>
  );
}
