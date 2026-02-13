/**
 * PO Alerts Component (Zone 3)
 *
 * Displays actionable alerts for a purchase order:
 * - Required date overdue
 * - Required date urgent (within 7 days)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 3: Alerts)
 */

import { Clock, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

import type { POAlert } from '@/lib/schemas/purchase-orders';

export interface POAlertsProps {
  alerts: POAlert[];
  onDismiss?: (alertId: string) => void;
  className?: string;
  maxVisible?: number;
}

// ============================================================================
// STYLES
// ============================================================================

const severityClasses: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/10 text-destructive [&>svg]:text-destructive',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-500',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function POAlerts({
  alerts,
  onDismiss,
  className,
  maxVisible = 3,
}: POAlertsProps) {
  if (!alerts?.length) return null;

  const visible = alerts.slice(0, maxVisible);

  return (
    <div className={cn('space-y-2', className)}>
      {visible.map((alert) => (
        <Alert
          key={alert.id}
          className={cn(
            'flex items-start gap-3 pr-10 relative',
            severityClasses[alert.severity]
          )}
          variant="default"
        >
          <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <AlertTitle className="font-medium">{alert.title}</AlertTitle>
            <AlertDescription className="text-sm mt-0.5">
              {alert.description}
            </AlertDescription>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-50 hover:opacity-100"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </Alert>
      ))}
    </div>
  );
}
