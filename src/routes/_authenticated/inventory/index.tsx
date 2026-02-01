/**
 * Inventory Landing Page
 *
 * Action-oriented dashboard showing what needs attention.
 * Drills down into detailed views rather than starting with endless lists.
 */

import { createFileRoute, Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import {
  Package,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  MapPin,
  DollarSign,
  Plus,
  Search,
  Warehouse,
  ArrowUpRight,
} from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusCell } from '@/components/shared/data-table';
import { useOrgFormat } from '@/hooks/use-org-format';
import { cn } from '@/lib/utils';
import {
  useInventoryDashboard,
  useTriggeredAlerts,
  useReorderRecommendations,
  useMovementsDashboard,
} from '@/hooks/inventory';
import { MOVEMENT_TYPE_CONFIG } from '@/components/domain/inventory';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute('/_authenticated/inventory/' as any)({
  component: InventoryLandingPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

function InventoryLandingPage() {
  // Fetch summary data
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number | undefined) =>
    formatCurrency(amount ?? 0, { cents: false, showCents: true });
  const { data: dashboard, isLoading: isLoadingDashboard } = useInventoryDashboard();
  const { data: alerts, isLoading: isLoadingAlerts } = useTriggeredAlerts();
  const { data: reorderData, isLoading: isLoadingReorder } = useReorderRecommendations({}, true);
  const { data: movementsData, isLoading: isLoadingMovements } = useMovementsDashboard(
    { page: 1, pageSize: 50, sortOrder: 'desc' },
    true
  );

  // Use triggered alerts (properly aggregated by SKU) instead of individual inventory items
  // This ensures we show unique products, not duplicate items for the same SKU
  // Type assertion needed because server returns TriggeredAlert[] but schema defines TriggeredAlertResult[]
  // They're compatible structures, just different type definitions
  const triggeredAlertsList = (alerts?.alerts || []) as Array<{
    alert: { id: string };
    product?: { id: string; name: string; sku?: string } | null;
    location?: { id: string; name: string; locationCode?: string } | null;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    currentValue: number;
  }>;
  const criticalAlerts = triggeredAlertsList.filter((a) => a.severity === 'critical');
  const nonCriticalAlerts = triggeredAlertsList.filter((a) => a.severity !== 'critical');
  
  // Combine critical and non-critical alerts for "Needs Attention" section
  // Prioritize critical alerts, then show other alerts
  const needsAttentionAlerts = [...criticalAlerts, ...nonCriticalAlerts].slice(0, 5);
  
  const activeAlertCount = triggeredAlertsList.length > 0 
    ? triggeredAlertsList.length 
    : (dashboard?.metrics?.lowStockCount ?? 0);
  
  interface ReorderRecommendation {
    productId: string;
    productName: string;
    currentStock: number;
    recommendedQuantity: number;
    urgency?: string;
    reason?: string;
  }
  const reorderItemsRaw = (reorderData as { recommendations?: ReorderRecommendation[] })?.recommendations || [];
  const reorderItems = reorderItemsRaw.slice(0, 5).map((item) => ({
    ...item,
    reason: item.reason || item.urgency || 'Low stock',
  }));

  // Aggregate recent movements by SKU + movementType for better readability
  const rawMovements = ((movementsData as any)?.movements ?? []).map((m: any) => ({
    id: m.id,
    productId: m.productId,
    productName: m.productName ?? "Unknown Product",
    productSku: m.productSku ?? "",
    movementType: m.movementType,
    quantity: Number(m.quantity),
    locationName: m.locationName ?? "Unknown Location",
    locationCode: m.locationCode ?? null,
    referenceType: m.referenceType ?? null,
    metadataReason: m.metadata?.reason ?? null,
    performedAt: m.createdAt ? new Date(m.createdAt) : new Date(),
  }));

  // Group by SKU + movementType, aggregate quantities and track most recent time
  const aggregatedMovementsMap = new Map<string, {
    productId: string;
    productName: string;
    productSku: string;
    movementType: string;
    totalQuantity: number;
    movementCount: number;
    locationName: string;
    locationCode: string | null;
    referenceType: string | null;
    referenceId: string | null;
    metadataReason: string | null;
    mostRecentAt: Date;
  }>();

  rawMovements.forEach((m: {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    movementType: string;
    quantity: number;
    locationName: string;
    locationCode: string | null;
    referenceType: string | null;
    referenceId: string | null;
    metadataReason: string | null;
    performedAt: Date;
  }) => {
    const key = `${m.productSku || m.productId}-${m.movementType}`;
    const existing = aggregatedMovementsMap.get(key);
    
    if (existing) {
      existing.totalQuantity += m.quantity;
      existing.movementCount += 1;
      // Keep the most recent timestamp and its associated metadata
      if (m.performedAt > existing.mostRecentAt) {
        existing.mostRecentAt = m.performedAt;
        existing.locationName = m.locationName;
        existing.locationCode = m.locationCode;
        existing.referenceType = m.referenceType;
        existing.referenceId = m.referenceId;
        existing.metadataReason = m.metadataReason;
      }
    } else {
      aggregatedMovementsMap.set(key, {
        productId: m.productId,
        productName: m.productName,
        productSku: m.productSku,
        movementType: m.movementType,
        totalQuantity: m.quantity,
        movementCount: 1,
        locationName: m.locationName,
        locationCode: m.locationCode,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        metadataReason: m.metadataReason,
        mostRecentAt: m.performedAt,
      });
    }
  });

  // Convert to array, sort by most recent, and limit to 5
  const recentMovements = Array.from(aggregatedMovementsMap.values())
    .sort((a, b) => b.mostRecentAt.getTime() - a.mostRecentAt.getTime())
    .slice(0, 5);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Inventory"
        description="Overview and actions"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/inventory/locations"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Warehouse className="mr-2 h-4 w-4" />
              Locations
            </Link>
            <Link
              to="/inventory/receiving"
              className={cn(buttonVariants())}
            >
              <Plus className="mr-2 h-4 w-4" />
              Receive Stock
            </Link>
          </div>
        }
      />

      <PageLayout.Content className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Value"
            value={dashboard?.metrics?.totalValue}
            format={formatCurrencyDisplay}
            icon={DollarSign}
            isLoading={isLoadingDashboard}
            href="/inventory/analytics"
          />
          <SummaryCard
            title="Total SKUs"
            value={dashboard?.metrics?.totalSkus}
            format={(v) => v?.toString() || '0'}
            icon={Package}
            isLoading={isLoadingDashboard}
            href="/inventory/dashboard"
          />
          <SummaryCard
            title="Low Stock"
            value={dashboard?.metrics?.lowStockCount}
            format={(v) => v?.toString() || '0'}
            icon={TrendingDown}
            isLoading={isLoadingDashboard}
            href="/inventory/alerts"
            alert={(dashboard?.metrics?.lowStockCount || 0) > 0}
          />
          <SummaryCard
            title="Active Alerts"
            value={activeAlertCount}
            format={(v) => v?.toString() || '0'}
            icon={AlertTriangle}
            isLoading={isLoadingAlerts}
            href="/inventory/alerts"
            alert={activeAlertCount > 0}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <QuickActionButton href="/inventory/dashboard" icon={Search}>
            Find Product
          </QuickActionButton>
          <QuickActionButton href="/inventory/alerts" icon={AlertTriangle}>
            View Alerts
          </QuickActionButton>
          <QuickActionButton href="/inventory/locations" icon={MapPin}>
            By Location
          </QuickActionButton>
          <QuickActionButton href="/inventory/counts" icon={Warehouse}>
            Stock Counts
          </QuickActionButton>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Needs Attention */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Needs Attention
                </CardTitle>
                <Link
                  to="/inventory/alerts"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : needsAttentionAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>All caught up! No issues requiring attention.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Show triggered alerts (properly aggregated by SKU) */}
                  {needsAttentionAlerts.map((alert) => {
                    const isCritical = alert.severity === 'critical';
                    const severityLabel = isCritical
                      ? 'Critical'
                      : alert.severity === 'high' || alert.severity === 'medium'
                        ? 'Warning'
                        : 'Low Stock';
                    // Map severity to semantic color
                    const severityVariant: "error" | "warning" | "info" = isCritical ? "error" : "warning";

                    const productName = alert.product?.name || 'Unknown Product';
                    const productSku = alert.product?.sku;
                    const locationName = alert.location?.name || 'location';
                    const locationCode = alert.location?.locationCode;
                    const locationDisplay = locationCode ? `${locationName} (${locationCode})` : locationName;
                    const subtitle = alert.message || `${alert.currentValue || 0} available at ${locationDisplay}`;

                    return (
                      <AttentionItem
                        key={alert.alert?.id || `alert-${alert.product?.id || 'unknown'}-${alert.location?.id || 'unknown'}`}
                        icon={isCritical ? AlertTriangle : TrendingDown}
                        iconClass={isCritical ? "text-red-500" : "text-amber-500"}
                        bgClass={isCritical ? "bg-red-50" : "bg-amber-50"}
                        title={productName}
                        subtitle={subtitle}
                        sku={productSku}
                        href={`/inventory/alerts`}
                        badge={severityLabel}
                        badgeVariant={severityVariant}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reorder Recommendations */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-blue-500" />
                  Recommended Reorders
                </CardTitle>
                <Link
                  to="/inventory/forecasting"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
                >
                  Full report
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingReorder ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : reorderItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No reorder recommendations right now.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {reorderItems.map((rec) => (
                    <div
                      key={rec.productId}
                      className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-medium">{rec.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          Current: {rec.currentStock} · Suggested: {rec.recommendedQuantity}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {rec.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Movements / Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Link
                to="/inventory/dashboard"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
              >
                Browse all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingMovements ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : recentMovements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMovements.map((movement) => {
                  const locationDisplay = movement.locationCode
                    ? `${movement.locationName} (${movement.locationCode})`
                    : movement.locationName;
                  const timeDisplay = movement.mostRecentAt instanceof Date && !isNaN(movement.mostRecentAt.getTime())
                    ? movement.mostRecentAt.toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Unknown time';

                  const referenceLink = getMovementReferenceLink(movement.referenceType, movement.referenceId);

                  return (
                    <div
                      key={`${movement.productSku || movement.productId}-${movement.movementType}`}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{movement.productName}</p>
                          {movement.productSku && (
                            <Badge variant="outline" className="text-xs font-mono shrink-0">
                              {movement.productSku}
                            </Badge>
                          )}
                          {movement.referenceType && (
                            referenceLink ? (
                              <Link
                                to={referenceLink as any}
                                className="inline-flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Badge variant="secondary" className="text-xs shrink-0 capitalize hover:bg-secondary/80 transition-colors cursor-pointer">
                                  {formatReferenceType(movement.referenceType)}
                                  <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                                </Badge>
                              </Link>
                            ) : (
                              <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                                {formatReferenceType(movement.referenceType)}
                              </Badge>
                            )
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {locationDisplay} &bull; {timeDisplay}
                          {movement.movementCount > 1 && (
                            <span className="ml-1">({movement.movementCount} movements)</span>
                          )}
                          {movement.metadataReason && (
                            <span className="ml-1"> &bull; {movement.metadataReason}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <span className="text-sm font-medium tabular-nums">
                          {movement.totalQuantity > 0 ? "+" : ""}
                          {movement.totalQuantity}
                        </span>
                        <StatusCell
                          status={movement.movementType as keyof typeof MOVEMENT_TYPE_CONFIG}
                          statusConfig={MOVEMENT_TYPE_CONFIG}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a link URL for a movement reference
 * Returns null if no linkable reference exists
 */
function getMovementReferenceLink(
  referenceType: string | null | undefined,
  referenceId: string | null | undefined
): string | null {
  if (!referenceType || !referenceId) return null;

  const routeMap: Record<string, (id: string) => string> = {
    order: (id) => `/orders/${id}`,
    purchase_order: (id) => `/purchase-orders/${id}`,
    // Add more reference types as needed
    // adjustment: null, // No detail page
    // transfer: null, // No detail page
  };

  const routeBuilder = routeMap[referenceType];
  return routeBuilder ? routeBuilder(referenceId) : null;
}

/**
 * Format reference type for display
 */
function formatReferenceType(type: string | null | undefined): string {
  if (!type) return '';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SummaryCard({
  title,
  value,
  format,
  icon: Icon,
  isLoading,
  href,
  alert,
}: {
  title: string;
  value: number | undefined;
  format: (v: number | undefined) => string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  href: string;
  alert?: boolean;
}) {
  const hasAlert = alert && value && value > 0;
  return (
    <Card className={cn(hasAlert && "border-amber-200")}>
      <CardContent className="p-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link to={href as any} className="block">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{title}</span>
            <Icon className={cn(
              "h-4 w-4",
              hasAlert ? "text-amber-500" : "text-muted-foreground"
            )} />
          </div>
          <div className="mt-2">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-semibold">{format(value)}</span>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link
      to={href as any}
      className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function AttentionItem({
  icon: Icon,
  iconClass,
  bgClass,
  title,
  subtitle,
  sku,
  href,
  badge,
  badgeVariant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  bgClass: string;
  title: string;
  subtitle: string;
  sku?: string;
  href: string;
  badge: string;
  badgeVariant: "error" | "warning" | "info";
}) {
  return (
    <Link
      to={href as any}
      className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors"
    >
      <div className={cn("rounded-full p-2", bgClass)}>
        <Icon className={cn("h-4 w-4", iconClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{title}</p>
          {sku && (
            <Badge variant="outline" className="text-xs font-mono shrink-0">
              {sku}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <StatusBadge status={badge} variant={badgeVariant} className="text-xs shrink-0" />
    </Link>
  );
}
