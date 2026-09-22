import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function FreelancerApplications() {
  const [apps, setApps] = useState(null);
  const toast = useToast();

  const load = () => api.get('/applications/mine').then((r) => setApps(r.applications));
  useEffect(() => { load(); }, []);

  const withdraw = async (id) => {
    if (!confirm('Withdraw this application?')) return;
    await api.del(`/applications/${id}`);
    toast('Application withdrawn.', 'success');
    load();
  };

  if (!apps) return <Spinner />;

  return (
    <>
      <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>My applications</h2></div>
      {apps.length === 0 ? (
        <div className="empty-state"><h3>You haven't applied to anything yet</h3></div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Project</th><th>Client</th><th>Type</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td><Link to={`/projects/${a.project_id}`}>{a.title}</Link></td>
                  <td>{a.company_name || a.client_name}</td>
                  <td>{a.job_type}</td>
                  <td><span className={`status-pill status-${a.status}`}>{a.status}</span></td>
                  <td>{a.status === 'pending' && <button className="btn btn--ghost btn--sm" onClick={() => withdraw(a.id)}>Withdraw</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
