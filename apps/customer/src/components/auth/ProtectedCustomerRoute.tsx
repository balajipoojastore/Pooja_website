import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '../common/Loading';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export function ProtectedCustomerRoute({ requireProfile = true }: { requireProfile?: boolean }) {
  const auth = useCustomerAuth();
  const location = useLocation();
  if (auth.loading || auth.accountLoading) return <PageLoader />;
  if (!auth.user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (requireProfile && !auth.profileComplete) return <Navigate to="/complete-profile" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
