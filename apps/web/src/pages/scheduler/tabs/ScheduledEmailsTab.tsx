import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  RefreshCw,
  Ban,
  Mail,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { EmptyState } from '../../../components/ui/empty-state';
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

  const { data: responseData, isLoading } = useQuery<any>({
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
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading email dispatch jobs...</div>
      ) : emails.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-8 w-8 text-slate-400" />}
          title="No scheduled emails found"
          description="Emails dispatched or scheduled via UI or API will be tracked here in real-time."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500">
                <th className="py-3 px-4 font-semibold">Recipient (To)</th>
                <th className="py-3 px-4 font-semibold">Scheduler Pipeline</th>
                <th className="py-3 px-4 font-semibold">Scheduled For / Sent At</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Attempts</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {emails.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {e.to}
                    </div>
                    {e.subject && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{e.subject}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-indigo-600 dark:text-indigo-400">
                    {e.scheduler?.name || '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {new Date(e.scheduledFor).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    {e.status === 'COMPLETED' ? (
                      <Badge variant="success" className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        COMPLETED
                      </Badge>
                    ) : e.status === 'SCHEDULED' ? (
                      <Badge variant="blue" className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        SCHEDULED
                      </Badge>
                    ) : e.status === 'PROCESSING' ? (
                      <Badge variant="warning" className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                        PROCESSING
                      </Badge>
                    ) : e.status === 'CANCELLED' ? (
                      <Badge variant="default" className="inline-flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        CANCELLED
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        FAILED
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{e.attempts}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEmail(e)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 h-7 w-7 p-0"
                        title="View details & payload"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      {e.status === 'SCHEDULED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelMutation.mutate(e.id)}
                          disabled={cancelMutation.isPending}
                          className="text-slate-400 hover:text-amber-600 h-7 w-7 p-0"
                          title="Cancel pending dispatch"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {e.status === 'FAILED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryMutation.mutate(e.id)}
                          disabled={retryMutation.isPending}
                          className="text-slate-400 hover:text-indigo-600 h-7 w-7 p-0"
                          title="Retry delivery now"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmailDetailsDrawer
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail}
      />
    </div>
  );
};
