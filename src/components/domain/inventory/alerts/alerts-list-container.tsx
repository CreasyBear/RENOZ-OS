'use client';

/**
 * Alerts List Container
 *
 * Handles data fetching, sorting state, and mutations
 * for the inventory alerts list.
 *
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout. See UI_UX_STANDARDIZATION_PRD.md for patterns.
 *
 * @source alerts from useAlerts hook
 * @source toggleActive from useToggleAlertActive hook
 * @source deleteAlert from useDeleteAlert hook
 */

import { useCallback, useMemo, useState, useRef } from "react";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import {
  useAlerts,
  useToggleAlertActive,
  useDeleteAlert,
  type AlertFilters,
} from "@/hooks/inventory";
import { AlertsListPresenter } from "./alerts-list-presenter";
import { type AlertTableItem, getAlertDisplayName } from "./alert-columns";
import type { AlertType } from "./alert-type-config";

type SortField = "alertType" | "isActive" | "lastTriggeredAt" | "createdAt";
type SortDirection = "asc" | "desc";

export interface AlertsListContainerProps {
  /** Optional filter by alert type */
  alertType?: AlertType;
  /** Optional filter by active status */
  isActive?: boolean;
  /** Optional filter by product */
  productId?: string;
  /** Optional filter by location */
  locationId?: string;
  /** Edit alert handler - opens edit dialog/form */
  onEdit?: (alert: AlertTableItem) => void;
  /** Additional className */
  className?: string;
}

export function AlertsListContainer({
  alertType,
  isActive,
  productId,
  locationId,
  onEdit,
  className,
}: AlertsListContainerProps) {
  const confirmation = useConfirmation();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Build query filters with server-side sorting
  const queryFilters = useMemo<AlertFilters>(
    () => ({
      alertType,
      isActive,
      productId,
      locationId,
      sortBy: sortField,
      sortOrder: sortDirection,
    }),
    [alertType, isActive, productId, locationId, sortField, sortDirection]
  );

  const {
    data: alertsData,
    isLoading,
    error,
  } = useAlerts(queryFilters);

  // Extract alerts from server response (sorting is done server-side)
  const alerts = useMemo<AlertTableItem[]>(() => {
    // Handle both array response and paginated response
    const rawData = Array.isArray(alertsData) ? alertsData : (alertsData?.alerts ?? []);

    // Server returns AlertWithDetails[] which is compatible with AlertTableItem
    // Both types match the database schema structure
    return rawData as AlertTableItem[];
  }, [alertsData]);

  const toggleActiveMutation = useToggleAlertActive();
  const deleteMutation = useDeleteAlert();

  // Type guard for sort fields
  const isValidSortField = (field: string): field is SortField => {
    return ["alertType", "isActive", "lastTriggeredAt", "createdAt"].includes(field);
  };

  // Handle sort toggle
  const handleSort = useCallback((field: string) => {
    if (!isValidSortField(field)) return;
    
    setSortField((currentField) => {
      if (currentField === field) {
        // Toggle direction
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return currentField;
      }
      // New field, default to descending for dates, ascending for others
      setSortDirection(
        ["lastTriggeredAt", "createdAt"].includes(field) ? "desc" : "asc"
      );
      return field;
    });
  }, []);

  // Handle toggle active
  const handleToggleActive = useCallback(
    (alertId: string, newIsActive: boolean) => {
      toggleActiveMutation.mutate(
        { alertId, isActive: newIsActive },
        {
          onSuccess: () => {
            toastSuccess(newIsActive ? "Alert enabled" : "Alert disabled");
          },
          onError: () => {
            toastError("Failed to update alert status");
          },
        }
      );
    },
    [toggleActiveMutation]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (alert: AlertTableItem) => {
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(getAlertDisplayName(alert), "alert rule"),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync(alert.id);
        toastSuccess("Alert rule deleted");
      } catch {
        toastError("Failed to delete alert rule");
      }
    },
    [deleteMutation, confirmation]
  );

  // Selection handlers
  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    // Update last selected index for shift-click
    const index = alerts.findIndex((a) => a.id === id);
    if (index !== -1) {
      lastSelectedIndexRef.current = index;
    }
  }, [alerts]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(alerts.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
    lastSelectedIndexRef.current = null;
  }, [alerts]);

  const handleShiftClickRange = useCallback((rowIndex: number) => {
    const lastIndex = lastSelectedIndexRef.current;
    if (lastIndex === null) {
      // No previous selection, just select this row
      const alertId = alerts[rowIndex]?.id;
      if (alertId) {
        setSelectedIds((prev) => new Set([...prev, alertId]));
        lastSelectedIndexRef.current = rowIndex;
      }
      return;
    }

    // Select range from last selected to current
    const start = Math.min(lastIndex, rowIndex);
    const end = Math.max(lastIndex, rowIndex);
    const rangeIds = alerts.slice(start, end + 1).map((a) => a.id);

    setSelectedIds((prev) => new Set([...prev, ...rangeIds]));
    lastSelectedIndexRef.current = rowIndex;
  }, [alerts]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const isAllSelected = alerts.length > 0 && selectedIds.size === alerts.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < alerts.length;

  return (
    <>
      <AlertsListPresenter
        alerts={alerts}
        isLoading={isLoading}
        error={error ?? null}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectedIds={selectedIds}
        isAllSelected={isAllSelected}
        isPartiallySelected={isPartiallySelected}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onShiftClickRange={handleShiftClickRange}
        isSelected={isSelected}
        onToggleActive={handleToggleActive}
        onEdit={onEdit}
        onDelete={handleDelete}
        className={className}
      />
    </>
  );
}

export default AlertsListContainer;
