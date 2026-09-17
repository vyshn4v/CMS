import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  title?: string;
  onDismiss?: () => void;
}

const typeStyles: Record<AlertType, { wrapper: string; icon: React.ReactNode; text: string }> = {
  info: {
    wrapper: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
    icon: <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />,
    text: 'text-sky-200',
  },
  success: {
    wrapper: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
    text: 'text-emerald-200',
  },
  warning: {
    wrapper: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
    text: 'text-amber-200',
  },
  error: {
    wrapper: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
    text: 'text-rose-200',
  },
};

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className,
  onDismiss,
  ...props
}) => {
  const current = typeStyles[type];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-xl border text-xs leading-relaxed transition-all',
        current.wrapper,
        className,
      )}
      {...props}
    >
      {current.icon}
      <div className="flex-1">
        {title && <h4 className="font-semibold text-white mb-0.5">{title}</h4>}
        <div className={current.text}>{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors p-0.5 -mr-1 -mt-1 rounded"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
