import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const AVAILABILITY = ['available', 'busy', 'unavailable'];
const CURRENT_YEAR = new Date().getFullYear();

const emptyFreelancerInfo = {
  title: '', bio: '', hourlyRate: '', rateCurrency: 'USD', location: '',
  experienceYears: 0, availability: 'available', portfolioUrl: '', githubUrl: '', skillsText: '',
};

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();

  const initialRole = searchParams.get('role') === 'client' ? 'client' : 'freelancer';

  const today = new Date();
  const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const minDob = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate()).toISOString().slice(0, 10);

  const [role, setRole] = useState(initialRole);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', dateOfBirth: '' });
  const [freelancerInfo, setFreelancerInfo] = useState(emptyFreelancerInfo);
  const [certifications, setCertifications] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({ fullName: '', email: '', password: '', dateOfBirth: '' });
    setFreelancerInfo(emptyFreelancerInfo);
    setCertifications([]);
    setError('');
  }, [role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const setF = (key, value) => setFreelancerInfo((f) => ({ ...f, [key]: value }));

  const addCertification = () => setCertifications((c) => [...c, { name: '', issuer: '', year: '' }]);
  const updateCertification = (i, key, value) => setCertifications((c) => c.map((cert, idx) => (idx === i ? { ...cert, [key]: value } : cert)));
  const removeCertification = (i) => setCertifications((c) => c.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.dateOfBirth > maxDob) {
      setError('You must be at least 18 years old to join Freelio.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        date_of_birth: formData.dateOfBirth,
        role,
      };

      if (role === 'freelancer') {
        Object.assign(payload, {
          title: freelancerInfo.title,
          bio: freelancerInfo.bio,
          hourly_rate: freelancerInfo.hourlyRate === '' ? null : Number(freelancerInfo.hourlyRate),
          rate_currency: freelancerInfo.rateCurrency,
          location: freelancerInfo.location,
          experience_years: Number(freelancerInfo.experienceYears) || 0,
          availability: freelancerInfo.availability,
          portfolio_url: freelancerInfo.portfolioUrl,
          github_url: freelancerInfo.githubUrl,
          skills: freelancerInfo.skillsText.split(',').map((s) => s.trim()).filter(Boolean),
          certifications: certifications
            .filter((c) => c.name.trim())
            .map((c) => ({ name: c.name.trim(), issuer: c.issuer.trim(), year: c.year ? Number(c.year) : null })),
        });
      }

      const user = await register(payload);
      navigate(user.role === 'client' ? '/dashboard/client' : '/dashboard/freelancer');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 700, margin: '48px auto', padding: '0 24px 64px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Join Freelio</h2>
      <p style={{ textAlign: 'center', color: 'var(--ink-soft)', marginBottom: 24 }}>
        {role === 'freelancer' ? 'Set up your profile now — clients will see this when you apply.' : 'It takes less than a minute.'}
      </p>

      <div className="role-picker">
        <button type="button" className={`role-option${role === 'freelancer' ? ' active' : ''}`} onClick={() => setRole('freelancer')}>
          <div className="r-title">I'm a freelancer</div>
          <div className="r-desc">Looking for work</div>
        </button>
        <button type="button" className={`role-option${role === 'client' ? ' active' : ''}`} onClick={() => setRole('client')}>
          <div className="r-title">I'm a client</div>
          <div className="r-desc">Hiring for a project</div>
        </button>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="form-card form-card--wide" style={{ margin: 0 }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: 16 }}>Your account</h3>
        <div className="field-row">
          <div className="field">
            <label>Full name</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Nahomi" required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="nahomi@gmail.com" required />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Date of birth</label>
            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} min={minDob} max={maxDob} required />
            <span className="hint">You must be at least 18 to join.</span>
          </div>
          <div className="field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••"
                required
                minLength={8}
                style={{ paddingRight: 56 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <span className="hint">At least 8 characters.</span>
          </div>
        </div>

        {role === 'freelancer' && (
          <>
            <h3 style={{ fontSize: '1.05rem', margin: '28px 0 16px' }}>Your profile</h3>
            <div className="field">
              <label>Title</label>
              <input value={freelancerInfo.title} onChange={(e) => setF('title', e.target.value)} placeholder="e.g. Video Editor" required />
            </div>
            <div className="field">
              <label>Bio</label>
              <textarea value={freelancerInfo.bio} onChange={(e) => setF('bio', e.target.value)} placeholder="A short summary of your experience and what you're looking for." />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Hourly rate</label>
                <input type="number" min="0" value={freelancerInfo.hourlyRate} onChange={(e) => setF('hourlyRate', e.target.value)} />
              </div>
              <div className="field">
                <label>Currency</label>
                <select value={freelancerInfo.rateCurrency} onChange={(e) => setF('rateCurrency', e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="ETB">ETB</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Location</label>
                <input value={freelancerInfo.location} onChange={(e) => setF('location', e.target.value)} />
              </div>
              <div className="field">
                <label>Years of experience</label>
                <input type="number" min="0" value={freelancerInfo.experienceYears} onChange={(e) => setF('experienceYears', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Availability</label>
              <div className="checkbox-row">
                {AVAILABILITY.map((a) => (
                  <button type="button" key={a} className={`chip-toggle${freelancerInfo.availability === a ? ' active' : ''}`} onClick={() => setF('availability', a)}>{a}</button>
                ))}
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Portfolio URL</label>
                <input value={freelancerInfo.portfolioUrl} onChange={(e) => setF('portfolioUrl', e.target.value)} placeholder="https://…" />
              </div>
              <div className="field">
                <label>GitHub URL</label>
                <input value={freelancerInfo.githubUrl} onChange={(e) => setF('githubUrl', e.target.value)} placeholder="https://github.com/…" />
              </div>
            </div>
            <div className="field">
              <label>Skills</label>
              <input value={freelancerInfo.skillsText} onChange={(e) => setF('skillsText', e.target.value)} placeholder="Premiere Pro, After Effects, DaVinci Resolve (comma separated)" />
            </div>

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
          </>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Log in</Link>
      </p>
    </div>
  );
}