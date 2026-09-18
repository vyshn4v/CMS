import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/api';

interface CreateQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

export const CreateQueueModal: React.FC<CreateQueueModalProps> = ({
  isOpen,
  onClose,
  orgId,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [concurrency, setConcurrency] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/orgs/${orgId}/queues`, {
        name,
        description: description || undefined,
        concurrency: Number(concurrency),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues', orgId] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create queue');
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setConcurrency(5);
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    createMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Dynamic BullMQ Queue"
      description="Initialize a dedicated delayed worker queue for your organization."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Queue Identifier <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
            placeholder="e.g. priority-alerts"
            required
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Only lowercase letters, numbers, hyphens, and underscores.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Critical high-speed transactional notifications"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Worker Concurrency
          </label>
          <Input
            type="number"
            min={1}
            max={50}
            value={concurrency}
            onChange={(e) => setConcurrency(parseInt(e.target.value, 10) || 1)}
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Number of concurrent emails this worker processes simultaneously (1 to 50).
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Queue'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
