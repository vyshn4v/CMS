import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Clock, Calendar } from 'lucide-react';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
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
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [scheduleType, setScheduleType] = useState<'immediate' | 'delayed'>('immediate');
  const [scheduledFor, setScheduledFor] = useState('');
  const [payloadJson, setPayloadJson] = useState('{\n  "name": "Alex",\n  "amount": 99.00\n}');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scheduler) {
      setTo(scheduler.defaultTo || '');
      setCc(scheduler.defaultCc || '');
    }
  }, [scheduler]);

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
        to,
        cc: cc || undefined,
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
    setTo('');
    setCc('');
    setScheduleType('immediate');
    setScheduledFor('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) return;
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Email (To) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Carbon Copy (Cc)
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
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Dynamic Data Payload (JSON)
          </label>
          <textarea
            value={payloadJson}
            onChange={(e) => setPayloadJson(e.target.value)}
            rows={5}
            className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="{ ... }"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!to.trim() || dispatchMutation.isPending}>
            {dispatchMutation.isPending ? 'Enqueuing...' : scheduleType === 'immediate' ? 'Send Now' : 'Schedule Email'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
