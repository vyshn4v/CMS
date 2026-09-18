import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/api';

interface CreateSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

export const CreateSchedulerModal: React.FC<CreateSchedulerModalProps> = ({
  isOpen,
  onClose,
  orgId,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [contentTypeId, setContentTypeId] = useState('');
  const [queueId, setQueueId] = useState('');
  const [defaultTo, setDefaultTo] = useState('');
  const [defaultCc, setDefaultCc] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available Templates
  const { data: templatesData, isLoading: isLoadingTemplates } = useQuery<any>({
    queryKey: ['templates', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/templates`);
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId && isOpen,
  });

  // 2. Fetch available Models (Schemas)
  const { data: schemasData, isLoading: isLoadingSchemas } = useQuery<any>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId && isOpen,
  });

  // 3. Fetch available Dynamic Queues
  const { data: queuesData, isLoading: isLoadingQueues } = useQuery<any>({
    queryKey: ['queues', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/queues`);
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId && isOpen,
  });

  const templates: any[] = Array.isArray(templatesData)
    ? templatesData
    : Array.isArray(templatesData?.items)
    ? templatesData.items
    : Array.isArray(templatesData?.data)
    ? templatesData.data
    : [];

  const schemas: any[] = Array.isArray(schemasData)
    ? schemasData
    : Array.isArray(schemasData?.items)
    ? schemasData.items
    : Array.isArray(schemasData?.data)
    ? schemasData.data
    : [];

  const queues: any[] = Array.isArray(queuesData)
    ? queuesData
    : Array.isArray(queuesData?.items)
    ? queuesData.items
    : Array.isArray(queuesData?.data)
    ? queuesData.data
    : [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/orgs/${orgId}/schedulers`, {
        name,
        description: description || undefined,
        templateId,
        contentTypeId: contentTypeId || undefined,
        queueId,
        defaultTo: defaultTo || undefined,
        defaultCc: defaultCc || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulers', orgId] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create scheduler');
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setTemplateId('');
    setContentTypeId('');
    setQueueId('');
    setDefaultTo('');
    setDefaultCc('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !templateId || !queueId) return;
    setError(null);
    createMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Email Scheduler"
      description="Configure a reusable transactional email delivery pipeline tied to a template and queue."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Scheduler Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Order Confirmation Dispatcher"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dispatches customer invoice with order item breakdown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Template <span className="text-rose-500">*</span>
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">{isLoadingTemplates ? 'Loading templates...' : 'Select a template...'}</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type})
                </option>
              ))}
            </select>
            {templates.length === 0 && !isLoadingTemplates && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                No templates found. Please create an email template in Templates Studio first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bound Model (Schema) <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={contentTypeId}
              onChange={(e) => setContentTypeId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">
                {isLoadingSchemas ? 'Loading models...' : 'None (Dynamic Raw Payload)'}
              </option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target BullMQ Queue <span className="text-rose-500">*</span>
            </label>
            <select
              value={queueId}
              onChange={(e) => setQueueId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">{isLoadingQueues ? 'Loading queues...' : 'Select a dynamic queue...'}</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({q.concurrency} workers)
                </option>
              ))}
            </select>
            {queues.length === 0 && !isLoadingQueues && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                No dynamic queues found. Please create a queue in the Queues tab first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Recipient (To)
            </label>
            <Input
              type="email"
              value={defaultTo}
              onChange={(e) => setDefaultTo(e.target.value)}
              placeholder="e.g. notifications@customer.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Carbon Copy (Cc)
            </label>
            <Input
              type="email"
              value={defaultCc}
              onChange={(e) => setDefaultCc(e.target.value)}
              placeholder="e.g. audit-copy@company.com"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending}
            disabled={!name.trim() || !templateId || !queueId || createMutation.isPending}
          >
            Create Scheduler
          </Button>
        </div>
      </form>
    </Modal>
  );
};
