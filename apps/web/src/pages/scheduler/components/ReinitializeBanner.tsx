import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { api } from '../../../lib/api';

interface ReinitializeBannerProps {
  orgId: string;
  hasPendingQueues: boolean;
}

export const ReinitializeBanner: React.FC<ReinitializeBannerProps> = ({
  orgId,
  hasPendingQueues,
}) => {
  const queryClient = useQueryClient();

  const reinitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/orgs/${orgId}/queues/reinitialize`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues', orgId] });
    },
  });

  if (!hasPendingQueues) return null;

  return (
    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 transition-all">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Uninitialized Queues Detected
          </h4>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
            New dynamic BullMQ queues were created in the database. Reinitialize the queue pool to activate runtime workers without restarting the server.
          </p>
        </div>
      </div>

      <Button
        onClick={() => reinitMutation.mutate()}
        disabled={reinitMutation.isPending}
        className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shrink-0 flex items-center gap-1.5 shadow-sm"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${reinitMutation.isPending ? 'animate-spin' : ''}`} />
        {reinitMutation.isPending ? 'Reinitializing...' : 'Reinitialize Queues'}
      </Button>
    </div>
  );
};
