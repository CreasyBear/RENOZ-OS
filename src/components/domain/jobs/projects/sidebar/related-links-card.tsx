/**
 * Related Links Card - Project Sidebar
 *
 * Cross-entity navigation links following WORKFLOW-CONTINUITY-STANDARDS.md Principle 3.
 * Shows links to related entities: customer, order, installer.
 *
 * @see docs/design-system/WORKFLOW-CONTINUITY-STANDARDS.md Principle 3: Cross-Entity Navigation
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 5B
 */

import { Link } from '@tanstack/react-router';
import { User, ShoppingCart, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface RelatedLinksCardProps {
  /** Customer ID for navigation */
  customerId?: string | null;
  /** Customer name for display */
  customerName?: string | null;
  /** Order ID if project is linked to an order */
  orderId?: string | null;
  /** Installer ID from site visits */
  installerId?: string | null;
  /** Installer name for display */
  installerName?: string | null;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RelatedLinksCard({
  customerId,
  customerName,
  orderId,
  installerId,
  installerName,
  className,
}: RelatedLinksCardProps) {
  const hasLinks = customerId || orderId || installerId;

  if (!hasLinks) return null;

  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Related</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Customer Link */}
        {customerId && (
          <Link
            to="/customers/$customerId"
            params={{ customerId }}
            search={{}}
            className="flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
          >
            <User className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">
              {customerName || 'Customer'}
            </span>
          </Link>
        )}

        {/* Order Link */}
        {orderId && (
          <Link
            to="/orders/$orderId"
            params={{ orderId }}
            className="flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
          >
            <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">View Order</span>
          </Link>
        )}

        {/* Installer Link */}
        {installerId && (
          <Link
            to="/installers/$installerId"
            params={{ installerId }}
            className="flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
          >
            <Wrench className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">
              {installerName || 'Installer'}
            </span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
