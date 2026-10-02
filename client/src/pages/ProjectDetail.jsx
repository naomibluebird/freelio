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
  const [days, setDays] = useState('');
  const [questions, setQuestions] = useState('');
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState(null);
  const [profileId, setProfileId] = useState(null);

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

  const startApplying = async () => {
    setApplying(true);
    try {
      const { profiles: mine } = await api.get('/profiles/mine');
      setProfiles(mine);
      setProfileId((cur) => cur ?? (mine.find((x) => x.is_primary) || mine[0])?.id ?? null);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/projects/${p.id}/apply`, {
        profile_id: profileId,
        cover_letter: letter,
        proposed_rate: rate || null,
        estimated_days: days || null,
        questions: questions || null,
      });
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
                    <p style={{ marginBottom: 4, fontSize: '0.9rem' }}>You applied on {new Date(viewer.application.created_at).toLocaleDateString()}{viewer.application.profile_title ? ` as “${viewer.application.profile_title}”` : ''}.</p>
                    <span className={`status-pill status-${viewer.application.status}`}>{viewer.application.status}</span>
                  </>
                ) : applying ? (
                  <form onSubmit={submitApplication}>
                    <div className="field">
                      <label>Apply with profile</label>
                      {!profiles ? (
                        <span className="hint">Loading your profiles…</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {profiles.map((pr) => (
                            <label
                              key={pr.id}
                              style={{
                                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', cursor: 'pointer',
                                border: '1px solid', borderRadius: 8, fontWeight: 400,
                                borderColor: profileId === pr.id ? 'var(--primary, #2e7d32)' : 'var(--line, #ddd)',
                                background: profileId === pr.id ? 'var(--primary-soft, #e0f2f1)' : 'transparent',
                              }}
                            >
                              <input type="radio" name="profile" checked={profileId === pr.id} onChange={() => setProfileId(pr.id)} style={{ marginTop: 4 }} />
                              <span>
                                <strong>{pr.title || 'Untitled profile'}</strong>
                                {pr.is_primary && <span className="badge badge--featured" style={{ marginLeft: 6 }}>Default</span>}
                                <span className="meta-sm" style={{ display: 'block' }}>
                                  {pr.experience_level} level{pr.hourly_rate ? ` · ${pr.rate_currency === 'ETB' ? 'ETB ' : '$'}${pr.hourly_rate}/hr` : ''}
                                </span>
                                {pr.skills?.length > 0 && <span className="meta-sm" style={{ display: 'block' }}>{pr.skills.slice(0, 4).join(' · ')}</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      <span className="hint">The client sees this profile with your proposal. <Link to="/dashboard/freelancer/profile">Manage profiles</Link></span>
                    </div>
                    <div className="field">
                      <label>Cover letter</label>
                      <textarea required minLength={30} value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Why are you a good fit for this project?" />
                    </div>
                    <div className="field">
                      <label>Your proposed rate (optional)</label>
                      <input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={p.budget_type === 'hourly' ? 'Rate per hour' : 'Total project rate'} />
                      <span className="hint">{p.budget_type === 'hourly' ? 'This project is billed hourly.' : p.budget_type === 'monthly' ? 'This project is billed monthly.' : 'This project has a fixed price.'}</span>
                    </div>
                    <div className="field">
                      <label>Estimated completion time (days, optional)</label>
                      <input type="number" min="1" max="730" value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. 14" />
                    </div>
                    <div className="field">
                      <label>Questions for the client (optional)</label>
                      <textarea maxLength={1000} value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder="Anything you'd like clarified before starting?" />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn--primary" disabled={busy || !profileId}>{busy ? 'Sending…' : 'Send proposal'}</button>
                      <button type="button" className="btn btn--ghost" onClick={() => setApplying(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="btn btn--primary btn--block" onClick={startApplying}>Apply for this project</button>
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