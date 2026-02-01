/**
 * RouteErrorFallback Component
 *
 * Reusable error fallback for TanStack Router's errorComponent.
 * Used at the route level to catch and display errors gracefully.
 *
 * Security: Does NOT expose stack traces in production.
 */
import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertCircle, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RouteErrorFallbackProps {
  error: Error;
  parentRoute?: string;
  onRetry?: () => void;
}

export function RouteErrorFallback({
  error,
  parentRoute = '/',
  onRetry,
}: RouteErrorFallbackProps) {
  // Log error - in production, send to monitoring service
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry or similar
      console.error('[Route Error]', error.message);
    } else {
      console.error('[Route Error]', error);
    }
  }, [error]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="w-full max-w-md border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We encountered an error loading this page. Please try again or navigate back.
          </p>

          {/* Only show error details in development */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="rounded bg-destructive/10 p-3 font-mono text-xs text-destructive">
              {error.message}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Link
              to={parentRoute}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Link>
            <Link
              to="/"
              className={cn(buttonVariants({ variant: 'ghost' }))}
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
