/**
 * Kanban Error Boundary
 *
 * Error boundary for kanban board components with graceful fallback UI.
 * Prevents crashes and provides user-friendly error recovery.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */
import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  /** Custom fallback UI */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Title shown in error state */
  title?: string;
  /** Description shown in error state */
  description?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class KanbanErrorBoundary extends Component<Props, State> {
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Kanban error boundary caught error', error, { errorInfo });

    this.setState({
      error,
      errorInfo,
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

      const title = this.props.title ?? 'Failed to load board';
      const description = this.props.description ??
        'We encountered an error loading the kanban board. Please try again.';

      return (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                  <FolderKanban className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground max-w-sm">{description}</p>
              </div>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="max-h-32 overflow-y-auto rounded bg-destructive/10 p-3 font-mono text-sm text-destructive">
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

            <div className="flex gap-2 justify-center">
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
