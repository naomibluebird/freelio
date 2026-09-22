import { Link } from 'react-router-dom';

const initials = (name = '') => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function FreelancerCard({ f }) {
  const verified = Number(f.rating) >= 4.5;
  return (
    <article className="freelancer-card">
      <div className="top-row">
        <span className="avatar-lg">
          {initials(f.name)}
          {verified && <span className="verified-badge" title="Highly rated">✓</span>}
        </span>
        <div>
          <Link to={`/freelancers/${f.id}`}><h3>{f.name}</h3></Link>
          <div className="meta-sm">{f.title || 'Freelancer'}</div>
        </div>
      </div>
      {f.rating ? (
        <div className="rating-row"><span className="stars">★ {f.rating}</span><span>({f.review_count})</span></div>
      ) : (
        <div className="rating-row"><span>New on Freelio</span></div>
      )}
      <p className="desc">{f.bio}</p>
      {f.skills?.length > 0 && (
        <div className="tag-row">{f.skills.slice(0, 4).map((s) => <span className="tag" key={s}>{s}</span>)}</div>
      )}
      <div className="card-bottom">
        <span className="budget">{f.hourly_rate ? `${f.rate_currency === 'ETB' ? 'ETB ' : '$'}${f.hourly_rate}/hr` : 'Rate on request'}</span>
        <span className="meta-sm"><span className={`avail-dot avail-${f.availability}`}></span>{f.availability}</span>
      </div>
      <Link to={`/freelancers/${f.id}`} className="card-view-link">
        View profile <span className="arrow">→</span>
      </Link>
    </article>
  );
}
