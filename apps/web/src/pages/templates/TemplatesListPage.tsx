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
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
  Button,
  Badge,
  EmptyState,
  TableSkeleton,
  RefreshButton,
  TableCard,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '../../components/ui';

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
  const {
    data: responseData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<{ items: TemplateDto[]; total: number }>({
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Templates Studio</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Author and publish dynamic Handlebars templates for transactional emails, web layouts, and JSON data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
          <Link to="/templates/new">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              New Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Target Model Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <TableCard>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={5} />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<FileCode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Target Output Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow
                  key={tpl.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/templates/${tpl.id}`)}
                >
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>{tpl.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {tpl.contentType ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {tpl.contentType.name}
                        </span>
                        {tpl.contentType.schema?.fields?.length ? (
                          <Badge variant="purple" size="xs">
                            {tpl.contentType.schema.fields.length}{' '}
                            {tpl.contentType.schema.fields.length === 1 ? 'field' : 'fields'}
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400/80 italic text-[11px]">Unlinked Model</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={tpl.status === 'PUBLISHED' ? 'success' : 'default'}
                      dot
                    >
                      {tpl.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(tpl.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </TableCell>

                  <TableCell
                    className="text-right space-x-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/templates/${tpl.id}`)}
                      title="Edit Template"
                      className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
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
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </div>
  );
};
