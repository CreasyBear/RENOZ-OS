/**
 * JobsErrorBoundary Component
 *
 * Comprehensive error boundary for all job-related operations.
 * Provides recovery options, detailed error reporting, and graceful degradation.
 */

import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  component?: string; // e.g., "JobCalendar", "JobKanban", "JobDetails"
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

export class JobsErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Jobs Error Boundary (${this.props.component || 'Unknown'}):`, error, errorInfo);

    // Log to error reporting service (in production)
    // TODO: Integrate with Sentry, LogRocket, or similar

    this.setState({
      error,
      errorInfo,
    });

    // Show user-friendly toast notification
    toast.error(`Something went wrong with ${this.props.component || 'Jobs'}`, {
      description: "We've logged this error and are working to fix it.",
      action: {
        label: 'Report Issue',
        onClick: () => this.handleReportIssue(),
      },
    });
  }

  handleRetry = () => {
    const { retryCount } = this.state;

    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: retryCount + 1,
      });

      toast.success('Retrying...', {
        description: `Attempt ${retryCount + 1} of ${this.maxRetries}`,
      });
    } else {
      toast.error('Max retries exceeded', {
        description: 'Please refresh the page or contact support.',
      });
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Navigate to jobs overview
    window.location.href = '/jobs';
  };

  handleReportIssue = () => {
    const { error, errorInfo } = this.state;
    const component = this.props.component || 'Unknown';

    // Create a detailed issue report
    const report = {
      component,
      error: error?.message,
      stack: error?.stack,
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      toast.success('Error details copied to clipboard', {
        description: 'Please include this when reporting the issue.',
      });
    });

    // In production, you might send this to your error reporting service
    console.log('Error Report:', report);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const component = this.props.component || 'Jobs Component';
      const canRetry = retryCount < this.maxRetries;

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-red-900">
                {component} Error
              </CardTitle>
              <CardDescription className="text-base">
                Something went wrong while loading {component.toLowerCase()}. This error has been
                logged and we're working to fix it.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Details */}
              {this.props.showDetails && error && (
                <Alert variant="destructive">
                  <Bug className="h-4 w-4" />
                  <AlertTitle>Technical Details</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="max-h-32 overflow-auto rounded border bg-red-50 p-3 font-mono text-sm">
                      {error.message}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="default">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({retryCount}/{this.maxRetries})
                  </Button>
                )}

                <Button onClick={this.handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>

                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Jobs
                </Button>

                <Button onClick={this.handleReportIssue} variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Report Issue
                </Button>
              </div>

              {/* Recovery Suggestions */}
              <div className="text-muted-foreground space-y-2 text-sm">
                <p>
                  <strong>If this persists, try:</strong>
                </p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Refreshing the page</li>
                  <li>Clearing your browser cache</li>
                  <li>Checking your internet connection</li>
                  <li>Contacting support with the error details</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// HOOK FOR ERROR REPORTING
// ============================================================================

/**
 * Hook for manual error reporting in job components
 */
export function useJobErrorReporting(component: string) {
  const reportError = React.useCallback(
    (error: Error, context?: Record<string, any>) => {
      console.error(`Manual error report from ${component}:`, error, context);

      // Log to error reporting service
      // TODO: Send to Sentry, LogRocket, etc.

      toast.error(`Error in ${component}`, {
        description: error.message,
        action: {
          label: 'Report',
          onClick: () => {
            const report = {
              component,
              error: error.message,
              stack: error.stack,
              context,
              timestamp: new Date().toISOString(),
            };

            navigator.clipboard.writeText(JSON.stringify(report, null, 2));
            toast.success('Error details copied');
          },
        },
      });
    },
    [component]
  );

  return { reportError };
}
