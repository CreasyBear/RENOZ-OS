/**
 * FulfillmentErrorBoundary Component
 *
 * Error boundary specifically for fulfillment kanban operations.
 * Provides recovery options and detailed error reporting for SOTA SaaS experience.
 *
 * @see src/components/domain/jobs/kanban-error-boundary.tsx for reference implementation
 */

import { Component } from 'react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home, Package } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Called when user clicks "Back to Orders" — use navigate({ to: '/orders' }) per WORKFLOW-CONTINUITY §8 */
  onGoToOrders?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class FulfillmentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with structured logging
    logger.error('Fulfillment kanban error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      domain: 'fulfillment-kanban',
    });

    this.setState({
      error,
      errorInfo,
    });

    // Send to error monitoring service (Sentry) if available
    const win = typeof window !== 'undefined' ? window : null;
    const Sentry = win && 'Sentry' in win ? (win as Window & { Sentry: { captureException: (err: Error, opts?: object) => void } }).Sentry : null;
    if (Sentry) {
      Sentry.captureException(error, {
        tags: {
          component: 'fulfillment-error-boundary',
          domain: 'fulfillment-kanban',
        },
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    if (this.props.onGoToOrders) {
      this.props.onGoToOrders();
    } else {
      window.location.href = '/orders';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <Alert variant="destructive" className="max-w-md">
            <Package className="h-4 w-4" />
            <AlertTitle>Fulfillment Board Error</AlertTitle>
            <AlertDescription className="mt-2 space-y-4">
              <p>
                Something went wrong with the fulfillment kanban. This has been reported to our
                team.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error Details (Development)
                  </summary>
                  <pre className="bg-muted mt-2 max-h-32 overflow-auto rounded p-2 text-xs">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="mt-4 flex gap-2">
                <Button onClick={this.handleRetry} size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  Back to Orders
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
