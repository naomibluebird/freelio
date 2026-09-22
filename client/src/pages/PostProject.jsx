import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const JOB_TYPES = ['part-time', 'full-time', 'contract'];
const WORK_MODES = ['remote', 'on-site', 'hybrid'];
const LEVELS = ['entry', 'mid', 'senior'];
const BUDGET_TYPES = ['fixed', 'hourly', 'monthly'];

const empty = {
  title: '', description: '', category: '', job_type: 'contract', work_mode: 'remote', location: '',
  budget_min: '', budget_max: '', budget_type: 'fixed', currency: 'USD', experience_level: 'mid',
  deadline: '', skillsText: '',
};

export default function PostProject() {
  const { id } = useParams(); // present when editing
  const navigate = useNavigate();
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/meta').then(setMeta); }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/projects/${id}`).then(({ project: p }) => {
      setForm({
        title: p.title, description: p.description, category: p.category, job_type: p.job_type, work_mode: p.work_mode,
        location: p.location || '', budget_min: p.budget_min ?? '', budget_max: p.budget_max ?? '', budget_type: p.budget_type,
        currency: p.currency, experience_level: p.experience_level, deadline: p.deadline || '', skillsText: (p.skills || []).join(', '),
      });
    });
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const payload = {
      ...form,
      budget_min: form.budget_min === '' ? null : Number(form.budget_min),
      budget_max: form.budget_max === '' ? null : Number(form.budget_max),
      skills: form.skillsText.split(',').map((s) => s.trim()).filter(Boolean),
    };
    delete payload.skillsText;
    try {
      if (id) {
        await api.put(`/projects/${id}`, payload);
        toast('Project updated.', 'success');
      } else {
        const r = await api.post('/projects', payload);
        toast('Project posted.', 'success');
        navigate(`/projects/${r.id}`);
        return;
      }
      navigate('/dashboard/client');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!meta) return null;

  return (
    <div className="container section">
      <div className="form-card form-card--wide">
        <h1 style={{ fontSize: '1.6rem', marginBottom: 6 }}>{id ? 'Edit project' : 'Post a project'}</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>Describe the work clearly — good briefs get better proposals.</p>
        {error && <div className="form-error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Project title</label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Build a booking page for our studio" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea required minLength={30} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What needs to be done, what you'll provide, and what a great outcome looks like." style={{ minHeight: 160 }} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select required value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="" disabled>Choose one</option>
                {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Experience level</label>
              <select value={form.experience_level} onChange={(e) => set('experience_level', e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Job type</label>
            <div className="checkbox-row">
              {JOB_TYPES.map((t) => (
                <button type="button" key={t} className={`chip-toggle${form.job_type === t ? ' active' : ''}`} onClick={() => set('job_type', t)}>{t.replace('-', ' ')}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Work mode</label>
            <div className="checkbox-row">
              {WORK_MODES.map((m) => (
                <button type="button" key={m} className={`chip-toggle${form.work_mode === m ? ' active' : ''}`} onClick={() => set('work_mode', m)}>{m}</button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Location {form.work_mode === 'remote' ? '(optional)' : ''}</label>
              <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Addis Ababa" />
            </div>
            <div className="field">
              <label>Deadline (optional)</label>
              <input type="date" value={form.deadline || ''} onChange={(e) => set('deadline', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Budget type</label>
              <select value={form.budget_type} onChange={(e) => set('budget_type', e.target.value)}>
                {BUDGET_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Currency</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                <option value="USD">USD</option>
                <option value="ETB">ETB</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Budget min</label>
              <input type="number" min="0" value={form.budget_min} onChange={(e) => set('budget_min', e.target.value)} />
            </div>
            <div className="field">
              <label>Budget max</label>
              <input type="number" min="0" value={form.budget_max} onChange={(e) => set('budget_max', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Skills needed</label>
            <input value={form.skillsText} onChange={(e) => set('skillsText', e.target.value)} placeholder="React, MySQL, Figma (comma separated)" />
          </div>

          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Post project'}</button>
        </form>
      </div>
    </div>
  );
}
