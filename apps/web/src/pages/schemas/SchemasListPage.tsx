import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Plus, Edit3, Trash2, Database, Copy, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { ContentTypeDto } from '@cms/shared-types';

export const SchemasListPage: React.FC = () => {
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const { data: schemas = [], isLoading } = useQuery<ContentTypeDto[]>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) return;
      await api.delete(`/orgs/${orgId}/schemas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas', orgId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to delete schema');
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Content-Type Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Define your API schemas, structured data models, and typed collection entries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/schemas/new?kind=COLLECTION')}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Collection Type</span>
          </button>
          <button
            onClick={() => navigate('/schemas/new?kind=SINGLE')}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Single Type</span>
          </button>
        </div>
      </div>

      {/* List Grid */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading schemas...</div>
        ) : schemas.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              No Content Types Yet
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Create your first content model to start publishing entries and serving structured JSON/HTML.
            </p>
            <button
              onClick={() => navigate('/schemas/new?kind=COLLECTION')}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Collection Type</span>
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Content Type</th>
                <th className="py-3 px-4">API Slug</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Fields</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {schemas.map((schema) => (
                <tr
                  key={schema.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <p>{schema.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                            ID: {schema.id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(schema.id);
                              setCopiedId(schema.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            title="Copy schemaId for Generation & Render APIs"
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                          >
                            {copiedId === schema.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        {schema.description && (
                          <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                            {schema.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    /{schema.slug}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        schema.kind === 'COLLECTION'
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                          : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                      }`}
                    >
                      {schema.kind}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                    {schema.schema?.fields?.length || 0} fields
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(schema.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <Link
                      to={`/schemas/${schema.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete schema "${schema.name}"?`)) {
                          deleteMutation.mutate(schema.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
