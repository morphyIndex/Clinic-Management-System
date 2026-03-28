import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

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

  return children;
}
