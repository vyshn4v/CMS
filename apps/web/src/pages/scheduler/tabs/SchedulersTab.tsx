import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Trash2, CalendarClock, FileCode, Layers, Cpu, Mail } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';
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

  const { data: responseData, isLoading } = useQuery<any>({
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
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Create Scheduler
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading schedulers...</div>
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
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500">
                <th className="py-3 px-4 font-semibold">Scheduler Name</th>
                <th className="py-3 px-4 font-semibold">Source Mode</th>
                <th className="py-3 px-4 font-semibold">Template</th>
                <th className="py-3 px-4 font-semibold">Bound Model</th>
                <th className="py-3 px-4 font-semibold">Queue</th>
                <th className="py-3 px-4 font-semibold">Recipient Policy</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {schedulers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {s.name}
                    </div>
                    {s.description && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {s.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {s.sourceType === 'ENTRY' ? (
                      <Badge variant="success" className="inline-flex items-center gap-1 font-medium text-[10px]">
                        <Layers className="h-3 w-3" />
                        Predefined Entry
                      </Badge>
                    ) : (
                      <Badge variant="blue" className="inline-flex items-center gap-1 font-medium text-[10px]">
                        <FileCode className="h-3 w-3" />
                        Dynamic Template
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="default" className="inline-flex items-center gap-1 font-mono">
                      <FileCode className="h-3 w-3" />
                      {s.template?.name || s.templateId}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {s.contentType ? (
                      <Badge variant="outline" className="inline-flex items-center gap-1 font-medium">
                        <Layers className="h-3 w-3" />
                        {s.contentType.name}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Cpu className="h-3 w-3 text-slate-400" />
                      {s.queue?.name || s.queueId}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] space-y-0.5">
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
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => setSelectedForDispatch(s)}
                        className="h-7 text-xs flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                      >
                        <Send className="h-3 w-3" />
                        Dispatch
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete scheduler "${s.name}"?`)) {
                            deleteMutation.mutate(s.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
