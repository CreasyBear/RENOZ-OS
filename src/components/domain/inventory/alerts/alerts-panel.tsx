/**
 * Inventory Alerts Panel
 *
 * Real-time alert display for inventory conditions.
 * Shows low stock, out of stock, expiry, and forecast deviation alerts.
 *
 * Accessibility:
 * - Uses aria-live for real-time updates
 * - Severity indicated by icon + color (not color alone)
 * - Full keyboard navigation
 */
import { memo, useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingDown,
  Package,
  CheckCircle,
  Bell,
  BellOff,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusCell } from "@/components/shared/data-table";
import { ALERT_SEVERITY_CONFIG, ALERT_TYPE_DISPLAY_CONFIG } from "../inventory-status-config";

// ============================================================================
// TYPES
// ============================================================================

export type AlertType =
  | "low_stock"
  | "out_of_stock"
  | "overstock"
  | "expiry"
  | "slow_moving"
  | "forecast_deviation";

export type AlertSeverity = "critical" | "warning" | "info";

export interface InventoryAlert {
  id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  productId?: string;
  productName?: string;
  locationId?: string;
  locationName?: string;
  message: string;
  value?: number;
  threshold?: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  isFallback?: boolean; // Flag to distinguish fallback alerts (cannot be acknowledged)
}

// ============================================================================
// ALERT TYPE ICONS
// ============================================================================

const ALERT_TYPE_ICONS: Record<AlertType, React.ComponentType<{ className?: string }>> = {
  low_stock: TrendingDown,
  out_of_stock: Package,
  overstock: AlertCircle,
  expiry: Clock,
  slow_moving: TrendingDown,
  forecast_deviation: AlertTriangle,
};

// Severity background colors for the alert item container
const SEVERITY_BG_COLORS: Record<AlertSeverity, string> = {
  critical: "bg-red-50 dark:bg-red-950/50",
  warning: "bg-orange-50 dark:bg-orange-950/50",
  info: "bg-blue-50 dark:bg-blue-950/50",
};

// Severity icon colors
const SEVERITY_ICON_COLORS: Record<AlertSeverity, string> = {
  critical: "text-red-600",
  warning: "text-orange-600",
  info: "text-blue-600",
};

// ============================================================================
// ALERT ITEM
// ============================================================================

interface AlertItemProps {
  alert: InventoryAlert;
  onAcknowledge?: (alertId: string) => void;
  onViewDetails?: (alert: InventoryAlert) => void;
}

const AlertItem = memo(function AlertItem({
  alert,
  onAcknowledge,
  onViewDetails,
}: AlertItemProps) {
  // Safe access with fallback for unknown alert types
  const typeConfig = ALERT_TYPE_DISPLAY_CONFIG[alert.alertType] ?? ALERT_TYPE_DISPLAY_CONFIG.low_stock;
  const TypeIcon = ALERT_TYPE_ICONS[alert.alertType] ?? ALERT_TYPE_ICONS.low_stock;
  const severityBgColor = SEVERITY_BG_COLORS[alert.severity] ?? SEVERITY_BG_COLORS.warning;
  const severityIconColor = SEVERITY_ICON_COLORS[alert.severity] ?? SEVERITY_ICON_COLORS.warning;
  const SeverityIcon = ALERT_SEVERITY_CONFIG[alert.severity]?.icon ?? AlertTriangle;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        alert.acknowledgedAt
          ? "opacity-60 bg-muted/50"
          : severityBgColor
      )}
      role="listitem"
    >
      {/* Severity + Type Icon - color + icon for accessibility */}
      <div className="flex-shrink-0 mt-0.5">
        <div className={cn("relative", severityIconColor)}>
          <TypeIcon className="h-5 w-5" aria-hidden="true" />
          <SeverityIcon
            className="h-3 w-3 absolute -top-1 -right-1"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{alert.message}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {typeConfig.label}
              </Badge>
              {alert.productName && (
                <span className="text-xs text-muted-foreground truncate">
                  {alert.productName}
                </span>
              )}
              {alert.locationName && (
                <span className="text-xs text-muted-foreground truncate">
                  @ {alert.locationName}
                </span>
              )}
            </div>
          </div>

          {/* Severity badge with semantic colors */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-shrink-0">
                  <StatusCell
                    status={alert.severity}
                    statusConfig={ALERT_SEVERITY_CONFIG}
                    showIcon
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{typeConfig.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Timestamp and actions */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {new Date(alert.triggeredAt).toLocaleString()}
            {alert.acknowledgedAt && (
              <span className="ml-2 text-green-600">
                <CheckCircle className="h-3 w-3 inline mr-0.5" aria-hidden="true" />
                Acknowledged
              </span>
            )}
          </span>

          <div className="flex items-center gap-1">
            {!alert.acknowledgedAt && onAcknowledge && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onAcknowledge(alert.id)}
                aria-label={`Acknowledge alert: ${alert.message}`}
              >
                <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                Ack
              </Button>
            )}
            {onViewDetails && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onViewDetails(alert)}
                aria-label={`View details for: ${alert.message}`}
              >
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// ALERTS PANEL
// ============================================================================

interface AlertsPanelProps {
  alerts: InventoryAlert[];
  isLoading?: boolean;
  onAcknowledge?: (alertId: string) => void;
  onViewDetails?: (alert: InventoryAlert) => void;
  onViewAll?: () => void;
  maxHeight?: string;
  className?: string;
}

export const AlertsPanel = memo(function AlertsPanel({
  alerts,
  isLoading,
  onAcknowledge,
  onViewDetails,
  onViewAll,
  maxHeight = "400px",
  className,
}: AlertsPanelProps) {
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  // Filter and sort alerts
  const filteredAlerts = alerts.filter(
    (alert) => showAcknowledged || !alert.acknowledgedAt
  );

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    // Critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // Then by time (newest first)
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  // Count by severity
  const criticalCount = alerts.filter(
    (a) => a.severity === "critical" && !a.acknowledgedAt
  ).length;
  const warningCount = alerts.filter(
    (a) => a.severity === "warning" && !a.acknowledgedAt
  ).length;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Stock Alerts
            {(criticalCount > 0 || warningCount > 0) && (
              <span
                className="ml-2 flex items-center gap-1"
                aria-live="polite"
                aria-atomic="true"
              >
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                    {criticalCount}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                    {warningCount}
                  </Badge>
                )}
              </span>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setShowAcknowledged(!showAcknowledged)}
              aria-pressed={showAcknowledged}
              aria-label={showAcknowledged ? "Hide acknowledged alerts" : "Show acknowledged alerts"}
            >
              {showAcknowledged ? (
                <BellOff className="h-3 w-3 mr-1" aria-hidden="true" />
              ) : (
                <Bell className="h-3 w-3 mr-1" aria-hidden="true" />
              )}
              {showAcknowledged ? "Hide Ack'd" : "Show All"}
            </Button>
          </div>
        </div>
        <CardDescription>
          {filteredAlerts.length} active alert{filteredAlerts.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sortedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-sm font-medium text-green-600">All Clear</p>
            <p className="text-xs text-muted-foreground mt-1">
              No active inventory alerts
            </p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div
              className="space-y-3"
              role="list"
              aria-label="Inventory alerts"
              aria-live="polite"
            >
              {sortedAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {onViewAll && alerts.length > 0 && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={onViewAll}
          >
            View All Alerts
            <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

export default AlertsPanel;
