import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';
import { Button, Badge, EmptyState, Spinner } from '../../components/ui';

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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileCode className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white">Templates Studio</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Author and publish dynamic Handlebars templates for transactional emails, web layouts, and JSON data.
          </p>
        </div>

        <Link to="/templates/new">
          <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
            New Template
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search templates by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Target Model Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Target Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Spinner size="md" label="Loading templates..." />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<FileCode className="w-6 h-6 text-indigo-400" />}
            title="No Templates Found"
            description="Create a template and attach it to an Output Model to generate structured payloads."
            action={
              <Link to="/templates/new">
                <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Create New Template
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Template Name</th>
                  <th className="px-6 py-3.5 font-semibold">Target Output Model</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Last Updated</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {templates.map((tpl) => (
                  <tr
                    key={tpl.id}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => navigate(`/templates/${tpl.id}`)}
                  >
                    <td className="px-6 py-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <FileCode className="w-4 h-4 text-indigo-400" />
                        <span>{tpl.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {tpl.contentType ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200">
                            {tpl.contentType.name}
                          </span>
                          {tpl.contentType.schema?.fields?.length ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono font-medium border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                              {tpl.contentType.schema.fields.length}{' '}
                              {tpl.contentType.schema.fields.length === 1 ? 'field' : 'fields'}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-amber-400/80 italic text-[11px]">Unlinked Model</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        variant={tpl.status === 'PUBLISHED' ? 'success' : 'default'}
                        size="sm"
                        dot
                      >
                        {tpl.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(tpl.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td
                      className="px-6 py-4 text-right space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/templates/${tpl.id}`)}
                        title="Edit Template"
                        className="text-slate-400 hover:text-white"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete template "${tpl.name}"?`)) {
                            deleteMutation.mutate(tpl.id);
                          }
                        }}
                        title="Delete Template"
                        className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
