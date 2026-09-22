import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const initials = (name = '') => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const dashPath = user?.role === 'admin' ? '/admin' : user?.role === 'client' ? '/dashboard/client' : '/dashboard/freelancer';

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand">
          <span className="brand-mark" style={{ fontStyle: 'italic' }}>F</span>
          <span className="brand-text">Freelio</span>
        </Link>

        <nav className="nav-links">
          {/* Added "How it works" link */}
          <NavLink to="/how-it-works" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            How it works
          </NavLink>
          
          {user?.role !== 'client' && (
            <NavLink to="/projects" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Find work</NavLink>
          )}
          {user?.role !== 'freelancer' && (
            <NavLink to="/freelancers" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Find talent</NavLink>
          )}
          {user?.role === 'client' && (
            <NavLink to="/post-project" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Post a project</NavLink>
          )}
        </nav>

        <div className="header-actions">
          {!user && (
            <>
              <Link to="/login" className="btn btn--ghost">Log in</Link>
              <Link to="/register" className="btn btn--primary">Join free</Link>
            </>
          )}
          {user && (
            <div className="user-menu">
              <button className="user-chip" onClick={() => setOpen((o) => !o)}>
                <span className="avatar">{initials(user.name)}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
              </button>
              {open && (
                <div className="dropdown" onMouseLeave={() => setOpen(false)}>
                  <Link to={dashPath} onClick={() => setOpen(false)}>Dashboard</Link>
                  {user.role === 'freelancer' && <Link to="/dashboard/freelancer/profile" onClick={() => setOpen(false)}>Edit profile</Link>}
                  {user.role === 'client' && <Link to="/dashboard/client/profile" onClick={() => setOpen(false)}>Company profile</Link>}
                  <hr />
                  <button onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          )}
          <button className="menu-toggle" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">☰</button>
        </div>
      </div>
      {mobileOpen && (
        <div className="container" style={{ paddingBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Added "How it works" to mobile menu */}
            <NavLink to="/how-it-works" className="nav-link" onClick={() => setMobileOpen(false)}>How it works</NavLink>
            
            {user?.role !== 'client' && <NavLink to="/projects" className="nav-link" onClick={() => setMobileOpen(false)}>Find work</NavLink>}
            {user?.role !== 'freelancer' && <NavLink to="/freelancers" className="nav-link" onClick={() => setMobileOpen(false)}>Find talent</NavLink>}
            {user?.role === 'client' && <NavLink to="/post-project" className="nav-link" onClick={() => setMobileOpen(false)}>Post a project</NavLink>}
          </div>
        </div>
      )}
    </header>
  );
}