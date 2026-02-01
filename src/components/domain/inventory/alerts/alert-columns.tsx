/**
 * Alert Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Package } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  CheckboxCell,
  DateCell,
  ActionsCell,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import type { ActionItem } from "@/components/shared/data-table/cells/actions-cell";
import { Edit, Trash2, ToggleLeft, ToggleRight, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALERT_TYPE_CONFIG,
  type AlertType,
} from "./alert-type-config";

/**
 * Alert threshold configuration (from JSONB column)
 */
export interface AlertThreshold {
  minQuantity?: number;
  maxQuantity?: number;
  daysBeforeExpiry?: number;
  daysWithoutMovement?: number;
  deviationPercentage?: number;
  reorderPoint?: number;
  safetyStock?: number;
}

/**
 * Alert rule item type - matches server function response
 * Note: Maps to database inventoryAlerts table
 */
export interface AlertTableItem {
  id: string;
  organizationId: string;
  alertType: AlertType;
  productId: string | null;
  locationId: string | null;
  threshold: AlertThreshold;
  isActive: boolean;
  notificationChannels: string[];
  escalationUsers: string[];
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  // Extended fields from joins (optional)
  product?: { id: string; name: string; sku?: string } | null;
  location?: { id: string; name: string; locationCode?: string } | null;
}

/**
 * Get display name for an alert (derived from type and scope)
 */
export function getAlertDisplayName(alert: AlertTableItem): string {
  const typeLabel = ALERT_TYPE_CONFIG[alert.alertType]?.label ?? alert.alertType;
  const scope = alert.product?.name ?? "All Products";
  return `${typeLabel} - ${scope}`;
}

/**
 * Get threshold value for display
 */
export function getThresholdDisplay(alert: AlertTableItem): { value: string; suffix?: string } {
  const threshold = alert.threshold;

  if (alert.alertType === "forecast_deviation" && threshold.deviationPercentage) {
    return { value: `${threshold.deviationPercentage}%` };
  }

  if (alert.alertType === "expiry" && threshold.daysBeforeExpiry !== undefined) {
    return { value: threshold.daysBeforeExpiry.toLocaleString(), suffix: "days" };
  }

  if (alert.alertType === "slow_moving" && threshold.daysWithoutMovement !== undefined) {
    return { value: threshold.daysWithoutMovement.toLocaleString(), suffix: "days" };
  }

  if (alert.alertType === "overstock" && threshold.maxQuantity !== undefined) {
    return { value: threshold.maxQuantity.toLocaleString() };
  }

  if ((alert.alertType === "low_stock" || alert.alertType === "out_of_stock") && threshold.minQuantity !== undefined) {
    return { value: threshold.minQuantity.toLocaleString() };
  }

  // Fallback to reorder point or safety stock if available
  if (threshold.reorderPoint !== undefined) {
    return { value: threshold.reorderPoint.toLocaleString() };
  }

  if (threshold.safetyStock !== undefined) {
    return { value: threshold.safetyStock.toLocaleString() };
  }

  return { value: "-" };
}

export interface CreateAlertColumnsOptions {
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange: (rowIndex: number) => void;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected (indeterminate) */
  isPartiallySelected: boolean;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Check if item is selected */
  isSelected: (id: string) => boolean;
  /** Toggle active handler - if provided, renders inline Switch */
  onToggleActive?: (alertId: string, isActive: boolean) => void;
  /** Edit alert handler */
  onEdit?: (alert: AlertTableItem) => void;
  /** Delete alert handler */
  onDelete?: (alert: AlertTableItem) => void;
}

/**
 * Create column definitions for the alerts table.
 */
