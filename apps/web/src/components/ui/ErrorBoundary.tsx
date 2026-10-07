import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  fullscreen?: boolean;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error || new Error('Unknown error'), this.reset);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || '';
      const isChunkError =
        errorMessage.includes('dynamically imported module') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('Importing a module script failed');

      return (
        <div
          role="alert"
          className={
            this.props.fullscreen
              ? 'fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950'
              : 'w-full h-full min-h-[380px] flex items-center justify-center p-6'
          }
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isChunkError ? 'Unable to load page resource' : 'Something went wrong'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {isChunkError
                  ? 'A new update or network interruption prevented this section from loading. Reloading the page will fetch the latest version.'
                  : 'An unexpected application error occurred while rendering this page.'}
              </p>
            </div>

            {errorMessage && (
              <div className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 truncate text-left">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReload}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reload Page
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={this.reset}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
