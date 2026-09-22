import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container center-pad" style={{ flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: '2rem' }}>Page not found</h1>
      <p style={{ color: 'var(--ink-soft)' }}>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn--primary">Back home</Link>
    </div>
  );
}
