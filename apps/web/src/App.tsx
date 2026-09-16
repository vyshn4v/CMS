import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import { api } from './lib/api';
import { LoginPage } from './pages/auth/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ContentDashboardPage } from './pages/content/ContentDashboardPage';
import { ContentListPage } from './pages/content/ContentListPage';
import { ContentEditorPage } from './pages/content/ContentEditorPage';
import { SchemasListPage } from './pages/schemas/SchemasListPage';
import { SchemaBuilderPage } from './pages/schemas/SchemaBuilderPage';
import { ComponentsListPage } from './pages/components/ComponentsListPage';
import { ComponentBuilderPage } from './pages/components/ComponentBuilderPage';
import { TemplatesListPage } from './pages/templates/TemplatesListPage';
import { TemplateEditorPage } from './pages/templates/TemplateEditorPage';
import { SettingsLayout } from './pages/settings/SettingsLayout';
import { MembersPage } from './pages/settings/MembersPage';
import { RolesPage } from './pages/settings/RolesPage';
import { ApiKeysPage } from './pages/settings/ApiKeysPage';

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
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-xs font-medium text-slate-500">Initializing session...</p>
        </div>
      </div>
    );
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

            {/* Settings & RBAC */}
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="members" replace />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="api-keys" element={<ApiKeysPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
