import React from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface FulfillmentErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<FallbackProps>;
}

const FulfillmentErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => (
  <Alert variant="destructive" className="m-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Fulfillment System Error</AlertTitle>
    <AlertDescription className="mt-2">
      <div className="space-y-2">
        <p>There was an error loading the fulfillment dashboard.</p>
        <details className="text-xs">
          <summary className="cursor-pointer">Error details</summary>
          <pre className="mt-2 whitespace-pre-wrap">{error instanceof Error ? error.message : String(error)}</pre>
        </details>
        <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
          Try Again
        </Button>
      </div>
    </AlertDescription>
  </Alert>
);

export const FulfillmentErrorBoundary: React.FC<FulfillmentErrorBoundaryProps> = ({
  children,
  fallback: Fallback = FulfillmentErrorFallback,
}) => {
  return <ErrorBoundary FallbackComponent={Fallback}>{children}</ErrorBoundary>;
};
