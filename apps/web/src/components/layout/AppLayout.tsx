import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  FileText,
  FileCode,
  Key,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';
import { OrgSwitcher } from './OrgSwitcher';

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

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Content', path: '/content', icon: FileText },
    { label: 'Schema Builder', path: '/schemas', icon: Layers },
    { label: 'Templates', path: '/templates', icon: FileCode },
    { label: 'API Keys', path: '/settings/api-keys', icon: Key },
    { label: 'Settings', path: '/settings/members', icon: Settings },
  ];

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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
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
