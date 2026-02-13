/**
 * Alerts List Component
 *
 * Manages inventory alert rules with CRUD operations.
 *
 * Features:
 * - List of configured alert rules
 * - Toggle active/inactive
 * - Edit/delete actions
 * - Sortable columns
 *
 * Accessibility:
 * - Status indicated by icon + text
 * - Action buttons with labels
 */
import { memo, useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingDown,
  Package,
  Archive,
  Bell,
  MoreHorizontal,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { StatusCell } from "@/components/shared/data-table";
import { ALERT_ACTIVE_STATUS_CONFIG } from "../inventory-status-config";

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

type SortField = 'name' | 'alertType' | 'thresholdValue' | 'isActive' | 'triggeredCount' | 'lastTriggeredAt' | 'createdAt';
type SortDirection = 'asc' | 'desc';

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
// SORT HEADER COMPONENT
// ============================================================================

function SortHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort.field === field;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive &&
        (currentSort.direction === "asc" ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        ))}
    </Button>
  );
}

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
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'createdAt',
    direction: 'desc',
  });

  const handleSort = useCallback((field: SortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Sort alerts
  const sortedAlerts = useMemo(() => {
    const sorted = [...alerts];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'alertType':
          comparison = a.alertType.localeCompare(b.alertType);
          break;
        case 'thresholdValue':
          comparison = a.thresholdValue - b.thresholdValue;
          break;
        case 'isActive':
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        case 'triggeredCount':
          comparison = (a.triggeredCount ?? 0) - (b.triggeredCount ?? 0);
          break;
        case 'lastTriggeredAt': {
          const dateA = a.lastTriggeredAt ? new Date(a.lastTriggeredAt).getTime() : 0;
          const dateB = b.lastTriggeredAt ? new Date(b.lastTriggeredAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [alerts, sort]);

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
                <TableHead>
                  <SortHeader label="Alert" field="name" currentSort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>
                  <SortHeader label="Threshold" field="thresholdValue" currentSort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead>
                  <SortHeader label="Status" field="isActive" currentSort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead>
                  <SortHeader label="Triggered" field="triggeredCount" currentSort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAlerts.map((alert) => {
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
                        <StatusCell
                          status={alert.isActive ? "active" : "inactive"}
                          statusConfig={ALERT_ACTIVE_STATUS_CONFIG}
                          showIcon
                        />
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
                                className="text-destructive focus-visible:text-destructive"
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
