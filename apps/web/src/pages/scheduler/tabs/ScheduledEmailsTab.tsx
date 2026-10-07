import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Eye,
  RefreshCw,
  Ban,
  Mail,
} from 'lucide-react';
import {
  Badge,
  Input,
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
} from '../../../components/ui';
import { api } from '../../../lib/api';
import { EmailDetailsDrawer } from '../components/EmailDetailsDrawer';

interface ScheduledEmailsTabProps {
  orgId: string;
}

export const ScheduledEmailsTab: React.FC<ScheduledEmailsTabProps> = ({ orgId }) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);

  const { data: responseData, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ['scheduled-emails', orgId, statusFilter, search],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get(`/orgs/${orgId}/scheduled-emails`, { params });
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId,
    refetchInterval: 4000, // Live poll every 4s to track execution state
  });

  const emails: any[] = Array.isArray(responseData)
    ? responseData
    : Array.isArray(responseData?.data)
    ? responseData.data
    : Array.isArray(responseData?.items)
    ? responseData.items
    : [];

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/orgs/${orgId}/scheduled-emails/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails', orgId] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/orgs/${orgId}/scheduled-emails/${id}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails', orgId] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient or subject..."
            className="pl-8 text-xs"
          />
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled (Delayed)</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : emails.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-8 w-8 text-slate-400" />}
          title="No scheduled emails found"
          description="Emails dispatched or scheduled via UI or API will be tracked here in real-time."
        />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient (To)</TableHead>
                <TableHead>Scheduler Pipeline</TableHead>
                <TableHead>Scheduled For / Sent At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {e.to}
                    </div>
                    {e.subject && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{e.subject}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-indigo-600 dark:text-indigo-400">
                    {e.scheduler?.name || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-slate-500">
                    {new Date(e.scheduledFor).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        e.status === 'COMPLETED'
                          ? 'success'
                          : e.status === 'SCHEDULED'
                          ? 'blue'
                          : e.status === 'PROCESSING'
                          ? 'warning'
                          : e.status === 'CANCELLED'
                          ? 'default'
                          : 'danger'
                      }
                      size="sm"
                      dot
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-slate-500">{e.attempts}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedEmail(e)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        title="View details & payload"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {e.status === 'SCHEDULED' && (
                        <button
                          onClick={() => cancelMutation.mutate(e.id)}
                          disabled={cancelMutation.isPending}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-600 disabled:opacity-40 transition"
                          title="Cancel pending dispatch"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {e.status === 'FAILED' && (
                        <button
                          onClick={() => retryMutation.mutate(e.id)}
                          disabled={retryMutation.isPending}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 disabled:opacity-40 transition"
                          title="Retry delivery now"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}

      <EmailDetailsDrawer
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail}
      />
    </div>
  );
};
