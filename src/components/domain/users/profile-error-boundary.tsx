/**
 * Profile Error Boundary
 *
 * Error boundary for profile-related components.
 * Catches errors in profile form, avatar upload, and notification preferences.
 *
 * @lastReviewed 2026-02-10
 */

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface ProfileErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
}

interface ProfileErrorBoundaryState {
  hasError: boolean;
  error: Error | undefined;
  errorInfo: React.ErrorInfo | undefined;
}

export class ProfileErrorBoundary extends Component<
  ProfileErrorBoundaryProps,
  ProfileErrorBoundaryState
> {
  constructor(props: ProfileErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): ProfileErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: undefined,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for monitoring (in production, send to error reporting service)
    logger.error("Profile error boundary caught error", error, { errorInfo });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.title ?? "Profile Error";
      const description =
        this.props.description ??
        "We encountered an error loading your profile. Please try again.";

      return (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{description}</p>

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

            <div className="flex gap-2">
              <Button onClick={this.handleRetry} variant="outline">
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
