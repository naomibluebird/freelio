import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function ClientProjects() {
  const [projects, setProjects] = useState(null);
  const toast = useToast();

  const load = () => api.get('/projects/mine').then((r) => setProjects(r.projects));
  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    await api.patch(`/projects/${id}/status`, { status });
    toast('Status updated.', 'success');
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await api.del(`/projects/${id}`);
    toast('Project deleted.', 'success');
    load();
  };

  if (!projects) return <Spinner />;

  return (
    <>
      <div className="section-head">
        <h2 style={{ fontSize: '1.5rem' }}>My projects</h2>
        <Link to="/post-project" className="btn btn--primary btn--sm">Post a project</Link>
      </div>
      {projects.length === 0 ? (
        <div className="empty-state"><h3>Nothing posted yet</h3></div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Mode</th><th>Status</th><th>Proposals</th><th></th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/projects/${p.id}`}>{p.title}</Link></td>
                  <td>{p.job_type}</td>
                  <td>{p.work_mode}</td>
                  <td>
                    <select className="select-inline" value={p.status} onChange={(e) => changeStatus(p.id, e.target.value)}>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="filled">Filled</option>
                    </select>
                  </td>
                  <td>{p.applicant_count}</td>
                  <td className="row-actions">
                    <Link to={`/dashboard/client/projects/${p.id}/applicants`} className="btn btn--outline btn--sm">Applicants</Link>
                    <Link to={`/post-project/${p.id}/edit`} className="btn btn--ghost btn--sm">Edit</Link>
                    <button className="btn btn--danger btn--sm" onClick={() => remove(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
