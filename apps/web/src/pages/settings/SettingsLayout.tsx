import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, Shield, Key, History } from 'lucide-react';

export const SettingsLayout: React.FC = () => {
  const tabs = [
    { label: 'Team Members', path: '/settings/members', icon: Users },
    { label: 'Roles & Permissions', path: '/settings/roles', icon: Shield },
    { label: 'API Keys', path: '/settings/api-keys', icon: Key },
    { label: 'Audit Logs', path: '/settings/audit-logs', icon: History },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Organization Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage workspace members, customize RBAC access control, and issue delivery API keys.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div>
        <Outlet />
      </div>
    </div>
  );
};
