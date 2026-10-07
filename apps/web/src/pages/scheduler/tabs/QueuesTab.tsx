import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Cpu } from 'lucide-react';
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
} from '../../../components/ui';
import { api } from '../../../lib/api';
import { ReinitializeBanner } from '../components/ReinitializeBanner';
import { CreateQueueModal } from '../components/CreateQueueModal';

interface QueuesTabProps {
  orgId: string;
}

export const QueuesTab: React.FC<QueuesTabProps> = ({ orgId }) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    data: queuesData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<any>({
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
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Queue
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={5} />
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
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue Identifier</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Concurrency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Runtime Worker</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {q.name}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {q.description || '—'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-mono font-medium">
                      <Cpu className="h-3 w-3 text-slate-400" />
                      {q.concurrency} workers
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        q.status === 'ACTIVE'
                          ? 'success'
                          : q.status === 'PENDING_INITIALIZATION'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                      dot
                    >
                      {q.status === 'PENDING_INITIALIZATION' ? 'PENDING REINIT' : q.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={q.isRuntimeActive ? 'success' : 'default'}
                      size="sm"
                      dot
                    >
                      {q.isRuntimeActive ? 'Listening' : 'Idle'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          if (confirm(`Delete queue "${q.name}"?`)) {
                            deleteMutation.mutate(q.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 text-slate-400 transition"
                        title="Delete Queue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}

      <CreateQueueModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        orgId={orgId}
      />
    </div>
  );
};
