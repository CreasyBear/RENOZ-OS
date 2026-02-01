/**
 * Alerts List Presenter
 *
 * Unified presenter combining desktop table and mobile cards
 * with responsive switching, loading states, and Card wrapper.
 */

import { memo } from "react";
import { Bell } from "lucide-react";
import {
  DataTableSkeleton,
  DataTableEmpty,
} from "@/components/shared/data-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertsTablePresenter } from "./alerts-table-presenter";
import { AlertsMobileCards } from "./alerts-mobile-cards";
import type { AlertTableItem } from "./alert-columns";

export interface AlertsListPresenterProps {
  /** Alerts to display */
  alerts: AlertTableItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Current sort field */
  sortField: string;
  /** Current sort direction */
  sortDirection: "asc" | "desc";
  /** Sort change handler */
  onSort: (field: string) => void;
  /** Selected alert IDs */
  selectedIds: Set<string>;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected (indeterminate) */
  isPartiallySelected: boolean;
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange: (rowIndex: number) => void;
  /** Check if item is selected */
  isSelected: (id: string) => boolean;
  /** Toggle active handler */
  onToggleActive?: (alertId: string, isActive: boolean) => void;
  /** Edit alert handler */
  onEdit?: (alert: AlertTableItem) => void;
  /** Delete alert handler */
  onDelete?: (alert: AlertTableItem) => void;
  /** Additional className */
  className?: string;
}

/**
 * Mobile skeleton component
 */
function MobileSkeleton() {
  return (
    <div className="md:hidden space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40 mb-2" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Desktop skeleton using shared DataTableSkeleton
 */
function DesktopSkeleton() {
  return (
    <div className="hidden md:block">
      <DataTableSkeleton
        rows={5}
        columns={[
          { skeleton: { type: "text", width: "w-40" } },
          { skeleton: { type: "text", width: "w-28" } },
          { skeleton: { type: "text", width: "w-20" } },
          { skeleton: { type: "badge", width: "w-16" } },
          { skeleton: { type: "text", width: "w-20" } },
          { skeleton: { type: "actions" } },
        ]}
      />
    </div>
  );
}

/**
 * Unified alerts list presenter with responsive table/cards.
 * Wrapped in Card for consistent styling.
 */
export const AlertsListPresenter = memo(function AlertsListPresenter({
  alerts,
  isLoading,
  error,
  sortField,
  sortDirection,
  onSort,
  selectedIds,
  isAllSelected,
  isPartiallySelected,
  onSelect,
  onSelectAll,
  onShiftClickRange,
  isSelected,
  onToggleActive,
  onEdit,
  onDelete,
  className,
}: AlertsListPresenterProps) {
  const activeCount = alerts.filter((a) => a.isActive).length;

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTableEmpty
            variant="error"
            title="Failed to load alerts"
            description={error.message ?? "An unexpected error occurred"}
          />
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
        <CardContent>
          <DesktopSkeleton />
          <MobileSkeleton />
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
          <DataTableEmpty
            variant="no-results"
            icon={Bell}
            title="No Alert Rules"
            description="Create alert rules to monitor inventory conditions."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Alert Rules</CardTitle>
        <CardDescription>
          {alerts.length} rules configured ({activeCount} active)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <AlertsTablePresenter
            alerts={alerts}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={onSort}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isPartiallySelected={isPartiallySelected}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            onShiftClickRange={onShiftClickRange}
            isSelected={isSelected}
            onToggleActive={onToggleActive}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          <AlertsMobileCards
            alerts={alerts}
            onToggleActive={onToggleActive}
            onEdit={onEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
});

AlertsListPresenter.displayName = "AlertsListPresenter";
