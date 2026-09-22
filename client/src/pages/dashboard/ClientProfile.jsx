import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ClientProfile() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { refresh } = useAuth();

  useEffect(() => {
    api.get('/clients/me/profile').then(({ profile }) => setForm({
      name: profile.name, company_name: profile.company_name || '', website: profile.website || '',
      about: profile.about || '', location: profile.location || '',
    }));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/clients/me', form);
      await refresh();
      toast('Profile updated.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <Spinner />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="section-head"><h2 style={{ fontSize: '1.5rem' }}>Company profile</h2></div>
      <div className="form-card form-card--wide" style={{ margin: 0 }}>
        <form onSubmit={submit}>
          <div className="field-row">
            <div className="field"><label>Your name</label><input required value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div className="field"><label>Company name</label><input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Website</label><input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" /></div>
            <div className="field"><label>Location</label><input value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
          </div>
          <div className="field"><label>About your company</label><textarea value={form.about} onChange={(e) => set('about', e.target.value)} /></div>
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
      </div>
    </>
  );
}
