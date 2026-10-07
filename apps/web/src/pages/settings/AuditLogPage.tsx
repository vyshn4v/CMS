import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Search,
  Filter,
  Eye,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Globe,
  Tag,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { AuditLogDto, AuditLogListResponse } from '@cms/shared-types';
import {
  Badge,
  BadgeVariant,
  RefreshButton,
  TableCard,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '../../components/ui';

export const AuditLogPage: React.FC = () => {
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch Audit Logs
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<AuditLogListResponse>({
    queryKey: ['audit-logs', orgId, page, limit, actionFilter, resourceFilter, searchTerm],
    queryFn: async () => {
      if (!orgId) return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (resourceFilter !== 'ALL') params.set('resourceType', resourceFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await api.get(`/orgs/${orgId}/audit-logs?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  const logs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || Math.ceil(total / limit) || 1;

  const handleCopyDetails = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    let variant: BadgeVariant = 'default';
    const upper = action.toUpperCase();
    if (upper.includes('CREATE')) variant = 'success';
    else if (upper.includes('UPDATE') || upper.includes('PATCH')) variant = 'blue';
    else if (upper.includes('DELETE') || upper.includes('REVOKE')) variant = 'danger';
    else if (upper.includes('PUBLISH') || upper.includes('UNPUBLISH')) variant = 'purple';
    else if (upper.includes('LOGIN') || upper.includes('AUTH')) variant = 'warning';

    return <Badge variant={variant}>{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Audit Trail
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Immutable historical record of mutating operations, schema modifications, and content lifecycle events.
          </p>
        </div>

        <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, resource type or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-40 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="PUBLISH">Publish</option>
            <option value="UNPUBLISH">Unpublish</option>
            <option value="SECURITY_REJECTION">Security Rejection</option>
            <option value="FAILED_MUTATION">Failed Mutation</option>
          </select>
        </div>

        {/* Resource Filter */}
        <div className="w-full md:w-auto">
          <select
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-40 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Resources</option>
            <option value="content">Content Entry</option>
            <option value="schema">Schema Model</option>
            <option value="component">Component</option>
            <option value="template">Template</option>
            <option value="role">Role / RBAC</option>
            <option value="api_key">API Key</option>
          </select>
        </div>

        {/* Limit */}
        <div className="w-full md:w-auto">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="w-full md:w-28 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Resource ID</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                  <TableCell><div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-12 ml-auto bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      No audit logs recorded
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Mutating operations such as creating schemas, publishing templates, or modifying entries will appear here.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  {/* Timestamp */}
                  <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {formatDate(log.createdAt)}
                    </div>
                  </TableCell>

                  {/* Actor */}
                  <TableCell>
                    {log.user ? (
                      <div className="flex items-center gap-2">
                        {log.user.avatarUrl ? (
                          <img
                            src={log.user.avatarUrl}
                            alt={log.user.name}
                            className="h-6 w-6 rounded-full shrink-0"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center justify-center text-[10px] shrink-0">
                            {log.user.name?.[0] || 'U'}
                          </div>
                        )}
                        <div className="truncate max-w-[140px]">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {log.user.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {log.user.email}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                        <Shield className="h-3 w-3 text-slate-400" /> System / API
                      </span>
                    )}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </TableCell>

                  {/* Resource Type */}
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      <Tag className="h-3 w-3 text-slate-400" />
                      {log.resourceType}
                    </span>
                  </TableCell>

                  {/* Resource ID */}
                  <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {log.resourceId ? (
                      <span title={log.resourceId} className="cursor-help">
                        {log.resourceId.length > 12
                          ? `${log.resourceId.slice(0, 8)}...${log.resourceId.slice(-4)}`
                          : log.resourceId}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>

                  {/* IP Address */}
                  <TableCell className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.ipAddress ? (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                        {log.ipAddress}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  {/* Inspector Button */}
                  <TableCell className="text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {logs.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {Math.min(page * limit, total)}
            </span>{' '}
            of <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </TableCard>

      {/* Audit Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Audit Event Details
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {selectedLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Event Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Action</p>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Resource</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {selectedLog.resourceType}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actor</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {selectedLog.user?.name || 'System / API'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">IP Address</p>
                  <p className="mt-1 text-xs font-mono text-slate-700 dark:text-slate-300">
                    {selectedLog.ipAddress || 'Internal'}
                  </p>
                </div>
              </div>

              {selectedLog.resourceId && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Resource ID</p>
                  <p className="mt-1 text-xs font-mono text-slate-800 dark:text-slate-200 break-all select-all">
                    {selectedLog.resourceId}
                  </p>
                </div>
              )}

              {/* JSON Payload Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payload & Mutation Metadata
                  </span>
                  <button
                    onClick={handleCopyDetails}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-64 shadow-inner">
                  <pre>{JSON.stringify(selectedLog.details || {}, null, 2)}</pre>
                </div>
              </div>

              {/* Timestamp Details */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <span>Recorded at:</span>
                <span className="font-mono">{selectedLog.createdAt}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
