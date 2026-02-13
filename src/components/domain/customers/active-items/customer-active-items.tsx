/**
 * Customer Active Items Component
 *
 * Displays active/in-progress items for a customer:
 * - Active quotes (opportunities not won/lost)
 * - Orders in progress (not delivered/cancelled)
 * - Active projects (approved/in_progress)
 * - Open warranty claims
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 5A: Active Items)
 */

import { Link } from '@tanstack/react-router';
import {
  FileText,
  ShoppingCart,
  Briefcase,
  FileWarning,
  ChevronRight,
  Clock,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { FormatAmount } from '@/components/shared/format';
import { cn } from '@/lib/utils';
import type { CustomerActiveItems as CustomerActiveItemsType } from '@/lib/schemas/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerActiveItemsProps {
  activeItems: CustomerActiveItemsType;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// STAGE/STATUS BADGES
// ============================================================================

const stageBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  new: 'secondary',
  qualified: 'secondary',
  proposal: 'default',
  negotiation: 'default',
};

const orderStatusBadgeVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  confirmed: 'default',
  picking: 'secondary',
  picked: 'secondary',
  shipped: 'default',
};

const projectStatusBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  approved: 'secondary',
  in_progress: 'default',
};

const claimStatusBadgeVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  submitted: 'secondary',
  under_review: 'default',
  approved: 'default',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ActiveQuoteItem({ quote }: { quote: CustomerActiveItemsType['quotes'][0] }) {
  return (
    <Link
      to="/pipeline/$opportunityId"
      params={{ opportunityId: quote.id }}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{quote.title}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={stageBadgeVariants[quote.stage] || 'outline'} className="capitalize">
              {quote.stage.replace('_', ' ')}
            </Badge>
            <span className="flex items-center gap-1">
              <Percent className="h-3 w-3" />
              {quote.probability}%
            </span>
            {quote.daysInStage > 7 && (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock className="h-3 w-3" />
                {quote.daysInStage}d
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">
          <FormatAmount amount={quote.value} />
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function ActiveOrderItem({ order }: { order: CustomerActiveItemsType['orders'][0] }) {
  return (
    <Link
      to="/orders/$orderId"
      params={{ orderId: order.id }}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <ShoppingCart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{order.orderNumber}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={orderStatusBadgeVariants[order.status] || 'outline'} className="capitalize">
              {order.status.replace('_', ' ')}
            </Badge>
            {order.paymentStatus !== 'paid' && (
              <Badge variant={order.paymentStatus === 'overdue' ? 'destructive' : 'outline'} className="capitalize">
                {order.paymentStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">
          <FormatAmount amount={order.total} />
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function ActiveProjectItem({ project }: { project: CustomerActiveItemsType['projects'][0] }) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{project.title}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={projectStatusBadgeVariants[project.status] || 'outline'} className="capitalize">
              {project.status.replace('_', ' ')}
            </Badge>
            <span className="text-xs">{project.projectNumber}</span>
          </div>
        </div>
        <div className="w-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Progress value={project.progressPercent} className="h-1.5" />
            <span className="text-xs text-muted-foreground">{project.progressPercent}%</span>
          </div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
    </Link>
  );
}

function ActiveClaimItem({ claim }: { claim: CustomerActiveItemsType['claims'][0] }) {
  return (
    <Link
      to="/support/claims/$claimId"
      params={{ claimId: claim.id }}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileWarning className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{claim.claimNumber}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={claimStatusBadgeVariants[claim.status] || 'outline'} className="capitalize">
              {claim.status.replace('_', ' ')}
            </Badge>
            <span className="capitalize">{claim.claimType.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerActiveItems({
  activeItems,
  isLoading,
  className,
}: CustomerActiveItemsProps) {
  const { quotes, orders, projects, claims, counts } = activeItems;
  const totalActive = counts.quotes + counts.orders + counts.projects + counts.claims;

  if (isLoading) {
    return <CustomerActiveItemsSkeleton />;
  }

  if (totalActive === 0) {
    return null;
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Active Items
            </CardTitle>
            <CardDescription>
              {totalActive} item{totalActive !== 1 ? 's' : ''} in progress
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {counts.quotes > 0 && (
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                {counts.quotes}
              </Badge>
            )}
            {counts.orders > 0 && (
              <Badge variant="outline" className="gap-1">
                <ShoppingCart className="h-3 w-3" />
                {counts.orders}
              </Badge>
            )}
            {counts.projects > 0 && (
              <Badge variant="outline" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {counts.projects}
              </Badge>
            )}
            {counts.claims > 0 && (
              <Badge variant="outline" className="gap-1">
                <FileWarning className="h-3 w-3" />
                {counts.claims}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 -mx-2">
        {/* Active Quotes */}
        {quotes.length > 0 && (
          <div>
            {quotes.slice(0, 3).map((quote) => (
              <ActiveQuoteItem key={quote.id} quote={quote} />
            ))}
            {quotes.length > 3 && (
              <Link
                to="/pipeline"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full text-muted-foreground')}
              >
                +{quotes.length - 3} more quotes
              </Link>
            )}
          </div>
        )}

        {/* Active Orders */}
        {orders.length > 0 && (
          <div>
            {orders.slice(0, 3).map((order) => (
              <ActiveOrderItem key={order.id} order={order} />
            ))}
            {orders.length > 3 && (
              <Link
                to="/orders"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full text-muted-foreground')}
              >
                +{orders.length - 3} more orders
              </Link>
            )}
          </div>
        )}

        {/* Active Projects */}
        {projects.length > 0 && (
          <div>
            {projects.slice(0, 3).map((project) => (
              <ActiveProjectItem key={project.id} project={project} />
            ))}
          </div>
        )}

        {/* Active Claims */}
        {claims.length > 0 && (
          <div>
            {claims.slice(0, 3).map((claim) => (
              <ActiveClaimItem key={claim.id} claim={claim} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

export function CustomerActiveItemsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24 mt-1" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}
