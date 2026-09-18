import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Cpu, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';
import { api } from '../../../lib/api';
import { ReinitializeBanner } from '../components/ReinitializeBanner';
import { CreateQueueModal } from '../components/CreateQueueModal';

interface QueuesTabProps {
  orgId: string;
}

export const QueuesTab: React.FC<QueuesTabProps> = ({ orgId }) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: queuesData, isLoading } = useQuery<any>({
    queryKey: ['queues', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/queues`);
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId,
    refetchInterval: 5000,
  });

  const queues: any[] = Array.isArray(queuesData)
    ? queuesData
    : Array.isArray(queuesData?.data)
    ? queuesData.data
    : Array.isArray(queuesData?.items)
    ? queuesData.items
    : [];

  const deleteMutation = useMutation({
    mutationFn: async (queueId: string) => {
      await api.delete(`/orgs/${orgId}/queues/${queueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues', orgId] });
    },
  });

  const hasPending = queues.some((q) => q.status === 'PENDING_INITIALIZATION');

  return (
    <div className="space-y-6">
      {/* Dynamic Reinitialization Banner */}
      <ReinitializeBanner orgId={orgId} hasPendingQueues={hasPending} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Dynamic BullMQ Queues
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Runtime worker pools backed by Redis for delayed and immediate email dispatches.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Create Queue
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading dynamic queues...</div>
      ) : queues.length === 0 ? (
        <EmptyState
          icon={<Cpu className="h-8 w-8 text-slate-400" />}
          title="No queues initialized"
          description="Create your first BullMQ queue to power your email scheduler."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Add Queue
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500">
                <th className="py-3 px-4 font-semibold">Queue Identifier</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Concurrency</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Runtime Worker</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {queues.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {q.name}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {q.description || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-mono font-medium">
                      <Cpu className="h-3 w-3 text-slate-400" />
                      {q.concurrency} workers
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {q.status === 'ACTIVE' ? (
                      <Badge variant="success" className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        ACTIVE
                      </Badge>
                    ) : q.status === 'PENDING_INITIALIZATION' ? (
                      <Badge variant="warning" className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        PENDING REINIT
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {q.status}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {q.isRuntimeActive ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Listening
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                        Idle / Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete queue "${q.name}"?`)) {
                          deleteMutation.mutate(q.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateQueueModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        orgId={orgId}
      />
    </div>
  );
};
