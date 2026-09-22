import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const initials = (name = '') => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function FreelancerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/freelancers/${id}`).then(setState).finally(() => setLoading(false));
  useEffect(() => { setLoading(true); load(); }, [id]);

  if (loading) return <Spinner />;
  if (!state) return null;
  const { freelancer: f, reviews, reviewable } = state;

  const submitReview = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/freelancers/${id}/reviews`, { project_id: reviewForm, rating, comment });
      toast('Review posted.', 'success');
      setReviewForm(null);
      setComment('');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <div className="breadcrumb"><Link to="/freelancers">Find talent</Link> / {f.name}</div>
      <div className="detail-layout">
        <div className="detail-main">
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
            <span className="avatar-lg" style={{ width: 68, height: 68, fontSize: '1.4rem' }}>{initials(f.name)}</span>
            <div>
              <h1 style={{ fontSize: '1.6rem' }}>{f.name}</h1>
              <p style={{ color: 'var(--ink-soft)' }}>{f.title}</p>
            </div>
          </div>
          <div className="detail-badges">
            <span className="badge badge--job"><span className={`avail-dot avail-${f.availability}`}></span>{f.availability}</span>
            {f.location && <span className="badge badge--level">{f.location}</span>}
            {f.experience_years > 0 && <span className="badge badge--level">{f.experience_years} yrs experience</span>}
            {f.rating && <span className="badge badge--featured">★ {f.rating} ({f.review_count})</span>}
          </div>
          {f.skills?.length > 0 && <div className="tag-row" style={{ marginTop: 16 }}>{f.skills.map((s) => <span className="tag" key={s}>{s}</span>)}</div>}
          <div className="detail-body">{f.bio}</div>

          <div className="section" style={{ paddingBottom: 0 }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Reviews ({reviews.length})</h3>
            {reviews.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No reviews yet.</p>}
            {reviews.map((r) => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{r.client_name}</strong>
                  <span style={{ color: 'var(--accent)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', margin: '4px 0' }}>on “{r.project_title}”</p>
                {r.comment && <p style={{ fontSize: '0.92rem' }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="side-card">
            <h4>Rate</h4>
            <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--primary-dark)' }}>
              {f.hourly_rate ? `${f.rate_currency === 'ETB' ? 'ETB ' : '$'}${f.hourly_rate}/hr` : 'On request'}
            </div>
            {f.portfolio_url && <div className="kv-row"><span className="k">Portfolio</span><a className="v" href={f.portfolio_url} target="_blank" rel="noreferrer">Visit ↗</a></div>}
            {f.github_url && <div className="kv-row"><span className="k">GitHub</span><a className="v" href={f.github_url} target="_blank" rel="noreferrer">Visit ↗</a></div>}
          </div>

          {user?.role === 'client' && reviewable?.length > 0 && (
            <div className="side-card">
              <h4>Leave a review</h4>
              {!reviewForm ? (
                <select className="select-inline" style={{ width: '100%' }} onChange={(e) => setReviewForm(e.target.value)} defaultValue="">
                  <option value="" disabled>Choose a completed project…</option>
                  {reviewable.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              ) : (
                <form onSubmit={submitReview}>
                  <div className="field">
                    <label>Rating</label>
                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Comment</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How did the project go?" />
                  </div>
                  <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Posting…' : 'Post review'}</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
