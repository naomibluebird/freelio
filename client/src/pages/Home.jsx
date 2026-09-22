import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ProjectCard from '../components/ProjectCard.jsx';
import FreelancerCard from '../components/FreelancerCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState(null);
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [featuredFreelancers, setFeaturedFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const isFreelancer = user?.role === 'freelancer';

  useEffect(() => {
    (async () => {
      try {
        const [s, m, fp, ff] = await Promise.all([
          api.get('/stats'),
          api.get('/meta'),
          api.get('/projects/featured'),
          api.get('/freelancers/featured'),
        ]);
        setStats(s);
        setMeta(m);
        setFeaturedProjects(fp.projects);
        setFeaturedFreelancers(ff.freelancers);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const target = isClient ? '/freelancers' : '/projects';
    navigate(`${target}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  if (loading) return <Spinner />;

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="hero-eyebrow">Freelance marketplace for Ethiopia and beyond</span>
            <h1>{isClient ? 'Hire vetted freelancers, without the guesswork.' : 'Real work, real freelancers, no clutter in between.'}</h1>
            <p className="lead">
              {isClient
                ? 'Search skilled freelancers by rate, availability and expertise, then reach out to the right one for your build.'
                : 'Browse part-time, full-time and contract projects from vetted clients, or find the right freelancer for your next build — remote or on-site.'}
            </p>
            <form className="hero-search" onSubmit={submitSearch}>
              <input
                placeholder={isClient ? 'Try “React developer” or “brand designer”' : 'Try “React developer” or “brand design”'}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn btn--primary" type="submit">Search</button>
            </form>
            <div className="hero-actions">
              {isClient ? (
                <>
                  <Link to="/freelancers" className="btn btn--outline">Browse talent</Link>
                  {/* Added role=client param */}
                  <Link to="/register?role=client" className="btn btn--accent">Post a project</Link>
                </>
              ) : isFreelancer ? (
                <>
                  <Link to="/projects" className="btn btn--outline">Browse projects</Link>
                  <Link to="/dashboard/freelancer/profile" className="btn btn--accent">Complete your profile</Link>
                </>
              ) : (
                <>
                  <Link to="/projects" className="btn btn--outline">Browse projects</Link>
                  <Link to="/register" className="btn btn--accent">Join as a freelancer</Link>
                </>
              )}
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <div className="num">{stats?.openProjects ?? 0}+</div>
              <div className="label">Open projects right now</div>
            </div>
            <div className="stat-card">
              <div className="num">{stats?.freelancers ?? 0}+</div>
              <div className="label">Freelancers ready to work</div>
            </div>
            <div className="stat-card">
              <div className="num">{stats?.hires ?? 0}+</div>
              <div className="label">Successful hires made</div>
            </div>
          </div>
        </div>
      </section>

      {!isClient && featuredProjects.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <div>
              <h2>Featured projects</h2>
              <p>Hand-picked opportunities worth a look this week.</p>
            </div>
            <Link to="/projects" className="btn btn--outline btn--sm">View all projects</Link>
          </div>
          <div className="featured-strip">
            {featuredProjects.map((p) => <ProjectCard project={p} key={p.id} />)}
          </div>
        </section>
      )}

      {!isClient && meta && (
        <section className="section container">
          <div className="section-head">
            <div>
              <h2>Browse by category</h2>
              <p>Find the kind of work you do best.</p>
            </div>
          </div>
          <div className="category-grid">
            {meta.categories.map((c) => (
              <Link className="category-card" to={`/projects?category=${encodeURIComponent(c)}`} key={c}>
                <div className="name">{c}</div>
                <div className="count">{meta.categoryCounts[c] || 0} open</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!isFreelancer && featuredFreelancers.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <div>
              <h2>Featured freelancers</h2>
              <p>Top talent available to start soon.</p>
            </div>
            <Link to="/freelancers" className="btn btn--outline btn--sm">View all talent</Link>
          </div>
          <div className="featured-strip">
            {featuredFreelancers.map((f) => <FreelancerCard f={f} key={f.id} />)}
          </div>
        </section>
      )}

      <section className="section container">
        <div className="section-head">
          <div>
            <h2>How Freelio works</h2>
            <p>A simple path whether you're hiring or looking for work.</p>
          </div>
        </div>
        <div className="steps-grid">
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
      </section>

      {!isFreelancer && (
        <section className="container" style={{ paddingBottom: 80 }}>
          <div className="cta-band">
            <div>
              <h2>Ready to post your first project?</h2>
              <p>It takes about two minutes, and it's free to list.</p>
            </div>
            {/* Added role=client param here as well */}
            <Link to="/register?role=client" className="btn" style={{ background: '#fff', color: 'var(--primary-dark)' }}>Post a project</Link>
          </div>
        </section>
      )}
    </>
  );
}