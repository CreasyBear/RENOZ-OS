/**
 * TriageCard Component
 *
 * Reusable triage card for displaying actionable alerts on landing pages.
 * Follows DOMAIN-LANDING-STANDARDS.md pattern with severity-based styling,
 * inline actions, and dismiss functionality.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { memo } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { DynamicLink } from '@/components/ui/dynamic-link';
import { cn } from '@/lib/utils';

export interface TriageItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  icon: LucideIcon; // MUST be Lucide icon, NEVER emoji
  title: string;
  description: string;
  // THE KEY: Actions that can be taken
  primaryAction?: {
    label: string;
    href?: string; // Navigate to route (preferred)
    onClick?: () => void; // For dialogs/actions that don't navigate
  };
  viewAction: {
    label: string;
    href: string; // Navigate to detail
  };
  // For alert dismissal persistence
  dismissable?: boolean;
}

export interface TriageCardProps {
  item: TriageItem;
  onDismiss?: (id: string) => void;
}

/**
 * Parse search params from href string
 */
function parseSearchParams(href: string): Record<string, string> | undefined {
  const url = new URL(href, 'http://dummy.com');
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * TriageCard - Actionable alert card with severity styling
 *
 * Uses React.memo to prevent unnecessary re-renders.
 * Follows UI/UX Pro Max standards: WCAG colors, 44px touch targets, aria-labels.
 */
export const TriageCard = memo(function TriageCard({
  item,
  onDismiss,
}: TriageCardProps) {
  // Severity-to-style mapping with WCAG-compliant colors
  const severityStyles = {
    critical: {
      card: 'border-destructive/50 bg-destructive/5',
      icon: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    warning: {
      // Use amber-600 for better contrast (4.5:1 on white)
      card: 'border-amber-600/50 bg-amber-50',
      icon: 'bg-amber-100',
      iconColor: 'text-amber-700', // Darker for contrast
    },
    info: {
      card: 'border-blue-500/50 bg-blue-50',
      icon: 'bg-blue-100',
      iconColor: 'text-blue-700',
    },
  };

  const styles = severityStyles[item.type];

  return (
    <Card
      className={cn(
        'transition-colors duration-200', // Smooth 200ms transition
        styles.card
      )}
      // Keyboard focus styling
      tabIndex={0}
      role="article"
      aria-label={`${item.type} alert: ${item.title}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-full p-2', styles.icon)}>
              <item.icon
                className={cn('h-4 w-4', styles.iconColor)}
                aria-hidden="true" // Decorative icon
              />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
          {/* Actions - ensure 44px touch targets on mobile */}
          <div className="flex items-center gap-2 shrink-0">
            {item.primaryAction && (
              item.primaryAction.href ? (
                <DynamicLink
                  to={item.primaryAction.href.split('?')[0]}
                  search={parseSearchParams(item.primaryAction.href)}
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'min-h-[44px] sm:min-h-0' // 44px on mobile
                  )}
                >
                  {item.primaryAction.label}
                </DynamicLink>
              ) : (
                <Button
                  size="sm"
                  onClick={item.primaryAction.onClick}
                  className="min-h-[44px] sm:min-h-0" // 44px on mobile
                >
                  {item.primaryAction.label}
                </Button>
              )
            )}
            <DynamicLink
              to={item.viewAction.href.split('?')[0]}
              search={parseSearchParams(item.viewAction.href)}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'min-h-[44px] sm:min-h-0' // 44px touch target on mobile
              )}
            >
              {item.viewAction.label}
              <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
            </DynamicLink>
            {item.dismissable && onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDismiss(item.id)}
                className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                aria-label={`Dismiss ${item.title} alert`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
