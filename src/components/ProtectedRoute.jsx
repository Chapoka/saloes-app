import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AccessDenied = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center p-8">
      <div className="w-16 h-16 mx-auto mb-4 text-red-500">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Acesso Negado</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Você não tem permissão para acessar esta página.</p>
      <button
        onClick={() => window.history.back()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Voltar
      </button>
    </div>
  </div>
);

export function ProtectedRoute({
  fallback = <DefaultFallback />,
  unauthenticatedElement,
  allowedRoles,
  redirectTo = '/login',
  children,
}) {
  const { isAuthenticated, isLoadingAuth, authError, user } = useAuth();

  if (isLoadingAuth) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement ?? <Navigate to={redirectTo} replace />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement ?? <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role;
    const normalizedRole = userRole === 'teacher' ? 'profissional' : userRole === 'user' ? 'cliente' : userRole;
    
    if (!allowedRoles.includes(normalizedRole)) {
      return <AccessDenied />;
    }
  }

  return children ?? <Outlet />;
}

export default function ProtectedRouteDefault({ fallback = <DefaultFallback />, unauthenticatedElement, children }) {
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();

  if (isLoadingAuth) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return children ?? <Outlet />;
}