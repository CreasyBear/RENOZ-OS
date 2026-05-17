import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InventoryDashboardUnavailableStateProps {
  message: string;
  onRetry: () => void;
}

export function InventoryDashboardUnavailableState({
  message,
  onRetry,
}: InventoryDashboardUnavailableStateProps) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
      <p className="font-medium">Failed to load inventory data</p>
      <p className="text-sm mt-1">Please try again or contact support if the problem persists.</p>
      <p className="text-xs mt-2 text-muted-foreground/80 font-mono max-w-md mx-auto truncate">
        {message}
      </p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}
