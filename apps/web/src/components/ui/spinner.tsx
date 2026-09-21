import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, label }) => {
  return (
    <div className="inline-flex items-center gap-2">
      <Loader2 className={cn('animate-spin text-indigo-500', sizeStyles[size], className)} />
      {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
    </div>
  );
};
