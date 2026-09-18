import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Clock, Calendar, Layers, FileCode, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { api } from '../../../lib/api';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  scheduler: any;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  orgId,
  scheduler,
}) => {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [scheduleType, setScheduleType] = useState<'immediate' | 'delayed'>('immediate');
  const [scheduledFor, setScheduledFor] = useState('');
  const [payloadJson, setPayloadJson] = useState('{\n  "name": "Alex",\n  "amount": 99.00\n}');
  const [error, setError] = useState<string | null>(null);

  // Fetch System Defaults (SMTP_FROM and admin recipient)
  const { data: systemDefaults } = useQuery<{
    defaultSmtpFrom: string;
    defaultSenderName: string;
    defaultSenderEmail: string;
    defaultRecipient: string;
  }>({
    queryKey: ['scheduler-system-defaults', orgId],
    queryFn: async () => {
      const res = await api.get(`/orgs/${orgId}/schedulers/system-defaults`);
      return res.data?.data || res.data;
    },
    enabled: !!orgId && isOpen,
  });

  const isEntryMode = scheduler?.sourceType === 'ENTRY';

  useEffect(() => {
    if (scheduler) {
      setFrom(scheduler.defaultFrom || '');
      setTo(scheduler.defaultTo || '');
      setCc(scheduler.defaultCc || '');
      if (scheduler.sourceType === 'ENTRY' && scheduler.entry) {
        const entryData = scheduler.entry.publishedData || scheduler.entry.data || {};
        setPayloadJson(JSON.stringify(entryData, null, 2));
      } else {
        setPayloadJson('{\n  "name": "Alex",\n  "amount": 99.00\n}');
      }
    }
  }, [scheduler]);

  const previewSenderAddress = useMemo(() => {
    const raw = from.trim() || scheduler?.defaultFrom?.trim() || '';
    const defaultEmail = systemDefaults?.defaultSenderEmail || 'system.vyshnavpc@gmail.com';
    const defaultFull = systemDefaults?.defaultSmtpFrom || `CMS Notifications <${defaultEmail}>`;

    if (!raw) return defaultFull;
    if (raw.includes('<') && raw.includes('>')) return raw;
    if (raw.includes('@')) {
      const defName = systemDefaults?.defaultSenderName || 'CMS Notifications';
      return `${defName} <${raw}>`;
    }
    return `${raw} <${defaultEmail}>`;
  }, [from, scheduler, systemDefaults]);

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      let parsedData: any = {};
      if (payloadJson.trim()) {
        try {
          parsedData = JSON.parse(payloadJson);
        } catch {
          throw new Error('Invalid JSON payload syntax');
        }
      }

      let dateIso: string | undefined = undefined;
      if (scheduleType === 'delayed' && scheduledFor) {
        dateIso = new Date(scheduledFor).toISOString();
      }

      const res = await api.post(`/orgs/${orgId}/schedulers/${scheduler.id}/dispatch`, {
        from: from.trim() || undefined,
        to: to.trim() || undefined,
        cc: cc.trim() || undefined,
        scheduledFor: dateIso,
        data: parsedData,
      });

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails', orgId] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err.message || err.response?.data?.message || 'Dispatch failed');
    },
  });

  const handleClose = () => {
    setFrom('');
    setTo('');
    setCc('');
    setScheduleType('immediate');
    setScheduledFor('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    dispatchMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Dispatch Email — ${scheduler?.name || 'Scheduler'}`}
      description="Queue an immediate or delayed email delivery using this scheduler pipeline."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        {/* Pipeline Info Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {isEntryMode ? (
              <Badge variant="blue" className="inline-flex items-center gap-1 font-semibold">
                <Layers className="w-3 h-3" />
                Predefined Entry Mail
              </Badge>
            ) : (
              <Badge variant="default" className="inline-flex items-center gap-1 font-semibold">
                <FileCode className="w-3 h-3" />
                Dynamic Template Mail
              </Badge>
            )}
            <span className="text-slate-500 truncate max-w-xs">
              {scheduler?.contentType?.name ? `Model: ${scheduler.contentType.name}` : ''}
              {scheduler?.template?.name ? ` · Template: ${scheduler.template.name}` : ''}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Queue: {scheduler?.queue?.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sender Name / Display Name (From) <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={
                scheduler?.defaultFrom ||
                systemDefaults?.defaultSenderName ||
                'e.g. "CMS Notifications" or custom sender'
              }
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              If left blank, defaults to scheduler configuration {scheduler?.defaultFrom ? `("${scheduler.defaultFrom}")` : ''} or <code className="font-mono text-[10px]">SMTP_FROM</code>.
            </span>
            <div className="mt-1.5 p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Recipients will see:</span>
              <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                {previewSenderAddress}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Email (To) <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Leave empty to send to default .env user"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              If left blank, sends strictly to the system administrator configured in <code className="font-mono text-[10px]">.env</code>.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Carbon Copy (Cc) <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="optional-cc@example.com"
            />
          </div>
        </div>

        {/* Schedule Timing Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Execution Timing
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                scheduleType === 'immediate'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="scheduleType"
                checked={scheduleType === 'immediate'}
                onChange={() => setScheduleType('immediate')}
                className="hidden"
              />
              <Send className="h-4 w-4 shrink-0" />
              <div className="text-xs leading-none">
                <div>Send Immediately</div>
                <div className="text-[10px] text-slate-400 font-normal mt-1">Delay: 0ms</div>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                scheduleType === 'delayed'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="scheduleType"
                checked={scheduleType === 'delayed'}
                onChange={() => setScheduleType('delayed')}
                className="hidden"
              />
              <Clock className="h-4 w-4 shrink-0" />
              <div className="text-xs leading-none">
                <div>Schedule for Later</div>
                <div className="text-[10px] text-slate-400 font-normal mt-1">BullMQ Delayed Queue</div>
              </div>
            </label>
          </div>

          {scheduleType === 'delayed' && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dispatch Date & Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  required={scheduleType === 'delayed'}
                  className="pl-9"
                />
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Runtime Data Payload */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isEntryMode ? 'Predefined Entry Data Payload (JSON)' : 'Dynamic Data Payload (JSON)'}
            </label>
            {isEntryMode && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Loaded from saved entry
              </span>
            )}
          </div>
          <textarea
            value={payloadJson}
            onChange={(e) => setPayloadJson(e.target.value)}
            rows={5}
            className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="{ ... }"
          />
          {isEntryMode ? (
            <p className="text-[11px] text-slate-500 mt-1">
              This data is automatically loaded from the linked predefined entry. You can keep it as-is or adjust values before sending.
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">
              Provide dynamic JSON keys corresponding to the model schema and template variables.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={dispatchMutation.isPending}
            disabled={dispatchMutation.isPending}
          >
            {dispatchMutation.isPending ? 'Enqueuing...' : scheduleType === 'immediate' ? 'Send Now' : 'Schedule Email'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
