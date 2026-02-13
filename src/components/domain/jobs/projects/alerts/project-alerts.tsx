/**
 * Project Alerts Component (Zone 3)
 *
 * Displays project health alerts with dismiss functionality.
 * Pure presenter component - receives alerts via props.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 3
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md Zone 3
 * @see docs/design-system/BUTTON-LINK-STANDARDS.md for navigation patterns
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAlertDismissals } from '@/hooks/_shared/use-alert-dismissals';
import { cn } from '@/lib/utils';
import type { ProjectAlert, AlertSeverity } from '@/lib/schemas/jobs/project-alerts';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse a URL string into route path and search params for TanStack Router Link.
 * TanStack Router expects `to` to be the route pattern, with query params in `search`.
 */
function parseAlertUrl(url: string): { to: string; search?: Record<string, string> } {
  const [path, queryString] = url.split('?');
  if (!queryString) {
    return { to: path };
  }

  const search: Record<string, string> = {};
  const params = new URLSearchParams(queryString);
  params.forEach((value, key) => {
    search[key] = value;
  });

  return { to: path, search };
}

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectAlertsProps {
  projectId: string;
  alerts: ProjectAlert[];
  /** Maximum alerts to show before collapse */
  maxVisible?: number;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SEVERITY_STYLES: Record<AlertSeverity, { icon: typeof AlertCircle; className: string }> = {
  critical: {
    icon: AlertCircle,
    className: 'border-destructive/50 bg-destructive/10 text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400',
  },
  info: {
    icon: Info,
    className: 'border-blue-500/50 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400',
  },
};

// ============================================================================
// ALERT ACTION LINK
// ============================================================================

interface AlertActionLinkProps {
  url: string;
  label: string;
}

function AlertActionLink({ url, label }: AlertActionLinkProps) {
  const { to, search } = parseAlertUrl(url);
  return (
    <Link
      to={to}
      search={search}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        'h-7 px-2 text-xs shrink-0'
      )}
    >
      {label}
    </Link>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectAlerts({
  projectId: _projectId,
  alerts,
  maxVisible = 3,
  className,
}: ProjectAlertsProps) {
  const { isAlertDismissed, dismiss } = useAlertDismissals();
  const [showAll, setShowAll] = useState(false);

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter((alert) => !isAlertDismissed(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  const displayedAlerts = showAll
    ? visibleAlerts
    : visibleAlerts.slice(0, maxVisible);
  const hiddenCount = visibleAlerts.length - maxVisible;

  return (
    <div
      className={cn('space-y-2', className)}
      role="region"
      aria-label="Project alerts"
    >
      {displayedAlerts.map((alert) => {
        const { icon: Icon, className: severityClass } = SEVERITY_STYLES[alert.severity];

        return (
          <Alert
            key={alert.id}
            className={cn(
              'relative pr-12',
              severityClass,
              'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="flex-1">{alert.message}</span>
              {alert.actionLabel && alert.actionUrl && (
                <AlertActionLink url={alert.actionUrl} label={alert.actionLabel} />
              )}
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-0.5 h-9 w-9 opacity-70 hover:opacity-100"
              onClick={() => dismiss(alert.id)}
              aria-label={`Dismiss alert: ${alert.message}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        );
      })}

      {/* Show More/Less Toggle */}
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs text-muted-foreground"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              View {hiddenCount} more alert{hiddenCount === 1 ? '' : 's'}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
