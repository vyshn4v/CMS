import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';
import {
  FileCode,
  Plus,
  Search,
  Trash2,
  Edit,
  Calendar,
  Layers,
} from 'lucide-react';
import { ContentTypeDto, TemplateDto } from '@cms/shared-types';

export const TemplatesListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Fetch schemas for model filter
  const { data: schemas = [] } = useQuery<ContentTypeDto[]>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data.data || res.data || [];
    },
    enabled: !!orgId,
  });

  // Fetch templates
  const { data: responseData, isLoading } = useQuery<{ items: TemplateDto[]; total: number }>({
    queryKey: ['templates', orgId, selectedModel, selectedStatus, search],
    queryFn: async () => {
      if (!orgId) return { items: [], total: 0 };
      const params = new URLSearchParams();
      if (selectedModel !== 'ALL') params.append('contentTypeId', selectedModel);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/orgs/${orgId}/templates?${params.toString()}`);
      return res.data.data || res.data;
    },
    enabled: !!orgId,
  });

  const templates = responseData?.items || [];

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/orgs/${orgId}/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
    },
  });

  return (
    <div className="flex flex-col flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Templates Studio
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Author and publish dynamic Handlebars templates for transactional emails, web layouts, and JSON data.
          </p>
        </div>

        <Link
          to="/templates/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Template</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Target Model Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span>Target Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Models</option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileCode className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Templates Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Create a template and attach it to an Output Model to generate structured payloads.
              </p>
            </div>
            <Link
              to="/templates/new"
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Template</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Template Name</th>
                  <th className="px-6 py-3 font-semibold">Target Output Model</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Last Updated</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {templates.map((tpl) => (
                  <tr
                    key={tpl.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => navigate(`/templates/${tpl.id}`)}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-indigo-500" />
                        <span>{tpl.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {tpl.contentType ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {tpl.contentType.name}
                          </span>
                          {tpl.contentType.schema?.fields?.length ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono font-medium border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50">
                              {tpl.contentType.schema.fields.length} {tpl.contentType.schema.fields.length === 1 ? 'field' : 'fields'}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-amber-500/80 italic text-[11px]">Unlinked Model</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          tpl.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {tpl.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-400 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(tpl.updatedAt).toLocaleDateString()}</span>
                    </td>

                    <td
                      className="px-6 py-4 text-right space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/templates/${tpl.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                        title="Edit Template"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete template "${tpl.name}"?`)) {
                            deleteMutation.mutate(tpl.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Delete Template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
