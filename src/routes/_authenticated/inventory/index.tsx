/**
 * Inventory Landing Page
 *
 * Action-oriented dashboard showing what needs attention.
 * Drills down into detailed views rather than starting with endless lists.
 */

import { createFileRoute, Link } from '@tanstack/react-router';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useInventoryDashboard,
  useTriggeredAlerts,
  useReorderRecommendations,
  useInventoryLowStock,
} from '@/hooks/inventory';

export const Route = createFileRoute('/_authenticated/inventory/' as any)({
  component: InventoryLandingPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

function InventoryLandingPage() {
  // Fetch summary data
  const { data: dashboard, isLoading: isLoadingDashboard } = useInventoryDashboard();
  const { data: alerts, isLoading: isLoadingAlerts } = useTriggeredAlerts();
  const { data: reorderData, isLoading: isLoadingReorder } = useReorderRecommendations({}, true);
  const { data: lowStockData, isLoading: isLoadingLowStock } = useInventoryLowStock();

  const criticalAlerts =
    alerts?.alerts?.filter((a: { severity: string }) => a.severity === 'critical') || [];
  const activeAlertCount =
    criticalAlerts.length > 0 ? criticalAlerts.length : (dashboard?.metrics?.lowStockCount ?? 0);
  const reorderItems: Array<{ productId: string; productName: string; currentStock: number; recommendedQuantity: number; reason: string }> = (reorderData as any)?.recommendations?.slice(0, 5) || [];
  const lowStockItems = lowStockData?.items?.slice(0, 5) || [];

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Inventory"
        description="Overview and actions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/inventory/locations">
                <Warehouse className="mr-2 h-4 w-4" />
                Locations
              </Link>
            </Button>
            <Button asChild>
              <Link to="/inventory/receiving">
                <Plus className="mr-2 h-4 w-4" />
                Receive Stock
              </Link>
            </Button>
          </div>
        }
      />

      <PageLayout.Content className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Value"
            value={dashboard?.metrics?.totalValue}
            format={formatCurrency}
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
          <QuickActionButton href="/inventory/stock-counts" icon={Warehouse}>
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
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/inventory/alerts" className="gap-1">
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLowStock || isLoadingAlerts ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : lowStockItems.length === 0 && criticalAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>All caught up! No issues requiring attention.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Critical Alerts First */}
                  {criticalAlerts.slice(0, 3).map((alert: any) => (
                    <AttentionItem
                      key={alert.id}
                      icon={AlertTriangle}
                      iconClass="text-red-500"
                      bgClass="bg-red-50"
                      title={alert.title || alert.alertName}
                      subtitle={alert.message || alert.description}
                      href={`/inventory/alerts`}
                      badge={alert.severity}
                      badgeVariant="destructive"
                    />
                  ))}
                  {/* Low Stock Items */}
                  {lowStockItems.map((item) => (
                    <AttentionItem
                      key={item.id}
                      icon={TrendingDown}
                      iconClass="text-amber-500"
                      bgClass="bg-amber-50"
                      title={item.product?.name || 'Unknown Product'}
                      subtitle={`${item.quantityOnHand} in stock at ${item.location?.name}`}
                      href={`/inventory/${item.id}`}
                      badge="Low Stock"
                      badgeVariant="secondary"
                    />
                  ))}
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
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/inventory/forecasting" className="gap-1">
                    Full report
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
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
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inventory/dashboard" className="gap-1">
                  Browse all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Recent stock movements, adjustments, and transfers will appear here.</p>
            </div>
          </CardContent>
        </Card>
      </PageLayout.Content>
    </PageLayout>
  );
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
    <Button variant="outline" className="gap-2" asChild>
      <Link to={href as any}>
        <Icon className="h-4 w-4" />
        {children}
      </Link>
    </Button>
  );
}

function AttentionItem({
  icon: Icon,
  iconClass,
  bgClass,
  title,
  subtitle,
  href,
  badge,
  badgeVariant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  bgClass: string;
  title: string;
  subtitle: string;
  href: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
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
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <Badge variant={badgeVariant} className="text-xs shrink-0">{badge}</Badge>
    </Link>
  );
}
