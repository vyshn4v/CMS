import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  Globe,
  Archive,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { ContentTypeDto, ContentEntryListResponse, ContentEntryStatus } from '@cms/shared-types';

export const ContentListPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContentEntryStatus | ''>('');
  const [copiedId, setCopiedId] = useState(false);

  // Fetch content type details
  const { data: contentType, isLoading: isLoadingSchema } = useQuery<ContentTypeDto>({
    queryKey: ['schema', orgId, slug],
    queryFn: async () => {
      if (!orgId || !slug) return null;
      const res = await api.get(`/orgs/${orgId}/schemas/slug/${slug}`);
      return res.data.data;
    },
    enabled: !!orgId && !!slug,
  });

  // Fetch entries
  const { data: listData, isLoading: isLoadingEntries } = useQuery<ContentEntryListResponse>({
    queryKey: ['contentEntries', orgId, slug, page, statusFilter],
    queryFn: async () => {
      if (!orgId || !slug) return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/orgs/${orgId}/content/${slug}?${params.toString()}`);
      return res.data;
    },
    enabled: !!orgId && !!slug,
  });

  // Publish / Unpublish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      if (!orgId || !slug) return;
      const endpoint = isPublished
        ? `/orgs/${orgId}/content/${slug}/${id}/unpublish`
        : `/orgs/${orgId}/content/${slug}/${id}/publish`;
      await api.post(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentEntries', orgId, slug] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Action failed');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId || !slug) return;
      await api.delete(`/orgs/${orgId}/content/${slug}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentEntries', orgId, slug] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Delete failed');
    },
  });

  const getEntryPreview = (data: Record<string, any>) => {
    if (!data) return 'Untitled Entry';
    const candidate = data.title || data.name || data.subject || data.heading;
    if (candidate && typeof candidate === 'string') return candidate;
    const firstVal = Object.values(data).find((v) => typeof v === 'string' && v.trim().length > 0);
    return firstVal ? String(firstVal).slice(0, 40) : 'Untitled Entry';
  };

  if (isLoadingSchema) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading model information...</div>;
  }

  if (!contentType) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Content Model Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">Slug: {slug}</p>
        <button
          onClick={() => navigate('/schemas')}
          className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
        >
          Go to Schemas
        </button>
      </div>
    );
  }

  const entries = listData?.items || [];
  const totalPages = listData?.totalPages || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {contentType.name}
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                contentType.kind === 'COLLECTION'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                  : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
              }`}
            >
              {contentType.kind}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
            <span>Slug: <code className="font-mono text-slate-600 dark:text-slate-300">/{contentType.slug}</code></span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span>schemaId:</span>
              <code className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                {contentType.id}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contentType.id);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                title="Copy schemaId"
                className="text-slate-400 hover:text-indigo-600 transition"
              >
                {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft Only</option>
            <option value="PUBLISHED">Published Only</option>
          </select>

          {/* New Entry Button */}
          {!(contentType.kind === 'SINGLE' && entries.length > 0) && (
            <button
              onClick={() => navigate(`/content/${slug}/new`)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Entries Table Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoadingEntries ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading content entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              No entries found
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Create your first entry for this content model to draft and publish live content.
            </p>
            <button
              onClick={() => navigate(`/content/${slug}/new`)}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Entry</span>
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Entry / Preview</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((entry) => {
                const isPublished = entry.status === 'PUBLISHED';
                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => navigate(`/content/${slug}/${entry.id}`)}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div>
                        <p>{getEntryPreview(entry.data)}</p>
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {entry.id.slice(0, 8)}...
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPublished
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {isPublished ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {entry.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {entry.createdBy?.name || entry.createdBy?.email || 'System'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(entry.updatedAt).toLocaleDateString()}
                    </td>

                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            togglePublishMutation.mutate({
                              id: entry.id,
                              isPublished,
                            })
                          }
                          title={isPublished ? 'Unpublish' : 'Publish'}
                          className={`p-1.5 rounded-lg border transition ${
                            isPublished
                              ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {isPublished ? <Archive className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => navigate(`/content/${slug}/${entry.id}`)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                          title="Edit Entry"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this entry permanently?')) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 text-slate-400 transition"
                          title="Delete Entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
