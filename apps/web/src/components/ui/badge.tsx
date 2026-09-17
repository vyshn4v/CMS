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

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-800 text-slate-300 border-slate-700',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  blue: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  outline: 'bg-transparent text-slate-300 border-slate-700',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  purple: 'bg-purple-400',
  blue: 'bg-sky-400',
  outline: 'bg-slate-400',
};

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
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
