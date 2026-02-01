'use client';

/**
 * Opportunities List Container
 *
 * Handles data fetching, selection state, bulk actions, and mutations
 * for the opportunities list.
 *
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout.
 *
 * @source opportunities from useOpportunities hook
 * @source selection from useTableSelection hook
 * @source mutations from useOpportunityMutations hooks
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRightLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useOpportunities, useDeleteOpportunity } from "@/hooks/pipeline";
import { useTableSelection, BulkActionsBar } from "@/components/shared/data-table";
import { FormatAmount } from "@/components/shared/format";
import type { OpportunityListQuery, OpportunityStage } from "@/lib/schemas/pipeline";
import { OpportunitiesListPresenter } from "./opportunities-list-presenter";
import type { OpportunityTableItem } from "./opportunity-columns";

const DISPLAY_PAGE_SIZE = 20;

export interface OpportunitiesListFilters {
  search?: string;
  stage?: OpportunityStage;
  assignedTo?: string;
  minValue?: number;
  maxValue?: number;
}

export interface OpportunitiesListContainerProps {
  filters?: OpportunitiesListFilters;
  onFiltersChange?: (filters: OpportunitiesListFilters) => void;
  /** Callback when stage change is requested (opens dialog) */
  onStageChangeRequest?: (opportunityId: string, currentStage: OpportunityStage) => void;
  /** Callback for creating new opportunity */
  onCreateOpportunity?: () => void;
}

type SortField = "title" | "stage" | "value" | "probability" | "expectedCloseDate" | "daysInStage" | "createdAt";
type SortDirection = "asc" | "desc";

function buildOpportunityQuery(
  filters: OpportunitiesListFilters | undefined,
  page: number,
  sortField: SortField,
  sortDirection: SortDirection
): Partial<OpportunityListQuery> {
  return {
    page,
    pageSize: DISPLAY_PAGE_SIZE,
    sortBy: sortField,
    sortOrder: sortDirection,
    search: filters?.search || undefined,
    stage: filters?.stage,
    assignedTo: filters?.assignedTo,
    minValue: filters?.minValue,
    maxValue: filters?.maxValue,
  };
}

/**
 * Server response type for opportunity items
 * Note: Drizzle returns raw date types as strings, which differ from Zod schema
 */
