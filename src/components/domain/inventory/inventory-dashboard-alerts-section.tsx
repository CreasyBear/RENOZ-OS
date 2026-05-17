import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DashboardAlert {
  id: string;
  alertType: string;
  severity: 'critical' | 'warning' | 'info';
  productName?: string;
  locationName?: string;
  message: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
  isFallback?: boolean;
}

interface InventoryDashboardAlertsSectionProps {
  alerts: DashboardAlert[];
  onAcknowledge: (id: string) => void;
}

const severityStyles: Record<DashboardAlert['severity'], string> = {
  critical: 'border-destructive/50 bg-destructive/10 text-destructive',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

const alertTypeLabels: Record<string, string> = {
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  overstock: 'Overstock',
  expiry: 'Expiring Soon',
  slow_moving: 'Slow Moving',
};

export function InventoryDashboardAlertsSection({
  alerts,
  onAcknowledge,
}: InventoryDashboardAlertsSectionProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert.id)).slice(0, 3);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} className={cn('relative pr-10', severityStyles[alert.severity])}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-medium">
            {alertTypeLabels[alert.alertType] ?? alert.alertType}
            {alert.productName && `: ${alert.productName}`}
          </AlertTitle>
          <AlertDescription className="text-sm mt-0.5">{alert.message}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-50 hover:opacity-100"
            aria-label={
              alert.isFallback
                ? `Dismiss read-only alert: ${alert.message}`
                : `Acknowledge alert: ${alert.message}`
            }
            onClick={() => {
              setDismissed((previous) => new Set([...previous, alert.id]));
              if (!alert.isFallback) {
                onAcknowledge(alert.id);
              }
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      ))}
      {alerts.length > 3 && (
        <Link
          to="/inventory/alerts"
          className="block text-sm text-muted-foreground text-center hover:text-foreground"
        >
          View all {alerts.length} alerts
          <ChevronRight className="inline h-3 w-3 ml-1" />
        </Link>
      )}
    </div>
  );
}
