import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const target = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${target}`} replace />;
  }
  return <Outlet />;
}
