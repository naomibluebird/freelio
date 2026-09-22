import { Link } from 'react-router-dom';

export default function HowItWorks() {
  return (
    <div className="container" style={{ padding: '64px 0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', marginBottom: '56px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>How Freelio works</h1>
        <p className="lead" style={{ color: 'var(--ink-soft)', fontSize: '1.1rem' }}>
          A simple path whether you're hiring or looking for work. No clutter, just real work.
        </p>
      </div>

      <div className="steps-grid" style={{ marginBottom: '64px' }}>
        <div className="step-item">
          <span className="step-num">01</span>
          <div>
            <h4>Create your profile</h4>
            <p>Freelancers list skills and rates. Clients describe their company and what they need.</p>
          </div>
        </div>
        <div className="step-item">
          <span className="step-num">02</span>
          <div>
            <h4>Post or apply</h4>
            <p>Clients post a project with type, budget and mode. Freelancers send a proposal directly.</p>
          </div>
        </div>
        <div className="step-item">
          <span className="step-num">03</span>
          <div>
            <h4>Hire and get to work</h4>
            <p>Review proposals, accept the right fit, and leave a review once the project wraps up.</p>
          </div>
        </div>
      </div>

      <div className="cta-band" style={{ textAlign: 'left' }}>
        <div>
          <h2>Ready to get started?</h2>
          <p>Join the marketplace today — it's free to sign up.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/register?role=client" className="btn" style={{ background: '#fff', color: 'var(--primary-dark)' }}>
            Post a project
          </Link>
          <Link to="/register?role=freelancer" className="btn btn--accent">
            Join as a freelancer
          </Link>
        </div>
      </div>
    </div>
  );
}