import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface InventoryDashboardReadWarningProps {
  title: string;
  message: string;
}

export function InventoryDashboardReadWarning({
  title,
  message,
}: InventoryDashboardReadWarningProps) {
  return (
    <Alert className="border-amber-500/30 bg-amber-500/5 text-foreground">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
