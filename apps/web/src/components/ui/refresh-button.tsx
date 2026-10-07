import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, ButtonSize, ButtonVariant } from './button';
import { cn } from '../../lib/utils';

export interface RefreshButtonProps {
  onRefresh: () => void | Promise<any>;
  isRefreshing?: boolean;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  label?: string;
  showLabel?: boolean;
}

/**
 * Reusable RefreshButton
 * Reuses the existing Button component to provide consistent refresh capability
 * across all tables and data views.
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isRefreshing = false,
  className,
  size = 'sm',
  variant = 'secondary',
  label = 'Refresh',
  showLabel = true,
}) => {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={isRefreshing}
      onClick={() => onRefresh()}
      leftIcon={
        <RefreshCw
          className={cn('h-3.5 w-3.5 text-slate-500 dark:text-slate-400', isRefreshing && 'animate-spin text-indigo-600 dark:text-indigo-400')}
        />
      }
      className={className}
      title={label}
    >
      {showLabel && size !== 'icon' ? label : null}
    </Button>
  );
};
