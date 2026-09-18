import React from 'react';
import { Modal } from '../../../components/ui/modal';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

interface EmailDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  email: any;
}

export const EmailDetailsDrawer: React.FC<EmailDetailsDrawerProps> = ({
  isOpen,
  onClose,
  email,
}) => {
  if (!email) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scheduled Email Execution Details"
      description={`Tracking Job ID: ${email.bullJobId || email.id}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
        {/* Status Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Lifecycle Status
            </span>
            <div className="flex items-center gap-2">
              {email.status === 'COMPLETED' ? (
                <Badge variant="success" className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  COMPLETED
                </Badge>
              ) : email.status === 'SCHEDULED' ? (
                <Badge variant="blue" className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  SCHEDULED (DELAYED)
                </Badge>
              ) : email.status === 'PROCESSING' ? (
                <Badge variant="warning" className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  PROCESSING
                </Badge>
              ) : email.status === 'CANCELLED' ? (
                <Badge variant="default" className="inline-flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  CANCELLED
                </Badge>
              ) : (
                <Badge variant="danger" className="inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  FAILED
                </Badge>
              )}
              <span className="text-slate-500 font-medium">Attempts: {email.attempts}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Scheduled For
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {new Date(email.scheduledFor).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Error Alert if Failed */}
        {email.errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
            <span className="font-semibold block mb-0.5">Failure Diagnostic:</span>
            <pre className="font-mono text-[11px] whitespace-pre-wrap">{email.errorMessage}</pre>
          </div>
        )}

        {/* Recipient & Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sender (From)</span>
            <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 truncate block">
              {email.from || '(Default: SMTP_FROM env)'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient (To)</span>
            <span className="font-mono font-medium">{email.to}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Carbon Copy (Cc)</span>
            <span className="font-mono text-slate-500">{email.cc || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Scheduler</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {email.scheduler?.name || '—'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Queue</span>
            <span className="font-mono text-slate-500">{email.queue?.name || '—'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Resolved Subject</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {email.subject || '(Pending template resolution)'}
            </span>
          </div>
        </div>

        {/* Data Payload Viewer */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Merged Runtime Data Payload (JSON)
          </span>
          <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
            {JSON.stringify(email.data, null, 2)}
          </pre>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
