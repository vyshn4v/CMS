import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';
import {
  FileCode,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Globe,
  Mail,
  FileText,
  Code2,
  Calendar,
} from 'lucide-react';
import { TemplateDto, TemplateType } from '@cms/shared-types';

export const TemplatesListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Fetch templates
  const { data: responseData, isLoading } = useQuery<{ items: TemplateDto[]; total: number }>({
    queryKey: ['templates', orgId, selectedType, selectedStatus, search],
    queryFn: async () => {
      if (!orgId) return { items: [], total: 0 };
      const params = new URLSearchParams();
      if (selectedType !== 'ALL') params.append('type', selectedType);
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

  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'CUSTOM':
        return <FileCode className="h-3.5 w-3.5 text-indigo-500" />;
      case 'EMAIL':
        return <Mail className="h-3.5 w-3.5 text-blue-500" />;
      case 'HTML_PAGE':
        return <Globe className="h-3.5 w-3.5 text-emerald-500" />;
      case 'JSON':
        return <Code2 className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  const getTypeBadgeClass = (type: TemplateType) => {
    switch (type) {
      case 'CUSTOM':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50';
      case 'EMAIL':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
      case 'HTML_PAGE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
      case 'JSON':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

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
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="EMAIL">Email</option>
              <option value="HTML_PAGE">HTML Page</option>
              <option value="JSON">JSON</option>
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
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileCode className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No templates found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              Get started by creating a Handlebars template for transactional emails, web layouts, or JSON feeds.
            </p>
            <Link
              to="/templates/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Template</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Template Name</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Associated Model</th>
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
                        {getTypeIcon(tpl.type)}
                        <span>{tpl.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${getTypeBadgeClass(
                          tpl.type,
                        )}`}
                      >
                        {tpl.type}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {tpl.contentType ? (
                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                          {tpl.contentType.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None (Standalone)</span>
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
