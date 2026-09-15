import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, FileText, FileCode, Key, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const DashboardPage: React.FC = () => {
  const { user, activeOrg } = useAuthStore();

  const quickActions = [
    {
      title: 'Build Content Type',
      description: 'Create new schemas with fields, relations, and components.',
      icon: Layers,
      href: '/schemas/new',
      color: 'bg-indigo-500',
    },
    {
      title: 'Manage Content',
      description: 'Create, edit, and publish content entries.',
      icon: FileText,
      href: '/content',
      color: 'bg-emerald-500',
    },
    {
      title: 'Design Template',
      description: 'Create Handlebars templates with TipTap & Monaco.',
      icon: FileCode,
      href: '/templates/new',
      color: 'bg-amber-500',
    },
    {
      title: 'Generate API Key',
      description: 'Issue org-scoped keys to consume the /render API.',
      icon: Key,
      href: '/settings/api-keys',
      color: 'bg-blue-500',
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-8 text-white shadow-xl shadow-indigo-100 dark:shadow-none">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" /> Google OAuth Active
            </span>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.name || 'Administrator'}!
            </h1>
            <p className="text-indigo-100 text-sm max-w-xl">
              You are managing{' '}
              <strong className="text-white underline">{activeOrg?.name || 'your organization'}</strong>.
              Use the schema builder and template engine to deliver headless content anywhere.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.href}
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div
                  className={`h-12 w-12 rounded-xl ${action.color} flex items-center justify-center text-white mb-4 shadow-md`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {action.title}
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {action.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 gap-1">
                <span>Open</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Architecture & Status Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Environment & System Status
        </h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
            <span className="text-xs text-slate-400">Database Engine</span>
            <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
              PostgreSQL (JSONB Storage)
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
            <span className="text-xs text-slate-400">Rendering Engine</span>
            <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
              Handlebars + Precompilation
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
            <span className="text-xs text-slate-400">Target Memory Budget</span>
            <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ~150 - 200 MB (Lean Monolith)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
