/**
 * SupplierErrorBoundary Component
 *
 * Error boundary for supplier-related components with graceful fallback UI.
 * Prevents crashes and provides user-friendly error recovery.
 */
import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logError, userAnalytics } from '@/lib/monitoring';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class SupplierErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with monitoring system
    logError('Supplier component error caught by error boundary', error, {
      component: 'SupplierErrorBoundary',
      metadata: {
        errorInfo,
        hasError: true,
      },
    });

    this.setState({
      error,
      errorInfo,
    });

    // Track error event for analytics
    userAnalytics.trackError(error, {
      component: 'SupplierErrorBoundary',
      metadata: {
        errorBoundary: true,
      },
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Supplier System Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We encountered an error loading supplier data. This has been reported to our team.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="max-h-32 overflow-y-auto rounded bg-red-50 p-3 font-mono text-sm text-red-800">
                <strong>Error:</strong> {this.state.error.message}
                {this.state.errorInfo && (
                  <div className="mt-2">
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 text-xs whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useSupplierErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    logger.error('Supplier error handled', error, { errorInfo });
    // Could integrate with error reporting service
  };
}
