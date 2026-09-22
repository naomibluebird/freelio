import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState(null);
  const [freelancers, setFreelancers] = useState(null);
  const [users, setUsers] = useState(null);
  const toast = useToast();

  useEffect(() => { api.get('/admin/stats').then(setStats); }, []);

  const loadProjects = () => api.get('/admin/projects').then((r) => setProjects(r.projects));
  const loadFreelancers = () => api.get('/admin/freelancers').then((r) => setFreelancers(r.freelancers));
  const loadUsers = () => api.get('/admin/users').then((r) => setUsers(r.users));

  useEffect(() => {
    if (tab === 'projects' && !projects) loadProjects();
    if (tab === 'freelancers' && !freelancers) loadFreelancers();
    if (tab === 'users' && !users) loadUsers();
  }, [tab]);

  const toggleFeatureProject = async (id, featured) => {
    await api.patch(`/admin/projects/${id}/feature`, { featured });
    toast(featured ? 'Project featured.' : 'Removed from featured.', 'success');
    loadProjects();
  };
  const toggleFeatureFreelancer = async (id, featured) => {
    await api.patch(`/admin/freelancers/${id}/feature`, { featured });
    toast(featured ? 'Freelancer featured.' : 'Removed from featured.', 'success');
    loadFreelancers();
  };
  const removeUser = async (id) => {
    if (!confirm('Remove this user? This cannot be undone.')) return;
    await api.del(`/admin/users/${id}`);
    toast('User removed.', 'success');
    loadUsers();
  };

  return (
    <div className="container section">
      <div className="section-head"><h2 style={{ fontSize: '1.6rem' }}>Admin</h2></div>

      {stats && (
        <div className="stat-row">
          <div className="mini-stat"><div className="num">{stats.users}</div><div className="label">Total users</div></div>
          <div className="mini-stat"><div className="num">{stats.openProjects}</div><div className="label">Open projects</div></div>
          <div className="mini-stat"><div className="num">{stats.applications}</div><div className="label">Applications</div></div>
          <div className="mini-stat"><div className="num">{stats.featuredProjects}</div><div className="label">Featured projects</div></div>
          <div className="mini-stat"><div className="num">{stats.featuredFreelancers}</div><div className="label">Featured freelancers</div></div>
        </div>
      )}

      <div className="checkbox-row" style={{ marginBottom: 20 }}>
        {['overview', 'projects', 'freelancers', 'users'].map((t) => (
          <button key={t} className={`chip-toggle${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && <p style={{ color: 'var(--ink-soft)' }}>Use the tabs above to manage featured listings and users.</p>}

      {tab === 'projects' && (!projects ? <Spinner /> : (
        <div className="table-card">
          <table>
            <thead><tr><th>Title</th><th>Client</th><th>Status</th><th>Proposals</th><th>Featured</th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.client_name}</td>
                  <td><span className={`status-pill status-${p.status}`}>{p.status}</span></td>
                  <td>{p.applicant_count}</td>
                  <td>
                    <button className={`btn btn--sm ${p.is_featured ? 'btn--primary' : 'btn--outline'}`} onClick={() => toggleFeatureProject(p.id, !p.is_featured)}>
                      {p.is_featured ? 'Featured' : 'Feature'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {tab === 'freelancers' && (!freelancers ? <Spinner /> : (
        <div className="table-card">
          <table>
            <thead><tr><th>Name</th><th>Title</th><th>Featured</th></tr></thead>
            <tbody>
              {freelancers.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.title}</td>
                  <td>
                    <button className={`btn btn--sm ${f.is_featured ? 'btn--primary' : 'btn--outline'}`} onClick={() => toggleFeatureFreelancer(f.id, !f.is_featured)}>
                      {f.is_featured ? 'Featured' : 'Feature'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {tab === 'users' && (!users ? <Spinner /> : (
        <div className="table-card">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>{u.role !== 'admin' && <button className="btn btn--danger btn--sm" onClick={() => removeUser(u.id)}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
