/**
 * Alerts List Component
 *
 * Manages inventory alert rules with CRUD operations.
 *
 * Features:
 * - List of configured alert rules
 * - Toggle active/inactive
 * - Edit/delete actions
 *
 * Accessibility:
 * - Status indicated by icon + text
 * - Action buttons with labels
 */
import { memo } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingDown,
  Package,
  Archive,
  Bell,
  BellOff,
  MoreHorizontal,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export interface AlertRule {
  id: string;
  alertType: AlertType;
  name: string;
  productId?: string | null;
  productName?: string;
  locationId?: string | null;
  locationName?: string;
  thresholdValue: number;
  thresholdPercentage?: number | null;
  isActive: boolean;
  notifyEmail: boolean;
  notifyInApp: boolean;
  triggeredCount?: number;
  lastTriggeredAt?: Date | null;
  createdAt: Date;
}

interface AlertsListProps {
  alerts: AlertRule[];
  isLoading?: boolean;
  onEdit?: (alert: AlertRule) => void;
  onDelete?: (alert: AlertRule) => void;
  onToggleActive?: (alertId: string, isActive: boolean) => void;
  className?: string;
}

// ============================================================================
// ALERT TYPE CONFIG
// ============================================================================

const ALERT_TYPE_CONFIG: Record<
  AlertType,
  { label: string; icon: typeof AlertTriangle; color: string }
> = {
  low_stock: {
    label: "Low Stock",
    icon: TrendingDown,
    color: "text-orange-600",
  },
  out_of_stock: {
    label: "Out of Stock",
    icon: AlertCircle,
    color: "text-red-600",
  },
  overstock: {
    label: "Overstock",
    icon: Archive,
    color: "text-blue-600",
  },
  expiry: {
    label: "Expiry",
    icon: Clock,
    color: "text-purple-600",
  },
  slow_moving: {
    label: "Slow Moving",
    icon: Clock,
    color: "text-gray-600",
  },
  forecast_deviation: {
    label: "Forecast Deviation",
    icon: AlertTriangle,
    color: "text-yellow-600",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AlertsList = memo(function AlertsList({
  alerts,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
  className,
}: AlertsListProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (alerts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h3 className="mt-4 font-semibold">No Alert Rules</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Create alert rules to monitor inventory conditions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeCount = alerts.filter((a) => a.isActive).length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Alert Rules</CardTitle>
        <CardDescription>
          {alerts.length} rules configured ({activeCount} active)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Triggered</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => {
                const typeConfig = ALERT_TYPE_CONFIG[alert.alertType];
                const TypeIcon = typeConfig.icon;

                return (
                  <TableRow
                    key={alert.id}
                    className={cn(!alert.isActive && "opacity-60")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon
                          className={cn("h-4 w-4", typeConfig.color)}
                          aria-hidden="true"
                        />
                        <div>
                          <div className="font-medium">{alert.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {typeConfig.label}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        {alert.productName ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Package
                              className="h-3 w-3 text-muted-foreground"
                              aria-hidden="true"
                            />
                            {alert.productName}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            All Products
                          </span>
                        )}
                        {alert.locationName && (
                          <div className="text-xs text-muted-foreground">
                            @ {alert.locationName}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="tabular-nums">
                        {alert.alertType === "forecast_deviation" && alert.thresholdPercentage
                          ? `${alert.thresholdPercentage}%`
                          : alert.thresholdValue.toLocaleString()}
                      </span>
                      {alert.alertType === "expiry" && (
                        <span className="text-xs text-muted-foreground ml-1">
                          days
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {onToggleActive ? (
                        <Switch
                          checked={alert.isActive}
                          onCheckedChange={(checked) =>
                            onToggleActive(alert.id, checked)
                          }
                          aria-label={alert.isActive ? "Disable alert" : "Enable alert"}
                        />
                      ) : (
                        <Badge variant={alert.isActive ? "default" : "secondary"}>
                          {alert.isActive ? (
                            <>
                              <Bell className="h-3 w-3 mr-1" aria-hidden="true" />
                              Active
                            </>
                          ) : (
                            <>
                              <BellOff className="h-3 w-3 mr-1" aria-hidden="true" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="text-sm tabular-nums">
                        {alert.triggeredCount ?? 0}
                      </div>
                      {alert.lastTriggeredAt && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(alert.lastTriggeredAt).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(alert)}>
                              <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onToggleActive && (
                            <DropdownMenuItem
                              onClick={() => onToggleActive(alert.id, !alert.isActive)}
                            >
                              {alert.isActive ? (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-2" aria-hidden="true" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(alert)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});

export default AlertsList;
