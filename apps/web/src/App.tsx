import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import { api } from './lib/api';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { SettingsLayout } from './pages/settings/SettingsLayout';

const LoginPage = React.lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ContentDashboardPage = React.lazy(() => import('./pages/content/ContentDashboardPage').then(m => ({ default: m.ContentDashboardPage })));
const ContentListPage = React.lazy(() => import('./pages/content/ContentListPage').then(m => ({ default: m.ContentListPage })));
const ContentEditorPage = React.lazy(() => import('./pages/content/ContentEditorPage').then(m => ({ default: m.ContentEditorPage })));
const SchemasListPage = React.lazy(() => import('./pages/schemas/SchemasListPage').then(m => ({ default: m.SchemasListPage })));
const SchemaBuilderPage = React.lazy(() => import('./pages/schemas/SchemaBuilderPage').then(m => ({ default: m.SchemaBuilderPage })));
const ComponentsListPage = React.lazy(() => import('./pages/components/ComponentsListPage').then(m => ({ default: m.ComponentsListPage })));
const ComponentBuilderPage = React.lazy(() => import('./pages/components/ComponentBuilderPage').then(m => ({ default: m.ComponentBuilderPage })));
const TemplatesListPage = React.lazy(() => import('./pages/templates/TemplatesListPage').then(m => ({ default: m.TemplatesListPage })));
const TemplateEditorPage = React.lazy(() => import('./pages/templates/TemplateEditorPage').then(m => ({ default: m.TemplateEditorPage })));
const GeneralSettingsPage = React.lazy(() => import('./pages/settings/GeneralSettingsPage').then(m => ({ default: m.GeneralSettingsPage })));
const MembersPage = React.lazy(() => import('./pages/settings/MembersPage').then(m => ({ default: m.MembersPage })));
const RolesPage = React.lazy(() => import('./pages/settings/RolesPage').then(m => ({ default: m.RolesPage })));
const ApiKeysPage = React.lazy(() => import('./pages/settings/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const AuditLogPage = React.lazy(() => import('./pages/settings/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const SchedulerHubPage = React.lazy(() => import('./pages/scheduler/SchedulerHubPage').then(m => ({ default: m.SchedulerHubPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, setUser, setOrganizations, setActiveOrg, setLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (isMounted) {
          setUser(data.data.user);
          setOrganizations(data.data.organizations);

          const savedOrgId = localStorage.getItem('cms_active_org_id');
          const matchedOrg =
            data.data.organizations.find((o: any) => o.id === savedOrgId) ||
            data.data.organizations[0] ||
            null;

          setActiveOrg(matchedOrg);
        }
      } catch (err) {
        if (isMounted && location.pathname !== '/login') {
          navigate('/login');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen fullscreen label="Initializing session..." />;
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary fullscreen>
          <React.Suspense fallback={<LoadingScreen fullscreen label="Loading..." />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/"
                element={
                  <AuthGuard>
                    <AppLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />

                {/* Content Entries Studio */}
                <Route path="content" element={<ContentDashboardPage />} />
                <Route path="content/:slug" element={<ContentListPage />} />
                <Route path="content/:slug/new" element={<ContentEditorPage />} />
                <Route path="content/:slug/:id" element={<ContentEditorPage />} />

                {/* Schema Builder */}
                <Route path="schemas" element={<SchemasListPage />} />
                <Route path="schemas/new" element={<SchemaBuilderPage />} />
                <Route path="schemas/:id" element={<SchemaBuilderPage />} />

                {/* Component Library */}
                <Route path="components" element={<ComponentsListPage />} />
                <Route path="components/new" element={<ComponentBuilderPage />} />
                <Route path="components/:id" element={<ComponentBuilderPage />} />

                {/* Templates Studio */}
                <Route path="templates" element={<TemplatesListPage />} />
                <Route path="templates/new" element={<TemplateEditorPage />} />
                <Route path="templates/:id" element={<TemplateEditorPage />} />

                {/* Email Scheduler Hub */}
                <Route path="scheduler" element={<SchedulerHubPage />} />

                {/* Settings & RBAC */}
                <Route path="settings" element={<SettingsLayout />}>
                  <Route index element={<Navigate to="general" replace />} />
                  <Route path="general" element={<GeneralSettingsPage />} />
                  <Route path="members" element={<MembersPage />} />
                  <Route path="roles" element={<RolesPage />} />
                  <Route path="api-keys" element={<ApiKeysPage />} />
                  <Route path="audit-logs" element={<AuditLogPage />} />
                  <Route path="audit-log" element={<Navigate to="audit-logs" replace />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
