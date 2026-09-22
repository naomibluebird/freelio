import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function DashboardLayout() {
  const { user } = useAuth();
  const base = user.role === 'client' ? '/dashboard/client' : '/dashboard/freelancer';

  return (
    <div className="container section">
      <div className="dash-layout">
        <nav className="dash-nav">
          <NavLink to={base} end className={({ isActive }) => (isActive ? 'active' : '')}>Overview</NavLink>
          {user.role === 'client' && <NavLink to={`${base}/projects`} className={({ isActive }) => (isActive ? 'active' : '')}>My projects</NavLink>}
          {user.role === 'freelancer' && <NavLink to={`${base}/applications`} className={({ isActive }) => (isActive ? 'active' : '')}>My applications</NavLink>}
          {user.role === 'freelancer' && <NavLink to={`${base}/saved`} className={({ isActive }) => (isActive ? 'active' : '')}>Saved projects</NavLink>}
          <NavLink to={`${base}/profile`} className={({ isActive }) => (isActive ? 'active' : '')}>{user.role === 'client' ? 'Company profile' : 'Profile'}</NavLink>
        </nav>
        <div><Outlet /></div>
      </div>
    </div>
  );
}
