import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const initials = (name = '') => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function ProjectApplicants() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const toast = useToast();

  const load = () => api.get(`/projects/${id}/applications`).then(setData);
  useEffect(() => { load(); }, [id]);

  const setStatus = async (appId, status) => {
    await api.patch(`/applications/${appId}/status`, { status });
    toast(`Marked as ${status}.`, 'success');
    load();
  };

  if (!data) return <Spinner />;

  return (
    <>
      <div className="breadcrumb"><Link to="/dashboard/client/projects">My projects</Link> / {data.project.title}</div>
      <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>Applicants for “{data.project.title}”</h2></div>

      {data.applications.length === 0 ? (
        <div className="empty-state"><h3>No proposals yet</h3><p>Share your project link to attract applicants.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.applications.map((a) => (
            <div className="side-card" key={a.id} style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span className="avatar-lg">{initials(a.name)}</span>
                  <div>
                    <Link to={`/freelancers/${a.freelancer_id}`}><strong>{a.name}</strong></Link>
                    <div className="meta-sm">{a.title || 'Freelancer'} {a.location ? `· ${a.location}` : ''}</div>
                    {a.skills?.length > 0 && <div className="tag-row" style={{ marginTop: 8 }}>{a.skills.slice(0, 5).map((s) => <span className="tag" key={s}>{s}</span>)}</div>}
                  </div>
                </div>
                <span className={`status-pill status-${a.status}`}>{a.status}</span>
              </div>
              <p style={{ marginTop: 12, fontSize: '0.92rem', lineHeight: 1.6 }}>{a.cover_letter}</p>
              <div className="kv-row"><span className="k">Proposed rate</span><span className="v">{a.proposed_rate ? `${a.rate_currency === 'ETB' ? 'ETB ' : '$'}${a.proposed_rate}` : '—'}</span></div>
              <div className="row-actions" style={{ marginTop: 12 }}>
                <button className="btn btn--outline btn--sm" onClick={() => setStatus(a.id, 'shortlisted')} disabled={a.status === 'shortlisted'}>Shortlist</button>
                <button className="btn btn--primary btn--sm" onClick={() => setStatus(a.id, 'accepted')} disabled={a.status === 'accepted'}>Accept</button>
                <button className="btn btn--danger btn--sm" onClick={() => setStatus(a.id, 'rejected')} disabled={a.status === 'rejected'}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
