import React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30',
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3.5 shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-white">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
