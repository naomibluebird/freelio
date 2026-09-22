import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function formatBudget(p) {
  const sym = p.currency === 'ETB' ? 'ETB ' : '$';
  const suffix = p.budget_type === 'hourly' ? '/hr' : p.budget_type === 'monthly' ? '/mo' : '';
  if (p.budget_min && p.budget_max) return `${sym}${Number(p.budget_min).toLocaleString()}–${Number(p.budget_max).toLocaleString()}${suffix}`;
  if (p.budget_max) return `Up to ${sym}${Number(p.budget_max).toLocaleString()}${suffix}`;
  if (p.budget_min) return `From ${sym}${Number(p.budget_min).toLocaleString()}${suffix}`;
  return 'On request';
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [letter, setLetter] = useState('');
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/projects/${id}`).then(setState).finally(() => setLoading(false));
  useEffect(() => { setLoading(true); load(); }, [id]);

  if (loading) return <Spinner />;
  if (!state) return null;
  const { project: p, viewer, related } = state;

  const toggleSave = async () => {
    if (!user) return toast('Log in to save projects.', 'default');
    const r = await api.post(`/saved/${p.id}`);
    setState((s) => ({ ...s, viewer: { ...s.viewer, saved: r.saved } }));
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/projects/${p.id}/apply`, { cover_letter: letter, proposed_rate: rate || null });
      toast('Proposal sent.', 'success');
      setApplying(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <div className="breadcrumb"><Link to="/projects">Find work</Link> / {p.title}</div>
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-badges">
            <span className={`badge badge--type-${p.work_mode === 'on-site' ? 'onsite' : p.work_mode}`}>{p.work_mode}</span>
            <span className="badge badge--job">{p.job_type}</span>
            <span className="badge badge--level">{p.experience_level} level</span>
            {p.is_featured && <span className="badge badge--featured">Featured</span>}
            {p.status !== 'open' && <span className={`status-pill status-${p.status}`}>{p.status}</span>}
          </div>
          <h1>{p.title}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{p.company_name || p.client_name} {p.location ? `· ${p.location}` : ''} · Posted {new Date(p.created_at).toLocaleDateString()}</p>
          {p.skills?.length > 0 && (
            <div className="tag-row" style={{ marginTop: 16 }}>{p.skills.map((s) => <span className="tag" key={s}>{s}</span>)}</div>
          )}
          <div className="detail-body">{p.description}</div>
        </div>

        <div>
          <div className="side-card">
            <h4>Budget</h4>
            <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--primary-dark)' }}>{formatBudget(p)}</div>
            <div className="kv-row"><span className="k">Category</span><span className="v">{p.category}</span></div>
            <div className="kv-row"><span className="k">Applicants</span><span className="v">{p.applicant_count}</span></div>
            {p.deadline && <div className="kv-row"><span className="k">Deadline</span><span className="v">{new Date(p.deadline).toLocaleDateString()}</span></div>}
          </div>

          {viewer.isOwner ? (
            <div className="side-card">
              <h4>Your project</h4>
              <Link to={`/dashboard/client/projects/${p.id}/applicants`} className="btn btn--primary btn--block">View applicants</Link>
            </div>
          ) : (
            <div className="side-card">
              {!user && (
                <>
                  <p style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--ink-soft)' }}>Log in as a freelancer to apply.</p>
                  <Link to="/login" className="btn btn--primary btn--block">Log in to apply</Link>
                </>
              )}
              {user?.role === 'freelancer' && p.status === 'open' && (
                viewer.application ? (
                  <>
                    <p style={{ marginBottom: 4, fontSize: '0.9rem' }}>You applied on {new Date(viewer.application.created_at).toLocaleDateString()}.</p>
                    <span className={`status-pill status-${viewer.application.status}`}>{viewer.application.status}</span>
                  </>
                ) : applying ? (
                  <form onSubmit={submitApplication}>
                    <div className="field">
                      <label>Cover letter</label>
                      <textarea required minLength={30} value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Why are you a good fit for this project?" />
                    </div>
                    <div className="field">
                      <label>Your proposed rate (optional)</label>
                      <input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn--primary" disabled={busy}>{busy ? 'Sending…' : 'Send proposal'}</button>
                      <button type="button" className="btn btn--ghost" onClick={() => setApplying(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="btn btn--primary btn--block" onClick={() => setApplying(true)}>Apply for this project</button>
                )
              )}
              {user && (
                <button className="btn btn--outline btn--block" style={{ marginTop: 10 }} onClick={toggleSave}>
                  {viewer.saved ? '★ Saved' : '☆ Save for later'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {related?.length > 0 && (
        <div className="section">
          <div className="section-head"><h2 style={{ fontSize: '1.4rem' }}>Similar projects</h2></div>
          <div className="card-grid">{related.map((r) => <ProjectCard project={r} key={r.id} />)}</div>
        </div>
      )}
    </div>
  );
}