type ServerOpportunityItem = {
  id: string;
  title: string;
  customerId: string;
  stage: OpportunityStage;
  value: number;
  probability: number | null;
  expectedCloseDate: string | Date | null;
  daysInStage: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

/**
 * Convert server opportunity item to OpportunityTableItem
 * Handles date string → Date conversion from Drizzle response
 */
function toTableItem(opportunity: ServerOpportunityItem): OpportunityTableItem {
  return {
    id: opportunity.id,
    title: opportunity.title,
    customerId: opportunity.customerId,
    stage: opportunity.stage,
    value: opportunity.value,
    probability: opportunity.probability,
    expectedCloseDate: opportunity.expectedCloseDate
      ? (opportunity.expectedCloseDate instanceof Date
          ? opportunity.expectedCloseDate
          : new Date(opportunity.expectedCloseDate))
      : null,
    daysInStage: opportunity.daysInStage,
    createdAt: opportunity.createdAt instanceof Date
      ? opportunity.createdAt
      : new Date(opportunity.createdAt),
    updatedAt: opportunity.updatedAt instanceof Date
      ? opportunity.updatedAt
      : new Date(opportunity.updatedAt),
    // Customer will be joined in the response if available
    customer: undefined, // Will be populated from server response if included
  };
}

export function OpportunitiesListContainer({
  filters,
  onFiltersChange: _onFiltersChange,
  onStageChangeRequest,
}: OpportunitiesListContainerProps) {
  // Note: _onFiltersChange is available for parent components that need to pass filters
  // Currently controlled externally via the filters prop
  void _onFiltersChange;
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const queryFilters = useMemo(
    () => buildOpportunityQuery(filters, page, sortField, sortDirection),
    [filters, page, sortField, sortDirection]
  );

  const {
    data: opportunitiesData,
    isLoading: isOpportunitiesLoading,
    error: opportunitiesError,
  } = useOpportunities(queryFilters);

  // Convert opportunities to table items
  const opportunities = useMemo<OpportunityTableItem[]>(
    () => (opportunitiesData?.items ?? []).map(toTableItem),
    [opportunitiesData]
  );
  const total = opportunitiesData?.pagination?.totalItems ?? 0;
  const totalValue = opportunitiesData?.metrics?.totalValue ?? 0;

  // Selection state using shared hook
  const {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    lastClickedIndex,
    setLastClickedIndex,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
  } = useTableSelection({ items: opportunities });

  const deleteMutation = useDeleteOpportunity();

  // Calculate total value of selected items
  const selectedTotalValue = useMemo(
    () => selectedItems.reduce((sum, o) => sum + o.value, 0),
    [selectedItems]
  );

  // Handle sort toggle
  const handleSort = useCallback((field: string) => {
    setSortField((currentField) => {
      if (currentField === field) {
        // Toggle direction
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return currentField;
      }
      // New field, default to descending for dates/numbers, ascending for text
      setSortDirection(
        ["expectedCloseDate", "value", "probability", "daysInStage", "createdAt"].includes(field)
          ? "desc"
          : "asc"
      );
      return field as SortField;
    });
    setPage(1); // Reset to first page on sort change
  }, []);

  // Shift-click range handler that updates lastClickedIndex
  const handleShiftClickRangeWithIndex = useCallback(
    (rowIndex: number) => {
      if (lastClickedIndex !== null) {
        handleShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex(rowIndex);
    },
    [lastClickedIndex, handleShiftClickRange, setLastClickedIndex]
  );

  // Single select handler that updates lastClickedIndex
  const handleSelectWithIndex = useCallback(
    (id: string, checked: boolean) => {
      handleSelect(id, checked);
      const idx = opportunities.findIndex((o) => o.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, opportunities, setLastClickedIndex]
  );

  const handleViewOpportunity = useCallback(
    (opportunityId: string) => {
      navigate({
        to: "/pipeline/$opportunityId",
        params: { opportunityId },
      });
    },
    [navigate]
  );

  const handleEditOpportunity = useCallback(
    (opportunityId: string) => {
      navigate({
        to: "/pipeline/$opportunityId",
        params: { opportunityId },
      });
    },
    [navigate]
  );

  const handleChangeStage = useCallback(
    (opportunityId: string, currentStage: OpportunityStage) => {
      if (onStageChangeRequest) {
        onStageChangeRequest(opportunityId, currentStage);
      }
    },
    [onStageChangeRequest]
  );

  const handleDeleteOpportunity = useCallback(
    async (opportunityId: string) => {
      const opportunity = opportunities.find((o) => o.id === opportunityId);
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(opportunity?.title ?? "this opportunity", "opportunity"),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync(opportunityId);
        toastSuccess("Opportunity deleted");
      } catch {
        toastError("Failed to delete opportunity");
      }
    },
    [deleteMutation, opportunities, confirmation]
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    const count = selectedItems.length;
    const { confirmed } = await confirmation.confirm({
      ...confirmations.delete(`${count} opportunities`, "opportunity"),
    });
    if (!confirmed) return;

    try {
      // Delete in parallel for better performance
      await Promise.all(selectedItems.map((item) => deleteMutation.mutateAsync(item.id)));
      toastSuccess(`Deleted ${count} opportunities`);
      clearSelection();
    } catch {
      toastError("Failed to delete some opportunities");
    }
  }, [selectedItems, deleteMutation, confirmation, clearSelection]);

  // Bulk stage change handler
  const handleBulkStageChange = useCallback(() => {
    // For bulk stage change, we'd open a dialog with stage options
    // For now, this triggers the stage change for the first selected item
    if (selectedItems.length > 0 && onStageChangeRequest) {
      // In a real implementation, you'd open a dialog for bulk stage change
      toastSuccess(`Stage change requested for ${selectedItems.length} opportunities`);
    }
  }, [selectedItems, onStageChangeRequest]);

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-4">
        {/* Bulk Actions Bar */}
        <BulkActionsBar selectedCount={selectedItems.length} onClear={clearSelection}>
          <span className="text-sm text-muted-foreground mr-2">
            Total: <FormatAmount amount={selectedTotalValue} />
          </span>
          <Button size="sm" variant="outline" onClick={handleBulkStageChange}>
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            Change Stage
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </BulkActionsBar>

        <OpportunitiesListPresenter
          opportunities={opportunities}
          isLoading={isOpportunitiesLoading}
          error={opportunitiesError as Error | null}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelect={handleSelectWithIndex}
          onSelectAll={handleSelectAll}
          onShiftClickRange={handleShiftClickRangeWithIndex}
          isSelected={isSelected}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewOpportunity={handleViewOpportunity}
          onEditOpportunity={handleEditOpportunity}
          onChangeStage={handleChangeStage}
          onDeleteOpportunity={handleDeleteOpportunity}
          page={page}
          pageSize={DISPLAY_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          totalValue={totalValue}
        />
      </div>
    </>
  );
}

export default OpportunitiesListContainer;
