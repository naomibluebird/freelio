import FreelancerCard from '../components/FreelancerCard.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import ProjectCard from '../components/ProjectCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const JOB_TYPES = ['part-time', 'full-time', 'contract'];
const WORK_MODES = ['remote', 'on-site', 'hybrid'];
const LEVELS = ['entry', 'mid', 'senior'];

export default function BrowseProjects() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [data, setData] = useState({ projects: [], total: 0, pages: 1 });
  const [saved, setSaved] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [topFreelancers, setTopFreelancers] = useState([]);


  const jobTypes = params.getAll('job_type');
  const workModes = params.getAll('work_mode');
  const category = params.get('category') || '';
  const level = params.get('level') || '';
  const q = params.get('q') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);

  useEffect(() => { api.get('/meta').then(setMeta); }, []);
  useEffect(() => { api.get('/freelancers?sort=rating&limit=6').then((r) => setTopFreelancers(r.freelancers)); }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/projects${qs({ q, category, level, sort, page, job_type: jobTypes.join(','), work_mode: workModes.join(',') })}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    if (!user) return;
    api.get('/saved').then((r) => setSaved(new Set(r.projects.map((p) => p.id))));
  }, [user]);

  const toggleList = (key, value) => {
    const next = new URLSearchParams(params);
    const current = next.getAll(key);
    next.delete(key);
    (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]).forEach((v) => next.append(key, v));
    next.delete('page');
    setParams(next);
  };

  const setSingle = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const toggleSave = async (id) => {
    if (!user) return toast('Log in to save projects.', 'default');
    const r = await api.post(`/saved/${id}`);
    setSaved((s) => { const n = new Set(s); r.saved ? n.add(id) : n.delete(id); return n; });
  };

  const clearAll = () => setParams({});

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <h2>Find work</h2>
          <p>{data.total} open project{data.total === 1 ? '' : 's'} waiting for a great fit.</p>
        </div>
      </div>

      <div className="browse-layout">
        <aside className="filter-panel">
          <div className="filter-group">
            <h4>Keyword</h4>
            <input
              className="field"
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px' }}
              placeholder="Title, skill, company…"
              defaultValue={q}
              onKeyDown={(e) => e.key === 'Enter' && setSingle('q', e.currentTarget.value)}
              onBlur={(e) => setSingle('q', e.currentTarget.value)}
            />
          </div>
          <div className="filter-group">
            <h4>Job type</h4>
            {JOB_TYPES.map((t) => (
              <label className="filter-option" key={t}>
                <input type="checkbox" checked={jobTypes.includes(t)} onChange={() => toggleList('job_type', t)} />
                {t.replace('-', ' ')}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h4>Work mode</h4>
            {WORK_MODES.map((m) => (
              <label className="filter-option" key={m}>
                <input type="checkbox" checked={workModes.includes(m)} onChange={() => toggleList('work_mode', m)} />
                {m}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h4>Experience level</h4>
            {LEVELS.map((l) => (
              <label className="filter-option" key={l}>
                <input type="radio" name="level" checked={level === l} onChange={() => setSingle('level', l)} />
                {l}
              </label>
            ))}
            {level && <button className="btn btn--ghost btn--sm" onClick={() => setSingle('level', '')}>Clear level</button>}
          </div>
          {meta && (
            <div className="filter-group">
              <h4>Category</h4>
              <select value={category} onChange={(e) => setSingle('category', e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8 }}>
                <option value="">All categories</option>
                {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn--outline btn--sm btn--block" onClick={clearAll} style={{ marginTop: 8 }}>Clear all filters</button>
        </aside>

        <div>
          <div className="toolbar">
            <span className="result-count">{data.total} results</span>
            <select className="select-inline" value={sort} onChange={(e) => setSingle('sort', e.target.value)}>
              <option value="newest">Newest</option>
              <option value="budget_high">Highest budget</option>
              <option value="budget_low">Lowest budget</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
          {loading ? <Spinner /> : data.projects.length === 0 ? (
            <div className="empty-state">
              <h3>No projects match yet</h3>
              <p>Try clearing a filter or searching a broader term.</p>
              {topFreelancers.length > 0 && (
                <div style={{ marginTop: 32, textAlign: 'left' }}>
                  <h4 style={{ marginBottom: 14 }}>In the meantime, here's some top-rated talent</h4>
                  <div className="featured-strip">
                    {topFreelancers.map((f) => <FreelancerCard f={f} key={f.id} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card-grid">
              {data.projects.map((p) => (
                <ProjectCard project={p} key={p.id} onToggleSave={toggleSave} saved={saved.has(p.id)} />
              ))}
            </div>
          )}

          {data.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={`page-btn${n === page ? ' active' : ''}`} onClick={() => setSingle('page', String(n))}>{n}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
