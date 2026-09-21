import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Boxes,
  FileText,
  FileCode,
  CalendarClock,
  Key,
  History,
  Settings,
  LogOut,
  Building2,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';
import { OrgSwitcher } from './OrgSwitcher';
import { ContentTypeDto } from '@cms/shared-types';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeOrg, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    logout();
    navigate('/login');
  };

  const orgId = activeOrg?.id;

  const { data: schemas = [] } = useQuery<ContentTypeDto[]>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200 dark:shadow-none">
            C
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100 leading-none">CMS Engine</h1>
            <span className="text-xs text-slate-400 font-medium">Headless Studio</span>
          </div>
        </div>

        {/* Org Selector */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <OrgSwitcher />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname === '/dashboard'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            to="/content"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname === '/content'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            Content Manager
          </Link>

          {/* Collection Types Dynamic Subtree */}
          {schemas.length > 0 && (
            <div className="pt-2 pb-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Collection Models
              </span>
              <div className="mt-1 space-y-0.5">
                {schemas.map((s) => {
                  const isModelActive = location.pathname.startsWith(`/content/${s.slug}`);
                  return (
                    <Link
                      key={s.id}
                      to={`/content/${s.slug}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isModelActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          isModelActive
                            ? 'bg-indigo-600 dark:bg-indigo-400'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                      <span className="truncate">{s.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 pb-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Builder & Tools
            </span>
          </div>

          <Link
            to="/schemas"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname.startsWith('/schemas')
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            Schema Builder
          </Link>

          <Link
            to="/components"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname.startsWith('/components')
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" />
            Component Library
          </Link>

          <Link
            to="/templates"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname.startsWith('/templates')
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileCode className="h-4 w-4" />
            Templates
          </Link>

          <Link
            to="/scheduler"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname.startsWith('/scheduler')
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarClock className="h-4 w-4" />
            Scheduler
          </Link>

          <Link
            to="/settings/api-keys"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname === '/settings/api-keys'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Key className="h-4 w-4" />
            API Keys
          </Link>

          <Link
            to="/settings/audit-logs"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname === '/settings/audit-logs'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="h-4 w-4" />
            Audit Logs
          </Link>

          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <BookOpen className="h-4 w-4" />
            API Docs
            <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
          </a>

          <Link
            to="/settings/general"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              location.pathname.startsWith('/settings') &&
              location.pathname !== '/settings/api-keys' &&
              location.pathname !== '/settings/audit-logs'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {activeOrg?.name || 'Loading organization...'}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Active Role: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeOrg?.role || 'None'}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
