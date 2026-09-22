import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import FreelancerCard from '../components/FreelancerCard.jsx';
import Spinner from '../components/Spinner.jsx';

export default function BrowseFreelancers() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ freelancers: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const q = params.get('q') || '';
  const availability = params.get('availability') || '';
  const sort = params.get('sort') || 'featured';
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    setLoading(true);
    api.get(`/freelancers${qs({ q, availability, sort, page })}`).then(setData).finally(() => setLoading(false));
  }, [params]);

  const setSingle = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <h2>Find talent</h2>
          <p>{data.total} freelancer{data.total === 1 ? '' : 's'} ready to help.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by name, title or skill…"
          defaultValue={q}
          style={{ flex: 1, maxWidth: 340, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 999 }}
          onKeyDown={(e) => e.key === 'Enter' && setSingle('q', e.currentTarget.value)}
          onBlur={(e) => setSingle('q', e.currentTarget.value)}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="select-inline" value={availability} onChange={(e) => setSingle('availability', e.target.value)}>
            <option value="">Any availability</option>
            <option value="available">Available now</option>
            <option value="busy">Busy</option>
          </select>
          <select className="select-inline" value={sort} onChange={(e) => setSingle('sort', e.target.value)}>
            <option value="featured">Featured</option>
            <option value="rating">Top rated</option>
            <option value="rate_low">Rate: low to high</option>
            <option value="rate_high">Rate: high to low</option>
          </select>
        </div>
      </div>

      {loading ? <Spinner /> : data.freelancers.length === 0 ? (
        <div className="empty-state"><h3>No one matches yet</h3><p>Try a different search or clear the filters.</p></div>
      ) : (
        <div className="card-grid">{data.freelancers.map((f) => <FreelancerCard f={f} key={f.id} />)}</div>
      )}

      {data.pages > 1 && (
        <div className="pagination">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`page-btn${n === page ? ' active' : ''}`} onClick={() => setSingle('page', String(n))}>{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}
