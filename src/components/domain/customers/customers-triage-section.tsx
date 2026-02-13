/**
 * Customers Triage Section
 *
 * Displays actionable alerts for customers needing attention:
 * - Credit holds (critical)
 * - Low health scores (warning)
 *
 * Legacy triage component. Prefer filter chips per DOMAIN-LANDING-STANDARDS.
 *
 * @source triage data from useCustomerTriage hook
 */

import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useCustomerTriage } from '@/hooks/customers';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';

interface TriageItem {
  id: string;
  type: 'critical' | 'warning';
  icon: typeof AlertTriangle | typeof TrendingDown;
  title: string;
  description: string;
  customerIds: string[];
  customerNames: string[];
  viewAction: {
    label: string;
    href: string;
  };
}

interface CustomersTriageSectionProps {
  className?: string;
}

// Constants
const LOW_HEALTH_SCORE_THRESHOLD = 50;
const MAX_TRIAGE_ITEMS_DISPLAY = 3;
const CREDIT_HOLD_LIMIT = 5;

export function CustomersTriageSection({ className }: CustomersTriageSectionProps) {
  // Fetch triage data from dedicated server function (server-side filtering)
  const {
    data: triageData,
    isLoading,
    error,
    refetch,
  } = useCustomerTriage({
    creditHoldLimit: CREDIT_HOLD_LIMIT,
    lowHealthLimit: MAX_TRIAGE_ITEMS_DISPLAY,
    healthScoreThreshold: LOW_HEALTH_SCORE_THRESHOLD,
  });

  const hasError = !!error;

  // Memoize triage items to prevent unnecessary re-renders
  const triageItems = useMemo<TriageItem[]>(() => {
    const items: TriageItem[] = [];
    const creditHoldCustomers = triageData?.creditHolds ?? [];
    const lowHealthCustomers = triageData?.lowHealthScores ?? [];

    // Critical: Credit holds
    if (creditHoldCustomers.length > 0) {
      items.push({
        id: 'credit-holds',
        type: 'critical',
        icon: AlertTriangle,
        title: `${creditHoldCustomers.length} Customer${creditHoldCustomers.length !== 1 ? 's' : ''} on Credit Hold`,
        description: creditHoldCustomers
          .slice(0, MAX_TRIAGE_ITEMS_DISPLAY)
          .map((c) => c.name)
          .join(', ') + (creditHoldCustomers.length > MAX_TRIAGE_ITEMS_DISPLAY ? ` and ${creditHoldCustomers.length - MAX_TRIAGE_ITEMS_DISPLAY} more` : ''),
        customerIds: creditHoldCustomers.map((c) => c.id),
        customerNames: creditHoldCustomers.map((c) => c.name),
        viewAction: {
          label: 'View All',
          href: '/customers?status=active&creditHold=true',
        },
      });
    }

    // Warning: Low health scores
    if (lowHealthCustomers.length > 0) {
      items.push({
        id: 'low-health',
        type: 'warning',
        icon: TrendingDown,
        title: `${lowHealthCustomers.length} Customer${lowHealthCustomers.length !== 1 ? 's' : ''} with Low Health Score`,
        description: `Health scores below ${LOW_HEALTH_SCORE_THRESHOLD}: ${lowHealthCustomers
          .slice(0, MAX_TRIAGE_ITEMS_DISPLAY)
          .map((c) => `${c.name} (${c.healthScore ?? 'N/A'})`)
          .join(', ')}${lowHealthCustomers.length > MAX_TRIAGE_ITEMS_DISPLAY ? ` and ${lowHealthCustomers.length - MAX_TRIAGE_ITEMS_DISPLAY} more` : ''}`,
        customerIds: lowHealthCustomers.map((c) => c.id),
        customerNames: lowHealthCustomers.map((c) => c.name),
        viewAction: {
          label: 'View All',
          href: `/customers?healthScoreMax=${LOW_HEALTH_SCORE_THRESHOLD}`,
        },
      });
    }

    return items;
  }, [triageData]);

  // Memoize severity styles to prevent recreation on every render
  const severityStyles = useMemo(
    () => ({
      critical: {
        card: 'border-destructive/50 bg-destructive/5',
        icon: 'bg-destructive/10',
        iconColor: 'text-destructive',
      },
      warning: {
        card: 'border-amber-600/50 bg-amber-50',
        icon: 'bg-amber-100',
        iconColor: 'text-amber-700',
      },
    }),
    []
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <h3 className="text-sm font-semibold text-muted-foreground">Needs Attention</h3>
        <LoadingState variant="skeleton" lines={2} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn('space-y-3', className)}>
        <h3 className="text-sm font-semibold text-muted-foreground">Needs Attention</h3>
        <ErrorState
          message="Failed to load customer alerts"
          onRetry={() => {
            refetch();
          }}
        />
      </div>
    );
  }

  if (triageItems.length === 0) {
    return null; // No triage items to show
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-muted-foreground">Needs Attention</h3>
      <div className="space-y-3">
        {triageItems.map((item) => {
          const styles = severityStyles[item.type];
          const Icon = item.icon;

          return (
            <Card
              key={item.id}
              className={cn(
                'transition-colors duration-200',
                styles.card
              )}
              tabIndex={0}
              role="article"
              aria-label={`${item.type} alert: ${item.title}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn('rounded-full p-2', styles.icon)}>
                      <Icon
                        className={cn('h-4 w-4', styles.iconColor)}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={item.viewAction.href}
                      className={cn(
                        'inline-flex items-center gap-1 text-sm font-medium',
                        'min-h-[44px] sm:min-h-0',
                        item.type === 'critical'
                          ? 'text-destructive hover:text-destructive/80'
                          : 'text-amber-700 hover:text-amber-800'
                      )}
                    >
                      {item.viewAction.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