export function createAlertColumns(
  options: CreateAlertColumnsOptions
): ColumnDef<AlertTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onToggleActive,
    onEdit,
    onDelete,
  } = options;

  return [
    // Checkbox column
    {
      id: "select",
      header: () => (
        <CheckboxCell
          checked={isAllSelected}
          indeterminate={isPartiallySelected}
          onChange={onSelectAll}
          ariaLabel="Select all alerts"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select alert ${row.original.alertType}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Alert Type + Name column
    {
      id: "alertType",
      accessorKey: "alertType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Alert" />
      ),
      cell: ({ row }) => {
        const alert = row.original;
        const typeConfig = ALERT_TYPE_CONFIG[alert.alertType];
        const TypeIcon = typeConfig.icon;
        const displayName = getAlertDisplayName(alert);

        return (
          <div className={cn("flex items-center gap-2", !alert.isActive && "opacity-60")}>
            <TypeIcon
              className={cn("h-4 w-4 shrink-0", typeConfig.color)}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="font-medium truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground">
                {typeConfig.label}
              </div>
            </div>
          </div>
        );
      },
      enableSorting: true,
      size: 200,
    },

    // Scope column (Product + Location)
    {
      id: "scope",
      accessorFn: (row) => row.product?.name ?? "All Products",
      header: "Scope",
      cell: ({ row }) => {
        const alert = row.original;
        return (
          <div className={cn("space-y-1", !alert.isActive && "opacity-60")}>
            {alert.product?.name ? (
              <div className="flex items-center gap-1 text-sm">
                <Package
                  className="h-3 w-3 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate max-w-[120px]">{alert.product.name}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">All Products</span>
            )}
            {alert.location?.name && (
              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                @ {alert.location.name}
              </div>
            )}
          </div>
        );
      },
      enableSorting: false,
      size: 150,
    },

    // Threshold column
    {
      id: "threshold",
      accessorFn: (row) => {
        const display = getThresholdDisplay(row);
        return display.value;
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Threshold" />
      ),
      cell: ({ row }) => {
        const alert = row.original;
        const { value, suffix } = getThresholdDisplay(alert);

        return (
          <span className={cn("tabular-nums", !alert.isActive && "opacity-60")}>
            {value}
            {suffix && (
              <span className="text-xs text-muted-foreground ml-1">{suffix}</span>
            )}
          </span>
        );
      },
      enableSorting: false, // Can't sort on computed accessor easily
      size: 100,
    },

    // Status column with inline Switch or Badge
    {
      id: "isActive",
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const alert = row.original;

        if (onToggleActive) {
          return (
            <Switch
              checked={alert.isActive}
              onCheckedChange={(checked) => onToggleActive(alert.id, checked)}
              aria-label={alert.isActive ? "Disable alert" : "Enable alert"}
            />
          );
        }

        return (
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
        );
      },
      enableSorting: true,
      size: 100,
    },

    // Last Triggered column
    {
      id: "lastTriggeredAt",
      accessorKey: "lastTriggeredAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Triggered" />
      ),
      cell: ({ row }) => {
        const alert = row.original;
        return (
          <div className={cn(!alert.isActive && "opacity-60")}>
            {alert.lastTriggeredAt ? (
              <DateCell value={alert.lastTriggeredAt} format="short" />
            ) : (
              <span className="text-sm text-muted-foreground">Never</span>
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 100,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const alert = row.original;
        const actions: ActionItem[] = [];

        if (onEdit) {
          actions.push({
            label: "Edit",
            icon: Edit,
            onClick: () => onEdit(alert),
          });
        }

        if (onToggleActive) {
          actions.push({
            label: alert.isActive ? "Disable" : "Enable",
            icon: alert.isActive ? ToggleLeft : ToggleRight,
            onClick: () => onToggleActive(alert.id, !alert.isActive),
          });
        }

        if (onDelete) {
          actions.push({
            label: "Delete",
            icon: Trash2,
            onClick: () => onDelete(alert),
            variant: "destructive",
            separator: actions.length > 0,
          });
        }

        if (actions.length === 0) {
          return null;
        }

        return <ActionsCell actions={actions} />;
      },
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
  ];
}
