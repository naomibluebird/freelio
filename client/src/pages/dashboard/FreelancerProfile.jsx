import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const AVAILABILITY = ['available', 'busy', 'unavailable'];
const LEVELS = ['entry', 'mid', 'senior'];
const CURRENT_YEAR = new Date().getFullYear();

const emptyForm = {
  title: '', bio: '', experience_level: 'entry', hourly_rate: '', rate_currency: 'USD', location: '',
  experience_years: 0, availability: 'available', portfolio_url: '', github_url: '', skillsText: '',
};

function toForm(p) {
  return {
    title: p.title || '', bio: p.bio || '', experience_level: p.experience_level || 'entry', hourly_rate: p.hourly_rate ?? '', rate_currency: p.rate_currency || 'USD',
    location: p.location || '', experience_years: p.experience_years || 0, availability: p.availability || 'available',
    portfolio_url: p.portfolio_url || '', github_url: p.github_url || '', skillsText: (p.skills || []).join(', '),
  };
}

function ProfileForm({ initial, initialCertifications, busy, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [certifications, setCertifications] = useState(initialCertifications || []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addCertification = () => setCertifications((c) => [...c, { name: '', issuer: '', year: '' }]);
  const updateCertification = (i, key, value) => setCertifications((c) => c.map((cert, idx) => (idx === i ? { ...cert, [key]: value } : cert)));
  const removeCertification = (i) => setCertifications((c) => c.filter((_, idx) => idx !== i));

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      hourly_rate: form.hourly_rate === '' ? null : Number(form.hourly_rate),
      skills: form.skillsText.split(',').map((s) => s.trim()).filter(Boolean),
      certifications: certifications
        .filter((c) => c.name.trim())
        .map((c) => ({ name: c.name.trim(), issuer: c.issuer.trim(), year: c.year ? Number(c.year) : null })),
    };
    delete payload.skillsText;
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit}>
      <div className="field"><label>Title</label><input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Video Editor" /></div>
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
        <label>Experience level</label>
        <div className="checkbox-row">
          {LEVELS.map((l) => (
            <button type="button" key={l} className={`chip-toggle${form.experience_level === l ? ' active' : ''}`} onClick={() => set('experience_level', l)}>{l}</button>
          ))}
        </div>
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
      <div className="field"><label>Skills</label><input value={form.skillsText} onChange={(e) => set('skillsText', e.target.value)} placeholder="Premiere Pro, After Effects, DaVinci Resolve (comma separated)" /></div>

      <div className="field">
        <label>Certifications (optional)</label>
        {certifications.map((cert, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input style={{ flex: 2 }} placeholder="Certificate name" value={cert.name} onChange={(e) => updateCertification(i, 'name', e.target.value)} />
            <input style={{ flex: 2 }} placeholder="Issued by" value={cert.issuer} onChange={(e) => updateCertification(i, 'issuer', e.target.value)} />
            <input style={{ flex: 1 }} type="number" min="1950" max={CURRENT_YEAR} placeholder="Year" value={cert.year} onChange={(e) => updateCertification(i, 'year', e.target.value)} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeCertification(i)} aria-label="Remove">✕</button>
          </div>
        ))}
        <button type="button" className="btn btn--outline btn--sm" onClick={addCertification}>+ Add certification</button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function FreelancerProfile() {
  const [profiles, setProfiles] = useState(null);
  const [editingId, setEditingId] = useState(null); // null = not editing, 'new' = creating, or a profile id
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => api.get('/profiles/mine').then((r) => setProfiles(r.profiles));
  useEffect(() => { load(); }, []);

  const create = async (payload) => {
    setBusy(true);
    try {
      await api.post('/profiles', payload);
      toast('Profile created.', 'success');
      setEditingId(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const update = async (id, payload) => {
    setBusy(true);
    try {
      await api.put(`/profiles/${id}`, payload);
      toast('Profile updated.', 'success');
      setEditingId(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async (id) => {
    await api.patch(`/profiles/${id}/primary`);
    toast('Set as your default profile.', 'success');
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this profile? This cannot be undone.')) return;
    try {
      await api.del(`/profiles/${id}`);
      toast('Profile deleted.', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!profiles) return <Spinner />;

  const editingProfile = profiles.find((p) => p.id === editingId);

  return (
    <>
      <div className="section-head">
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>Your profiles</h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem' }}>Create a separate profile for each kind of work you do, then choose which one to apply with.</p>
        </div>
        {editingId === null && profiles.length < 5 && (
          <button className="btn btn--primary btn--sm" onClick={() => setEditingId('new')}>+ New profile</button>
        )}
      </div>

      {editingId === 'new' && (
        <div className="form-card form-card--wide" style={{ margin: '0 0 20px' }}>
          <ProfileForm initial={emptyForm} initialCertifications={[]} busy={busy} onCancel={() => setEditingId(null)} onSubmit={create} />
        </div>
      )}

      {editingProfile && (
        <div className="form-card form-card--wide" style={{ margin: '0 0 20px' }}>
          <ProfileForm
            initial={toForm(editingProfile)}
            initialCertifications={editingProfile.certifications || []}
            busy={busy}
            onCancel={() => setEditingId(null)}
            onSubmit={(payload) => update(editingProfile.id, payload)}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {profiles.map((p) => (
          <div className="side-card" key={p.id} style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <strong>{p.title || 'Untitled profile'}</strong>{' '}
                {p.is_primary && <span className="badge badge--featured" style={{ marginLeft: 6 }}>Default</span>}
                <div className="meta-sm">{p.experience_level ? `${p.experience_level} level · ` : ''}{p.location || 'Location not set'} · {p.experience_years} yr{p.experience_years === 1 ? '' : 's'} experience</div>
                {p.skills?.length > 0 && <div className="tag-row" style={{ marginTop: 8 }}>{p.skills.slice(0, 6).map((s) => <span className="tag" key={s}>{s}</span>)}</div>}
                {p.certifications?.length > 0 && (
                  <div className="meta-sm" style={{ marginTop: 6 }}>
                    {p.certifications.map((c) => `${c.name}${c.issuer ? ` (${c.issuer})` : ''}${c.year ? ` · ${c.year}` : ''}`).join(', ')}
                  </div>
                )}
              </div>
              <span className={`status-pill status-${p.availability === 'available' ? 'open' : p.availability === 'busy' ? 'pending' : 'closed'}`}>{p.availability}</span>
            </div>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button className="btn btn--outline btn--sm" onClick={() => setEditingId(p.id)}>Edit</button>
              {!p.is_primary && <button className="btn btn--outline btn--sm" onClick={() => makePrimary(p.id)}>Set as default</button>}
              {profiles.length > 1 && <button className="btn btn--danger btn--sm" onClick={() => remove(p.id)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}