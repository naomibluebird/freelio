import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const AVAILABILITY = ['available', 'busy', 'unavailable'];

export default function FreelancerProfile() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { refresh } = useAuth();

  useEffect(() => {
    api.get('/freelancers/me/profile').then(({ profile: p }) => setForm({
      name: p.name, title: p.title || '', bio: p.bio || '', hourly_rate: p.hourly_rate ?? '', rate_currency: p.rate_currency || 'USD',
      location: p.location || '', experience_years: p.experience_years || 0, availability: p.availability || 'available',
      portfolio_url: p.portfolio_url || '', github_url: p.github_url || '', skillsText: (p.skills || []).join(', '),
    }));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, hourly_rate: form.hourly_rate === '' ? null : Number(form.hourly_rate), skills: form.skillsText.split(',').map((s) => s.trim()).filter(Boolean) };
      delete payload.skillsText;
      await api.put('/freelancers/me', payload);
      await refresh();
      toast('Profile updated.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <Spinner />;

  return (
    <>
      <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>Your profile</h2></div>
      <div className="form-card form-card--wide" style={{ margin: 0 }}>
        <form onSubmit={submit}>
          <div className="field-row">
            <div className="field"><label>Full name</label><input required value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div className="field"><label>Title</label><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Full-stack developer" /></div>
          </div>
          <div className="field"><label>Bio</label><textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="A short summary of your experience and what you're looking for." /></div>
          <div className="field-row">
            <div className="field"><label>Hourly rate</label><input type="number" min="0" value={form.hourly_rate} onChange={(e) => set('hourly_rate', e.target.value)} /></div>
            <div className="field"><label>Currency</label>
              <select value={form.rate_currency} onChange={(e) => set('rate_currency', e.target.value)}>
                <option value="USD">USD</option><option value="ETB">ETB</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field"><label>Location</label><input value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
            <div className="field"><label>Years of experience</label><input type="number" min="0" value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} /></div>
          </div>
          <div className="field">
            <label>Availability</label>
            <div className="checkbox-row">
              {AVAILABILITY.map((a) => (
                <button type="button" key={a} className={`chip-toggle${form.availability === a ? ' active' : ''}`} onClick={() => set('availability', a)}>{a}</button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <div className="field"><label>Portfolio URL</label><input value={form.portfolio_url} onChange={(e) => set('portfolio_url', e.target.value)} placeholder="https://…" /></div>
            <div className="field"><label>GitHub URL</label><input value={form.github_url} onChange={(e) => set('github_url', e.target.value)} placeholder="https://github.com/…" /></div>
          </div>
          <div className="field"><label>Skills</label><input value={form.skillsText} onChange={(e) => set('skillsText', e.target.value)} placeholder="React, PHP, MySQL (comma separated)" /></div>
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
      </div>
    </>
  );
}
