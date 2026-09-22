import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col" style={{ maxWidth: 280 }}>
            <div className="brand" style={{ fontSize: '1.15rem', marginBottom: 10 }}>
              <span className="brand-mark">F</span>Freelio
            </div>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              A marketplace connecting Ethiopian freelance talent with clients who need real work done well.
            </p>
          </div>
          <div className="footer-col">
            <h4>For freelancers</h4>
            <Link to="/projects">Browse projects</Link>
            <Link to="/register">Create a profile</Link>
          </div>
          <div className="footer-col">
            <h4>For clients</h4>
            <Link to="/freelancers">Find talent</Link>
            <Link to="/post-project">Post a project</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/">About</Link>
            <Link to="/">Contact</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Freelio. All rights reserved.</span>
          <span>Built with React, Express and MySQL.</span>
        </div>
      </div>
    </footer>
  );
}
