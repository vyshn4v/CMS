import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCode, Layers, Mail, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
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
  const [defaultFrom, setDefaultFrom] = useState('');
  const [contentTypeId, setContentTypeId] = useState('');
  const [sourceType, setSourceType] = useState<'TEMPLATE' | 'ENTRY'>('TEMPLATE');
  const [templateId, setTemplateId] = useState('');
  const [entryId, setEntryId] = useState('');
  const [queueId, setQueueId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch System Defaults (SMTP_FROM and admin recipient)
  const { data: systemDefaults } = useQuery<{ defaultSmtpFrom: string; defaultRecipient: string }>({
    queryKey: ['scheduler-system-defaults', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/schedulers/system-defaults`);
      return res.data?.data || res.data;
    },
    enabled: !!orgId && isOpen,
  });

  // 1. Fetch available Models / Schemas
  const { data: schemasData, isLoading: isLoadingSchemas } = useQuery<any>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId && isOpen,
  });

  const schemas: any[] = Array.isArray(schemasData)
    ? schemasData
    : Array.isArray(schemasData?.items)
    ? schemasData.items
    : Array.isArray(schemasData?.data)
    ? schemasData.data
    : [];

  // Selected Schema Object
  const selectedSchema = useMemo(() => {
    return schemas.find((s) => s.id === contentTypeId) || null;
  }, [schemas, contentTypeId]);

  // 2. Fetch available Templates
  const { data: templatesData, isLoading: isLoadingTemplates } = useQuery<any>({
    queryKey: ['templates', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/templates`);
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId && isOpen,
  });

  const allTemplates: any[] = Array.isArray(templatesData)
    ? templatesData
    : Array.isArray(templatesData?.items)
    ? templatesData.items
    : Array.isArray(templatesData?.data)
    ? templatesData.data
    : [];

  // Filter templates matching the selected schema
  const relevantTemplates = useMemo(() => {
    if (!contentTypeId) return allTemplates;
    return allTemplates.filter((t) => t.contentTypeId === contentTypeId);
  }, [allTemplates, contentTypeId]);

  // Selected Template Object
  const selectedTemplate = useMemo(() => {
    return allTemplates.find((t) => t.id === templateId) || null;
  }, [allTemplates, templateId]);

  // 3. Fetch Entries for selected schema
  const { data: entriesData, isLoading: isLoadingEntries } = useQuery<any>({
    queryKey: ['content-entries', orgId, contentTypeId],
    queryFn: async () => {
      if (!contentTypeId) return [];
      const res = await api.get(`/orgs/${orgId}/content/${contentTypeId}`);
      return res.data?.data?.items || res.data?.items || res.data?.data || res.data || [];
    },
    enabled: !!orgId && !!contentTypeId && isOpen,
  });

  const entries: any[] = Array.isArray(entriesData)
    ? entriesData
    : Array.isArray(entriesData?.items)
    ? entriesData.items
    : Array.isArray(entriesData?.data)
    ? entriesData.data
    : [];

  // Selected Entry Object
  const selectedEntry = useMemo(() => {
    return entries.find((e) => e.id === entryId) || null;
  }, [entries, entryId]);

  // Predefined Entry Data
  const entryPayload = useMemo(() => {
    if (!selectedEntry) return null;
    return selectedEntry.publishedData || selectedEntry.data || {};
  }, [selectedEntry]);

  // 4. Fetch available Dynamic Queues
  const { data: queuesData, isLoading: isLoadingQueues } = useQuery<any>({
    queryKey: ['queues', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/queues`);
      return res.data?.data || res.data || [];
    },
    enabled: !!orgId && isOpen,
  });

  const queues: any[] = Array.isArray(queuesData)
    ? queuesData
    : Array.isArray(queuesData?.items)
    ? queuesData.items
    : Array.isArray(queuesData?.data)
    ? queuesData.data
    : [];

  // Parse schema fields and tokens for dynamic alignment
  const schemaFields: any[] = useMemo(() => {
    if (!selectedSchema?.schema) return [];
    const fields = selectedSchema.schema.fields;
    return Array.isArray(fields) ? fields : [];
  }, [selectedSchema]);

  const templateTokens = useMemo(() => {
    if (!selectedTemplate) return [];
    const body = selectedTemplate.bodyPublished || selectedTemplate.bodyDraft || '';
    const subject = selectedTemplate.subjectPublished || selectedTemplate.subjectDraft || '';
    const combined = `${subject} ${body}`;
    const matches = combined.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    return Array.from(new Set(matches.map((m) => m.replace(/[\{\}]/g, ''))));
  }, [selectedTemplate]);

  // Create Scheduler Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/orgs/${orgId}/schedulers`, {
        name,
        description: description || undefined,
        defaultFrom: defaultFrom.trim() || undefined,
        contentTypeId,
        sourceType,
        templateId: sourceType === 'TEMPLATE' ? templateId : undefined,
        entryId: sourceType === 'ENTRY' ? entryId : undefined,
        queueId,
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
    setDefaultFrom('');
    setContentTypeId('');
    setSourceType('TEMPLATE');
    setTemplateId('');
    setEntryId('');
    setQueueId('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contentTypeId || !queueId) return;
    if (sourceType === 'TEMPLATE' && !templateId) return;
    if (sourceType === 'ENTRY' && !entryId) return;
    setError(null);
    createMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Email Scheduler"
      description="Configure a reusable transactional email delivery pipeline tied to a schema, template, and queue."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Pipeline Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Scheduler Pipeline Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Invoice Dispatcher"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Automated order confirmation delivery with itemized breakdown"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target BullMQ Queue <span className="text-rose-500">*</span>
            </label>
            <select
              value={queueId}
              onChange={(e) => setQueueId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">{isLoadingQueues ? 'Loading queues...' : 'Select a dynamic BullMQ queue...'}</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({q.concurrency} concurrent workers)
                </option>
              ))}
            </select>
            {queues.length === 0 && !isLoadingQueues && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                No dynamic queues found. Please create a queue in the Queues tab first.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sender Email Address (SMTP From) <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              value={defaultFrom}
              onChange={(e) => setDefaultFrom(e.target.value)}
              placeholder={
                systemDefaults?.defaultSmtpFrom
                  ? `Default: ${systemDefaults.defaultSmtpFrom}`
                  : 'e.g. Acme Notifications <notifications@acme.com>'
              }
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Sender address for this scheduler. If left blank, defaults to{' '}
              <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-indigo-500">
                SMTP_FROM
              </code>{' '}
              ({systemDefaults?.defaultSmtpFrom || 'configured in .env'}).
            </p>
          </div>
        </div>

        {/* 1. Selection of Schema */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Select Content Schema (Model) <span className="text-rose-500">*</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 ml-7 mb-2">
              Choose the data structure this email scheduler will bind to.
            </p>
            <select
              value={contentTypeId}
              onChange={(e) => {
                setContentTypeId(e.target.value);
                setTemplateId('');
                setEntryId('');
              }}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">
                {isLoadingSchemas ? 'Loading schemas...' : 'Select a Content Model Schema...'}
              </option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Option to select Template or Entry */}
          {contentTypeId && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Select Source Mode <span className="text-rose-500">*</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-7">
                <div
                  onClick={() => setSourceType('TEMPLATE')}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    sourceType === 'TEMPLATE'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <FileCode className={`w-4 h-4 mt-0.5 shrink-0 ${sourceType === 'TEMPLATE' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-semibold">Dynamic Template</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Accepts dynamic input payloads via API or UI and merges them with schema field mappings.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setSourceType('ENTRY')}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    sourceType === 'ENTRY'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Layers className={`w-4 h-4 mt-0.5 shrink-0 ${sourceType === 'ENTRY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-semibold">Predefined Entry</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Dispatches saved, predefined content directly from an existing database entry.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Conditional Options based on selection */}
          {contentTypeId && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3 ml-7">
              {/* Mode 1: Dynamic Template - Template Selection + Alignment */}
              {sourceType === 'TEMPLATE' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Template <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">
                        {isLoadingTemplates ? 'Loading templates...' : 'Select a template for this schema...'}
                      </option>
                      {relevantTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.type})
                        </option>
                      ))}
                    </select>
                    {relevantTemplates.length === 0 && !isLoadingTemplates && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                        No templates found bound to schema "{selectedSchema?.name}". Please create one in Templates Studio.
                      </p>
                    )}
                  </div>

                  {selectedSchema && (
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-indigo-500" />
                          Dynamic Input & Schema Field Alignment
                        </span>
                        <Badge variant="blue" className="text-[10px]">
                          {schemaFields.length} Field{schemaFields.length === 1 ? '' : 's'}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        When dispatching this scheduler, provide dynamic JSON values corresponding to these schema fields:
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                        {schemaFields.map((f: any) => {
                          const isReferencedInTemplate = templateTokens.includes(f.name);
                          return (
                            <div
                              key={f.name}
                              className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-[11px]"
                            >
                              <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                                {f.name}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1 shrink-0">
                                {f.type}
                                {isReferencedInTemplate && ' ✓'}
                              </span>
                            </div>
                          );
                        })}
                        {schemaFields.length === 0 && (
                          <div className="text-[11px] text-slate-400 italic col-span-3">
                            No fields defined in this schema. Dynamic raw payload can still be passed freely.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Predefined Entry Selection & Preview */}
              {sourceType === 'ENTRY' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Predefined Content Entry <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={entryId}
                      onChange={(e) => setEntryId(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">
                        {isLoadingEntries ? 'Loading entries...' : 'Select a content entry to send...'}
                      </option>
                      {entries.map((entry) => {
                        const entryTitle =
                          entry.publishedData?.title ||
                          entry.data?.title ||
                          entry.publishedData?.name ||
                          entry.data?.name ||
                          `Entry #${entry.id.slice(0, 8)}`;
                        return (
                          <option key={entry.id} value={entry.id}>
                            [{entry.status}] {entryTitle}
                          </option>
                        );
                      })}
                    </select>
                    {entries.length === 0 && !isLoadingEntries && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                        No entries found for this model. Please create an entry in the Content Manager first.
                      </p>
                    )}
                  </div>

                  {/* Predefined Entry Data Preview */}
                  {selectedEntry && (
                    <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Predefined Mail Payload Preview
                        </span>
                        <Badge variant="success" className="text-[10px]">
                          {selectedEntry.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                        This saved entry data will automatically be injected and formatted into the template:
                      </p>
                      <pre className="p-2 rounded bg-white dark:bg-slate-950 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-32 border border-emerald-100 dark:border-emerald-900/30">
                        {JSON.stringify(entryPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. Default Recipient Policy Notice (No UI asking for defaultTo/defaultCc) */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <Mail className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
          <div className="text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Automated Default Recipient & Audit Delivery
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Recipients do not need to be configured here. Dispatches will automatically default to the system administrator configured in{' '}
              <code className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                .env
              </code>{' '}
              if no recipient is provided at dispatch time. When a recipient is specified, the system administrator will always receive an audit BCC copy.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending}
            disabled={
              !name.trim() ||
              !contentTypeId ||
              !queueId ||
              (sourceType === 'TEMPLATE' && !templateId) ||
              (sourceType === 'ENTRY' && !entryId) ||
              createMutation.isPending
            }
          >
            Create Scheduler
          </Button>
        </div>
      </form>
    </Modal>
  );
};
