/**
 * Order Alerts Component (Zone 3)
 *
 * Displays actionable alerts for an order including:
 * - Payment overdue
 * - Due date overdue/urgent
 * - Xero sync errors
 * - Partial fulfillment
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 3: Alerts)
 */

import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  CreditCard,
  Clock,
  RefreshCcw,
  Package,
  X,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrderAlert } from '@/hooks/orders/use-order-detail-composite';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderAlertsProps {
  alerts: OrderAlert[];
  onDismiss?: (alertId: string) => void;
  className?: string;
  /** Maximum alerts to show before collapsing */
  maxVisible?: number;
}

// ============================================================================
// ICONS
// ============================================================================

const alertTypeIcons: Record<string, React.ReactNode> = {
  payment_overdue: <CreditCard className="h-4 w-4" />,
  due_date_overdue: <Clock className="h-4 w-4" />,
  due_date_urgent: <Clock className="h-4 w-4" />,
  xero_sync_error: <RefreshCcw className="h-4 w-4" />,
  partial_fulfillment: <Package className="h-4 w-4" />,
};

const severityIcons: Record<string, React.ReactNode> = {
  critical: <AlertTriangle className="h-4 w-4" />,
  warning: <AlertCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

// Hardcoded classes - Tailwind doesn't process dynamic template literals
const severityClasses: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/10 text-destructive [&>svg]:text-destructive',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-500',
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 [&>svg]:text-blue-500',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrderAlerts({
  alerts,
  onDismiss,
  className,
  maxVisible = 3,
}: OrderAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Sort by severity: critical first, then warning, then info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const visibleAlerts = sortedAlerts.slice(0, maxVisible);
  const hiddenCount = sortedAlerts.length - maxVisible;

  return (
    <div className={cn('space-y-2', className)}>
      {visibleAlerts.map((alert) => (
        <Alert
          key={alert.id}
          className={cn(
            'flex items-start gap-3 pr-10 relative',
            severityClasses[alert.severity]
          )}
        >
          <span className="flex-shrink-0 mt-0.5">
            {alertTypeIcons[alert.type] || severityIcons[alert.severity]}
          </span>
          <div className="flex-1 min-w-0">
            <AlertTitle className="font-medium">{alert.title}</AlertTitle>
            <AlertDescription className="text-sm mt-0.5">
              {alert.message}
            </AlertDescription>
          </div>
          {alert.action && (
            <Link
              to={alert.action.href as '/orders'}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'flex-shrink-0 gap-1 -mr-2'
              )}
            >
              {alert.action.label}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
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
      {hiddenCount > 0 && (
        <p className="text-sm text-muted-foreground text-center py-1">
          +{hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

export function OrderAlertsSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-16 rounded-lg bg-muted animate-pulse" />
    </div>
  );
}
