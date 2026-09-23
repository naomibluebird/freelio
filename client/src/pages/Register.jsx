import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();

  // Default to 'freelancer' if no role is specified, but switch to 'client' if the URL says so
  const initialRole = searchParams.get('role') === 'client' ? 'client' : 'freelancer';

  const [role, setRole] = useState(initialRole);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when role changes
  useEffect(() => {
    setFormData({ fullName: '', email: '', password: '' });
    setError('');
  }, [role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register({
        name: formData.fullName, // Backend expects "name"
        email: formData.email,
        password: formData.password,
        role: role,
      });

      // Redirect based on role after successful registration
      navigate(user.role === 'client' ? '/dashboard/client' : '/dashboard/freelancer');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '50px auto', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Join free — it takes less than a minute.</h2>

      {/* Role Selection Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setRole('freelancer')}
          style={{
            flex: 1, padding: '15px', border: '1px solid #ccc', borderRadius: '8px',
            background: role === 'freelancer' ? '#e0f2f1' : 'white',
            borderColor: role === 'freelancer' ? '#2e7d32' : '#ccc',
            textAlign: 'left', cursor: 'pointer'
          }}
        >
          <strong>I'm a freelancer</strong>
          <div style={{ fontSize: '12px', color: '#666' }}>Looking for work</div>
        </button>
        <button
          type="button"
          onClick={() => setRole('client')}
          style={{
            flex: 1, padding: '15px', border: '1px solid #ccc', borderRadius: '8px',
            background: role === 'client' ? '#e0f2f1' : 'white',
            borderColor: role === 'client' ? '#2e7d32' : '#ccc',
            textAlign: 'left', cursor: 'pointer'
          }}
        >
          <strong>I'm a client</strong>
          <div style={{ fontSize: '12px', color: '#666' }}>Hiring for a project</div>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Full name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Nahomi"
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Nahomi@gmail.com"
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••••"
              required
              minLength={8}
              style={{ width: '100%', padding: '10px', paddingRight: '48px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#2e7d32', fontWeight: 600,
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <small style={{ color: '#666', fontSize: '12px' }}>At least 8 characters.</small>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#2e7d32', color: 'white', padding: '12px', border: 'none',
            borderRadius: '25px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
        Already have an account? <Link to="/login" style={{ color: '#2e7d32', fontWeight: 'bold' }}>Log in</Link>
      </p>
    </div>
  );
}