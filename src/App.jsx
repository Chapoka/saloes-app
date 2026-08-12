import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ProtectedRoute, ProtectedRoute as ProtectedRouteDefault } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import { ThemeProvider } from '@/hooks/useThemeMode';
import ErrorBoundary from '@/components/ErrorBoundary';

import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import SetPassword from '@/pages/SetPassword';
import CustomerPortal from '@/pages/CustomerPortal';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Role requirements per page
const PAGE_ROLES = {
  Dashboard: ['super_admin', 'admin', 'profissional'],
  Schedule: ['super_admin', 'admin', 'profissional'],
  Clientes: ['super_admin', 'admin', 'profissional'],
  Plans: ['super_admin', 'admin'],
  PunchCards: ['super_admin', 'admin'],
  Services: ['super_admin', 'admin', 'profissional'],
  StylistLevels: ['super_admin', 'admin'],
  Invoices: ['super_admin', 'admin'],
  WaitingList: ['super_admin', 'admin', 'profissional'],
  Templates: ['super_admin', 'admin'],
  Companies: ['super_admin', 'admin'],
  CalendarSettings: ['super_admin', 'admin'],
  AuditLogs: ['super_admin'],
  Settings: ['super_admin', 'admin'],
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <ErrorBoundary>
      <Routes>
      {/* Auth pages — unprotected */}
      <Route path="/login" element={<Login />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/set-password" element={<SetPassword />} />

      {/* Public portal — accessible without auth */}
      <Route path="/CustomerPortal" element={
        <LayoutWrapper currentPageName="CustomerPortal">
          <CustomerPortal />
        </LayoutWrapper>
      } />
      <Route path="/Portalcliente" element={
        <LayoutWrapper currentPageName="Portalcliente">
          <CustomerPortal />
        </LayoutWrapper>
      } />

      {/* All app routes — gated by ProtectedRoute with role validation */}
      <Route element={<ProtectedRouteDefault unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={
          <ProtectedRoute allowedRoles={PAGE_ROLES[mainPageKey] || ['super_admin', 'admin', 'profissional']}>
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        {Object.entries(Pages).map(([path, Page]) => {
          const allowedRoles = PAGE_ROLES[path] || ['super_admin', 'admin', 'profissional'];
          return (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <ProtectedRoute allowedRoles={allowedRoles}>
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                </ProtectedRoute>
              }
            />
          );
        })}
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App