import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowRight, FileText, Database } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { ContentTypeDto } from '@cms/shared-types';

export const ContentDashboardPage: React.FC = () => {
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;
  const navigate = useNavigate();

  const { data: schemas = [], isLoading } = useQuery<ContentTypeDto[]>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Content Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage, edit, and publish content entries for your structured content models.
          </p>
        </div>
        <button
          onClick={() => navigate('/schemas/new')}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Content Model</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading content models...</div>
      ) : schemas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <Database className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            No Content Types Defined
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Before creating entries, build a content model in the Schema Builder with your required fields.
          </p>
          <button
            onClick={() => navigate('/schemas/new?kind=COLLECTION')}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Content Type</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemas.map((schema) => (
            <div
              key={schema.id}
              onClick={() => navigate(`/content/${schema.slug}`)}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/60 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      schema.kind === 'COLLECTION'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {schema.kind}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3">
                  {schema.name}
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  /{schema.slug}
                </p>

                {schema.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {schema.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  {schema.schema?.fields?.length || 0} fields
                </span>
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:gap-1.5 transition-all">
                  Manage Entries <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
