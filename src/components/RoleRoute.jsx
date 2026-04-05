import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RoleRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  const getFallbackRoute = (role) => {
    if (role === 'patient') {
      return '/appointments';
    }

    if (role === 'platform_admin' || role === 'clinic_admin') {
      return '/admin';
    }

    if (role === 'cashier') {
      return '/billing';
    }

    if (role === 'pharmacist') {
      return '/pharmacy';
    }

    return '/records';
  };

  const fallbackRoute = getFallbackRoute(user?.role);

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
