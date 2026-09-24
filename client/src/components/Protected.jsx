import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Protected = ({ children, roles, superAdminOnly }) => {
  const { token, user, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (roles && roles.length && user && !roles.includes(user.role) && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default Protected;