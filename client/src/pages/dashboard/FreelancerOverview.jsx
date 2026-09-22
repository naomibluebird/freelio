import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';

export default function FreelancerOverview() {
  const [apps, setApps] = useState(null);

  useEffect(() => { api.get('/applications/mine').then((r) => setApps(r.applications)); }, []);
  if (!apps) return <Spinner />;

  const accepted = apps.filter((a) => a.status === 'accepted').length;
  const pending = apps.filter((a) => a.status === 'pending').length;

  return (
    <>
      <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>Overview</h2></div>
      <div className="stat-row">
        <div className="mini-stat"><div className="num">{apps.length}</div><div className="label">Total applications</div></div>
        <div className="mini-stat"><div className="num">{pending}</div><div className="label">Awaiting response</div></div>
        <div className="mini-stat"><div className="num">{accepted}</div><div className="label">Accepted</div></div>
      </div>
      {apps.length === 0 ? (
        <div className="empty-state">
          <h3>No applications yet</h3>
          <p>Browse open projects and send your first proposal.</p>
          <Link to="/projects" className="btn btn--primary" style={{ marginTop: 14 }}>Browse projects</Link>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Applied</th></tr></thead>
            <tbody>
              {apps.slice(0, 8).map((a) => (
                <tr key={a.id}>
                  <td><Link to={`/projects/${a.project_id}`}>{a.title}</Link></td>
                  <td>{a.company_name || a.client_name}</td>
                  <td><span className={`status-pill status-${a.status}`}>{a.status}</span></td>
                  <td>{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
