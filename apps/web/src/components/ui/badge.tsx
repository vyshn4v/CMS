import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'blue'
  | 'outline';

export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  warning:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  danger:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  purple:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
  blue:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  outline:
    'bg-transparent text-slate-600 border-slate-300 dark:text-slate-400 dark:border-slate-700',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-400 dark:bg-slate-500',
  success: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  danger: 'bg-rose-500 dark:bg-rose-400',
  purple: 'bg-indigo-500 dark:bg-indigo-400',
  blue: 'bg-blue-500 dark:bg-blue-400',
  outline: 'bg-slate-400 dark:bg-slate-500',
};

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'sm',
  dot = false,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full shrink-0 select-none leading-none [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0',
        size === 'xs' && 'px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wide',
        size === 'sm' && 'px-2.5 py-1 text-xs font-medium',
        size === 'md' && 'px-3 py-1.5 text-xs font-semibold',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      {children}
    </span>
  );
};
