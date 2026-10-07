import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Trash2, CalendarClock, FileCode, Cpu, Mail } from 'lucide-react';
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
import { CreateSchedulerModal } from '../components/CreateSchedulerModal';
import { DispatchModal } from '../components/DispatchModal';

interface SchedulersTabProps {
  orgId: string;
}

export const SchedulersTab: React.FC<SchedulersTabProps> = ({ orgId }) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForDispatch, setSelectedForDispatch] = useState<any | null>(null);

  const { data: responseData, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ['schedulers', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/schedulers`);
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId,
  });

  const schedulers: any[] = Array.isArray(responseData)
    ? responseData
    : Array.isArray(responseData?.data)
    ? responseData.data
    : Array.isArray(responseData?.items)
    ? responseData.items
    : [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/orgs/${orgId}/schedulers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulers', orgId] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Email Schedulers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-configured email delivery pipelines bound to templates, models, and BullMQ queues.
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
            Create Scheduler
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : schedulers.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-8 w-8 text-slate-400" />}
          title="No schedulers configured"
          description="Create your first email scheduler to start dispatching transactional emails."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Create Scheduler
            </Button>
          }
        />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scheduler Name</TableHead>
                <TableHead>Source Mode</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Bound Model</TableHead>
                <TableHead>Queue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipient Policy</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedulers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {s.name}
                    </div>
                    {s.description && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {s.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={s.sourceType === 'ENTRY' ? 'purple' : 'blue'}
                      size="sm"
                      dot
                    >
                      {s.sourceType === 'ENTRY' ? 'Entry' : 'Template'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      <FileCode className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{s.template?.name || s.templateId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.contentType ? (
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {s.contentType.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Cpu className="h-3 w-3 text-slate-400" />
                      {s.queue?.name || s.queueId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={s.isActive !== false ? 'success' : 'default'}
                      size="sm"
                      dot
                    >
                      {s.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-[11px] space-y-0.5">
                    <div className="font-mono">
                      <span className="text-[10px] text-slate-400 font-sans">To: </span>
                      {s.defaultTo || (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Mail className="w-3 h-3 text-indigo-400" /> .env admin
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      <span className="font-sans">From: </span>
                      {s.defaultFrom ? (
                        <span className="text-slate-600 dark:text-slate-300 font-medium truncate inline-block max-w-[140px] align-bottom">
                          {s.defaultFrom}
                        </span>
                      ) : (
                        <span>.env SMTP_FROM</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedForDispatch(s)}
                        className="p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 transition"
                        title="Dispatch Email"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete scheduler "${s.name}"?`)) {
                            deleteMutation.mutate(s.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 text-slate-400 transition"
                        title="Delete Scheduler"
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

      <CreateSchedulerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        orgId={orgId}
      />

      <DispatchModal
        isOpen={!!selectedForDispatch}
        onClose={() => setSelectedForDispatch(null)}
        orgId={orgId}
        scheduler={selectedForDispatch}
      />
    </div>
  );
};
