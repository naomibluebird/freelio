import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Lets guests and any role EXCEPT `blockRole` see the page.
 * Used for pages that are public marketing/browse surfaces (Find work,
 * Find talent) but belong conceptually to one role — a logged-in
 * freelancer shouldn't land on the "hire talent" flow and vice versa.
 */
export default function RoleGate({ children, blockRole, redirectTo = '/' }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="center-pad"><div className="spinner" /></div>;
  if (user?.role === blockRole) return <Navigate to={redirectTo} replace />;
  return children;
}
