import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'danger-outline'
  | 'success';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950/20 active:bg-indigo-700',
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950/20 active:bg-indigo-700',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:bg-slate-900',
  outline: 'border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white active:bg-slate-900',
  ghost: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 active:bg-slate-800',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-950/20 active:bg-rose-700',
  'danger-outline': 'border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:bg-emerald-700',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs gap-1 rounded',
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-md font-medium',
  md: 'px-3.5 py-2 text-sm gap-2 rounded-lg font-medium',
  lg: 'px-5 py-2.5 text-base gap-2.5 rounded-lg font-medium',
  icon: 'p-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
