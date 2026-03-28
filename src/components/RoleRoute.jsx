import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RoleRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const fallbackRoute =
    user?.role === 'patient'
      ? '/appointments'
      : user?.role === 'clinic_admin' || user?.role === 'platform_admin'
        ? '/admin'
        : '/records';

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        to="/login"
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate replace to={fallbackRoute} />;
  }

  return children;
}
