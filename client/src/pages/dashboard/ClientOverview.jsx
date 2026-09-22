import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';

export default function ClientOverview() {
  const [projects, setProjects] = useState(null);

  useEffect(() => { api.get('/projects/mine').then((r) => setProjects(r.projects)); }, []);
  if (!projects) return <Spinner />;

  const open = projects.filter((p) => p.status === 'open').length;
  const totalApplicants = projects.reduce((s, p) => s + Number(p.applicant_count || 0), 0);

  return (
    <>
      <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>Overview</h2></div>
      <div className="stat-row">
        <div className="mini-stat"><div className="num">{projects.length}</div><div className="label">Total projects</div></div>
        <div className="mini-stat"><div className="num">{open}</div><div className="label">Open now</div></div>
        <div className="mini-stat"><div className="num">{totalApplicants}</div><div className="label">Total proposals</div></div>
      </div>
      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Post your first project to start receiving proposals.</p>
          <Link to="/post-project" className="btn btn--primary" style={{ marginTop: 14 }}>Post a project</Link>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Proposals</th><th></th></tr></thead>
            <tbody>
              {projects.slice(0, 6).map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/projects/${p.id}`}>{p.title}</Link></td>
                  <td>{p.job_type}</td>
                  <td><span className={`status-pill status-${p.status}`}>{p.status}</span></td>
                  <td>{p.applicant_count}</td>
                  <td><Link to={`/dashboard/client/projects/${p.id}/applicants`} className="btn btn--outline btn--sm">Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
