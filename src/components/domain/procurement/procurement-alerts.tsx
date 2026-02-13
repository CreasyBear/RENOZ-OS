/**
 * Procurement Alerts Component
 *
 * Displays procurement-related alerts and notifications.
 * Includes low stock warnings, approval escalations, and supplier issues.
 *
 * @see SUPP-PROCUREMENT-DASHBOARD story
 */

import { Link } from '@tanstack/react-router';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Clock,
  Package,
  Building2,
  FileText,
  Bell,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  AlertSeverity,
  AlertType,
  ProcurementAlert,
} from '@/lib/schemas/procurement';
import { isValidAlertType } from '@/lib/schemas/procurement';

// ============================================================================
// TYPES
// ============================================================================

interface ProcurementAlertsProps {
  alerts: ProcurementAlert[];
  isLoading?: boolean;
  onDismiss?: (id: string) => void;
  maxVisible?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

const severityConfig: Record<
  AlertSeverity,
  {
    icon: typeof AlertCircle;
    variant: 'default' | 'destructive';
    className: string;
  }
> = {
  info: {
    icon: Info,
    variant: 'default',
    className:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300',
  },
  warning: {
    icon: AlertTriangle,
    variant: 'default',
    className:
      'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-300',
  },
  error: {
    icon: AlertCircle,
    variant: 'destructive',
    className: '',
  },
};

const typeIcons: Record<AlertType, typeof Package> = {
  low_stock: Package,
  approval_overdue: Clock,
  delivery_delayed: Clock,
  supplier_issue: Building2,
  price_expiring: FileText,
  budget_warning: AlertTriangle,
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border p-4">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Bell className="text-muted-foreground mb-3 h-10 w-10" />
      <p className="font-medium">No Active Alerts</p>
      <p className="text-muted-foreground text-sm">
        You&apos;re all caught up! No procurement issues to address.
      </p>
    </div>
  );
}

// ============================================================================
// SINGLE ALERT ITEM
// ============================================================================

interface AlertItemProps {
  alert: ProcurementAlert;
  onDismiss?: (id: string) => void;
}

function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const config = severityConfig[alert.severity];
  const TypeIcon = typeIcons[alert.type] || AlertCircle;

  return (
    <Alert variant={config.variant} className={`relative ${config.className}`}>
      <TypeIcon className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{alert.title}</span>
        <span className="text-muted-foreground text-xs font-normal">
          {formatTimeAgo(alert.createdAt)}
        </span>
      </AlertTitle>
      <AlertDescription className="mt-1">
        <p>{alert.message}</p>
        {alert.linkTo && (
          <Link
            to={alert.linkTo}
            params={alert.linkParams}
            className="mt-2 inline-block text-sm font-medium underline"
          >
            {alert.linkLabel || 'View Details'}
          </Link>
        )}
      </AlertDescription>
      {alert.dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => onDismiss(alert.id)}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Dismiss</span>
        </Button>
      )}
    </Alert>
  );
}

// ============================================================================
// COMPACT ALERTS LIST
// ============================================================================

interface CompactAlertsListProps {
  alerts: ProcurementAlert[];
  onDismiss?: (id: string) => void;
}

// Type guards imported from schema

function CompactAlertsList({ alerts, onDismiss: _onDismiss }: CompactAlertsListProps) {
  // onDismiss available for future use when dismiss buttons added to compact view
  void _onDismiss;
  const groupedByType = alerts.reduce<Partial<Record<AlertType, ProcurementAlert[]>>>(
    (acc, alert) => {
      if (!acc[alert.type]) {
        acc[alert.type] = [];
      }
      acc[alert.type]!.push(alert);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-2">
      {Object.entries(groupedByType).map(([type, typeAlerts]) => {
        if (!isValidAlertType(type) || !typeAlerts) return null;
        const TypeIcon = typeIcons[type];
        const severityOrder: Record<AlertSeverity, number> = { error: 3, warning: 2, info: 1 };
        const highestSeverity = typeAlerts.reduce<AlertSeverity>(
          (max, a) => (severityOrder[a.severity] > severityOrder[max] ? a.severity : max),
          'info'
        );

        return (
          <div key={type} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <TypeIcon className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium capitalize">{type.replace(/_/g, ' ')}</p>
                <p className="text-muted-foreground text-xs">
                  {typeAlerts.length} alert{typeAlerts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Badge
              variant={
                highestSeverity === 'error'
                  ? 'destructive'
                  : highestSeverity === 'warning'
                    ? 'default'
                    : 'secondary'
              }
            >
              {typeAlerts.length}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProcurementAlerts({
  alerts,
  isLoading = false,
  onDismiss,
  maxVisible = 5,
}: ProcurementAlertsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Procurement Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertsSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Procurement Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  // Sort by severity (error first) then by date (newest first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const visibleAlerts = sortedAlerts.slice(0, maxVisible);
  const hasMore = sortedAlerts.length > maxVisible;

  // Count by severity
  const errorCount = alerts.filter((a) => a.severity === 'error').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => a.severity === 'info').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Procurement Alerts
        </CardTitle>
        <div className="flex items-center gap-2">
          {errorCount > 0 && <Badge variant="destructive">{errorCount} critical</Badge>}
          {warningCount > 0 && <Badge variant="default">{warningCount} warning</Badge>}
          {infoCount > 0 && <Badge variant="secondary">{infoCount} info</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
          ))}
          {hasMore && (
            <p className="text-muted-foreground text-center text-sm">
              +{sortedAlerts.length - maxVisible} more alerts
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { ProcurementAlerts, AlertItem, CompactAlertsList };
export type { ProcurementAlertsProps };
