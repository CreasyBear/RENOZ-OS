/**
 * Opportunity Alerts Component (Zone 3)
 *
 * Displays actionable alerts for opportunity detail view.
 * Alerts are dismissible with 24-hour persistence via useAlertDismissals.
 *
 * Alert Types:
 * - expired_quote: Quote has passed expiration date
 * - expiring_quote: Quote expiring within warning threshold
 * - overdue_followup: Scheduled follow-up is overdue
 * - stale_deal: No activity logged in threshold period
 * - approaching_close: Expected close date is soon
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 3: Alerts)
 */

import React, { memo } from 'react';
import { X, AlertCircle, AlertTriangle, Info, Clock, FileText, Calendar, Activity } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAlertDismissals } from '@/hooks/_shared/use-alert-dismissals';
import type { OpportunityAlert, OpportunityAlertSeverity } from '@/lib/schemas/pipeline/opportunity-detail-extended';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityAlertsProps {
  /** Alerts from useOpportunityAlerts hook */
  alerts: OpportunityAlert[];
  /** Handler for alert actions */
  onAction?: (actionType: string, alertId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getSeverityStyles(severity: OpportunityAlertSeverity) {
  switch (severity) {
    case 'critical':
      return {
        variant: 'destructive' as const,
        icon: AlertCircle,
        containerClass: 'border-destructive/50 bg-destructive/5',
      };
    case 'warning':
      return {
        variant: 'default' as const,
        icon: AlertTriangle,
        containerClass: 'border-amber-500/50 bg-amber-500/5 [&>svg]:text-amber-500',
      };
    case 'info':
    default:
      return {
        variant: 'default' as const,
        icon: Info,
        containerClass: 'border-blue-500/50 bg-blue-500/5 [&>svg]:text-blue-500',
      };
  }
}

const ALERT_TYPE_ICONS: Record<string, React.ElementType> = {
  expired_quote: FileText,
  expiring_quote: FileText,
  overdue_followup: Clock,
  stale_deal: Activity,
  approaching_close: Calendar,
};

// ============================================================================
// INDIVIDUAL ALERT COMPONENT
// ============================================================================

interface AlertItemProps {
  alert: OpportunityAlert;
  onDismiss: () => void;
  onAction?: (actionType: string) => void;
}

const AlertItem = memo(function AlertItem({ alert, onDismiss, onAction }: AlertItemProps) {
  const { severity, title, message, actionLabel, actionType, dismissable } = alert;
  const styles = getSeverityStyles(severity);
  const IconComponent = ALERT_TYPE_ICONS[alert.type] ?? AlertCircle;

  return (
    <Alert
      variant={styles.variant}
      className={cn(
        'relative pr-10',
        styles.containerClass,
        severity === 'critical' && 'animate-pulse-subtle'
      )}
    >
      <IconComponent className="h-4 w-4" />
      <AlertTitle className="font-medium">{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message}</span>
        {actionLabel && actionType && onAction && (
          <Button
            variant={severity === 'critical' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => onAction(actionType)}
            className="shrink-0"
          >
            {actionLabel}
          </Button>
        )}
      </AlertDescription>

      {dismissable && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-70 hover:opacity-100"
          onClick={onDismiss}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OpportunityAlerts = memo(function OpportunityAlerts({
  alerts,
  onAction,
  className,
}: OpportunityAlertsProps) {
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter((alert) => !isAlertDismissed(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)} role="region" aria-label="Alerts">
      {visibleAlerts.map((alert) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onDismiss={() => dismiss(alert.id)}
          onAction={onAction ? (actionType) => onAction(actionType, alert.id) : undefined}
        />
      ))}
    </div>
  );
});

export default OpportunityAlerts;
