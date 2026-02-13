'use client';

/**
 * Customers List Container
 *
 * Handles data fetching, selection state, bulk actions, and mutations
 * for the customers list.
 *
 * NOTE: This is a domain container component. It does NOT include layout
 * components (PageLayout, Header, etc.). The parent route is responsible
 * for layout. See UI_UX_STANDARDIZATION_PRD.md for patterns.
 *
 * @source customers from useCustomers hook
 * @source kpis from useCustomerKpis hook
 * @source selection from useTableSelection hook
 * @source deleteCustomer from useDeleteCustomer hook
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download, Settings, X } from "lucide-react";
import { useCustomerNavigation } from "@/hooks/customers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { normalizeCustomerFilters, buildCustomerQuery } from "@/lib/utils/customer-filters";
import { toastSuccess, toastError, useConfirmation } from "@/hooks";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCustomers,
  useDeleteCustomer,
  useBulkDeleteCustomers,
  useBulkUpdateCustomers,
  useBulkUpdateHealthScores,
  useSavedCustomerFilters,
  useRecentBulkOperations,
  useRollbackBulkOperation,
  useCustomerKpis,
} from "@/hooks/customers";
import { useTableSelection } from "@/components/shared/data-table";
import { BulkActionsBar } from "@/components/layout";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { BulkOperations, RollbackUI, type OperationResult } from "./bulk";
import { DomainFilterBar } from "@/components/shared/filters";
import {
  FormActions,
  MultiComboboxField,
} from "@/components/shared/forms";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import type { CustomerListQuery, BulkAssignTagsDialogInput } from "@/lib/schemas/customers";
import { bulkAssignTagsDialogSchema } from "@/lib/schemas/customers";
import { bulkAssignTags } from "@/server/customers";
import { queryKeys } from "@/lib/query-keys";
import {
  createCustomerFilterConfig,
  DEFAULT_CUSTOMER_FILTERS,
  type CustomerFiltersState,
} from "./customer-filter-config";
import { CustomersListPresenter } from "./customers-list-presenter";
import type { CustomerTableData } from "./customer-columns";
import { SavedFilterPresets } from "./saved-filter-presets";
import { MetricCard } from "@/components/shared/metric-card";
import { Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

const DISPLAY_PAGE_SIZE = 20;

export interface CustomersListContainerProps {
  filters: CustomerFiltersState;
  onFiltersChange: (filters: CustomerFiltersState) => void;
  // Callbacks for actions - parent route owns the UI
  onCreateCustomer?: () => void;
  onRefresh?: () => void;
  onExport?: (ids: string[], format: "csv" | "xlsx" | "json") => void;
  isExporting?: boolean;
  /** Available tags for filtering */
  availableTags?: Array<{ id: string; name: string; color: string }>;
}

type SortField =
  | "name"
  | "status"
  | "lifetimeValue"
  | "totalOrders"
  | "healthScore"
  | "lastOrderDate"
  | "createdAt";
type SortDirection = "asc" | "desc";

export function CustomersListContainer({
  filters,
  onFiltersChange,
  onExport,
  availableTags = [],
}: CustomersListContainerProps) {
  const navigate = useNavigate();
  const { navigateToCustomer } = useCustomerNavigation();
  const confirmation = useConfirmation();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string>("");
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
  const queryClient = useQueryClient();
  const bulkAssignFn = useServerFn(bulkAssignTags);

  // Saved filters data fetching
  const {
    savedFilters,
    isLoading: isLoadingSavedFilters,
    saveFilter,
    updateFilter,
    deleteFilter,
  } = useSavedCustomerFilters();
  const bulkAssignMutation = useMutation({
    mutationFn: (tagIds: string[]) =>
      bulkAssignFn({
        data: { customerIds: Array.from(selectedIds), tagIds },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.details() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tags.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.segments.lists() });
      toastSuccess("Tags assigned to selected customers");
      setShowTagDialog(false);
      form.reset();
    },
    onError: () => {
      toastError("Failed to assign tags");
    },
  });

  const tagOptions = useMemo(
    () =>
      availableTags.map((tag) => ({
        value: tag.id,
        label: tag.name,
        description: tag.color ? `Color: ${tag.color}` : undefined,
      })),
    [availableTags]
  );
  const form = useTanStackForm<BulkAssignTagsDialogInput>({
    schema: bulkAssignTagsDialogSchema,
    defaultValues: {
      tagIds: [],
    },
    onSubmit: async (values) => {
      await bulkAssignMutation.mutateAsync(values.tagIds);
    },
  });

  const queryFilters = useMemo<CustomerListQuery>(
    () => ({
      ...buildCustomerQuery(filters),
      page,
      pageSize: DISPLAY_PAGE_SIZE,
      sortBy: sortField,
      sortOrder: sortDirection,
    }),
    [filters, page, sortField, sortDirection]
  );

  const {
    data: customersData,
    isLoading: isCustomersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useCustomers(queryFilters);

  // Fetch KPIs for summary stats
  const { data: kpisData, isLoading: isLoadingKpis } = useCustomerKpis('30d');

  // Build dynamic filter config with tag options
  const filterConfig = useMemo(
    () => createCustomerFilterConfig(availableTags),
    [availableTags]
  );

  // Handle filter changes from DomainFilterBar
  const handleFiltersChange = useCallback(
    (nextFilters: CustomerFiltersState) => {
      const normalizedFilters = normalizeCustomerFilters(nextFilters);
      setPage(1);
      onFiltersChange(normalizedFilters);
    },
    [onFiltersChange]
  );

  // Clear all filters handler
  const handleClearFilters = useCallback(() => {
    setPage(1);
    onFiltersChange(DEFAULT_CUSTOMER_FILTERS);
  }, [onFiltersChange]);

  // Cast customers to CustomerTableData type
  const customers = useMemo<CustomerTableData[]>(
    () => (customersData?.items ?? []) as CustomerTableData[],
    [customersData]
  );
  const total = customersData?.pagination?.totalItems ?? 0;

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
  } = useTableSelection({ items: customers });

  const deleteMutation = useDeleteCustomer();
  const bulkDeleteMutation = useBulkDeleteCustomers();
  const bulkUpdateMutation = useBulkUpdateCustomers();
  const bulkHealthScoreMutation = useBulkUpdateHealthScores();
  const rollbackMutation = useRollbackBulkOperation();
  
  // Recent bulk operations for rollback
  const { data: recentOperations, refetch: refetchRecentOperations } = useRecentBulkOperations({
    entityType: 'customer',
    hours: 24,
  });

  // Handle sort toggle
  const handleSort = useCallback((field: string) => {
    setSortField((currentField) => {
      if (currentField === field) {
        // Toggle direction
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return currentField;
      }
      // New field, default to ascending for text, descending for dates/numbers
      setSortDirection(
        ["lifetimeValue", "totalOrders", "healthScore", "lastOrderDate", "createdAt"].includes(field)
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
      const idx = customers.findIndex((c) => c.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, customers, setLastClickedIndex]
  );

  const handleViewCustomer = useCallback(
    (customerId: string) => {
      navigateToCustomer(customerId);
    },
    [navigateToCustomer]
  );

  const handleEditCustomer = useCallback(
    (customerId: string) => {
      // Navigate to customer detail with edit mode
      navigate({
        to: "/customers/$customerId/edit",
        params: { customerId },
        search: {},
      });
    },
    [navigate]
  );

  const handleDeleteCustomer = useCallback(
    async (customerId: string) => {
      const customer = customers.find((c) => c.id === customerId);
      const { confirmed } = await confirmation.confirm({
        ...confirmations.delete(customer?.name ?? "this customer", "customer"),
      });
      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync(customerId);
        toastSuccess("Customer deleted");
      } catch {
        toastError("Failed to delete customer");
      }
    },
    [deleteMutation, customers, confirmation]
  );

  // Bulk operation handlers
  const handleBulkStatusUpdate = useCallback(async (status: string): Promise<OperationResult> => {
    setCurrentOperation("status");
    
    try {
      const result = await bulkUpdateMutation.mutateAsync({
        customerIds: Array.from(selectedIds),
        updates: { status: status as "prospect" | "active" | "inactive" | "suspended" | "blacklisted" },
      }) as { success: boolean; updated: number };
      
      const operationResult: OperationResult = {
        success: result.updated,
        failed: Array.from(selectedIds).length - result.updated,
        errors: [],
      };
      setOperationResult(operationResult);
      
      toastSuccess(`Updated status for ${result.updated} customer(s)`);
      
      return operationResult;
    } catch (error) {
      const operationResult: OperationResult = {
        success: 0,
        failed: Array.from(selectedIds).length,
        errors: [{ customerId: "", error: error instanceof Error ? error.message : "Failed to update status" }],
      };
      setOperationResult(operationResult);
      toastError("Failed to update status");
      throw error;
    } finally {
      setTimeout(() => {
        setCurrentOperation("");
      }, 500);
    }
  }, [bulkUpdateMutation, selectedIds]);

  const handleBulkTagAssignment = useCallback(async (tagIds: string[], _mode: 'add' | 'remove' | 'replace'): Promise<OperationResult> => {
    setCurrentOperation("tags");
    
    try {
      await bulkAssignMutation.mutateAsync(tagIds);
      
      const operationResult: OperationResult = {
        success: Array.from(selectedIds).length,
        failed: 0,
        errors: [],
      };
      setOperationResult(operationResult);
      setShowTagDialog(false);
      form.reset();
      
      toastSuccess(`Tags assigned to ${Array.from(selectedIds).length} customer(s)`);
      
      return operationResult;
    } catch (error) {
      const operationResult: OperationResult = {
        success: 0,
        failed: Array.from(selectedIds).length,
        errors: [{ customerId: "", error: error instanceof Error ? error.message : "Failed to assign tags" }],
      };
      setOperationResult(operationResult);
      toastError("Failed to assign tags");
      throw error;
    } finally {
      setTimeout(() => setCurrentOperation(""), 500);
    }
  }, [bulkAssignMutation, selectedIds, form]);

  const handleBulkHealthScoreUpdate = useCallback(async (healthScore: number, reason?: string): Promise<OperationResult> => {
    setCurrentOperation("health_score");
    
    try {
      const result = await bulkHealthScoreMutation.mutateAsync({
        customerIds: Array.from(selectedIds),
        healthScore,
        reason,
      }) as { updated: number; errors?: Array<{ customerId: string; error: string }>; auditLogId?: string };
      
      const operationResult: OperationResult = {
        success: result.updated ?? 0,
        failed: Array.from(selectedIds).length - (result.updated ?? 0),
        errors: result.errors || [],
        auditLogId: result.auditLogId,
      };
      setOperationResult(operationResult);
      
      // Toast with undo using rollback
      toastSuccess(`Updated health score for ${result.updated ?? 0} customer(s)`, {
        action: result.auditLogId ? {
          label: "Undo",
          onClick: async () => {
            try {
              await rollbackMutation.mutateAsync(result.auditLogId!);
              await refetchRecentOperations();
              setOperationResult(null);
            } catch {
              // Error handled in hook
            }
          },
        } : undefined,
      });
      
      await refetchRecentOperations(); // Refresh rollback list
      return operationResult;
    } catch (error) {
      const operationResult: OperationResult = {
        success: 0,
        failed: Array.from(selectedIds).length,
        errors: [{ customerId: "", error: error instanceof Error ? error.message : "Failed to update health score" }],
      };
      setOperationResult(operationResult);
      toastError("Failed to update health score");
      throw error;
    } finally {
      setTimeout(() => setCurrentOperation(""), 500);
    }
  }, [bulkHealthScoreMutation, selectedIds, refetchRecentOperations, rollbackMutation]);

  const handleBulkDelete = useCallback(async (): Promise<OperationResult> => {
    const count = selectedItems.length;
    const { confirmed } = await confirmation.confirm({
      title: `Delete ${count} customers?`,
      description: `This action cannot be undone. All selected customers and their associated data will be permanently deleted.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) {
      throw new Error("Cancelled");
    }

    setCurrentOperation("delete");
    
    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      
      const operationResult: OperationResult = {
        success: count,
        failed: 0,
        errors: [],
      };
      setOperationResult(operationResult);
      toastSuccess(`${count} customers deleted`);
      clearSelection();
      return operationResult;
    } catch (error) {
      const operationResult: OperationResult = {
        success: 0,
        failed: count,
        errors: [{ customerId: "", error: error instanceof Error ? error.message : "Failed to delete customers" }],
      };
      setOperationResult(operationResult);
      toastError("Failed to delete customers");
      throw error;
    } finally {
      setTimeout(() => setCurrentOperation(""), 500);
    }
  }, [bulkDeleteMutation, selectedIds, selectedItems.length, clearSelection, confirmation]);

  const handleBulkExport = useCallback(() => {
    if (onExport) {
      onExport(Array.from(selectedIds), "csv");
    }
  }, [onExport, selectedIds]);

  const handleBulkEmail = useCallback(() => {
    // TODO: Implement bulk email functionality
    toastError("Bulk email not yet implemented");
  }, []);

  const handleRollback = useCallback(async (auditLogId: string) => {
    try {
      await rollbackMutation.mutateAsync(auditLogId);
      await refetchRecentOperations();
      setOperationResult(null); // Clear current result after rollback
    } catch {
      // Error handling is done in the hook
    }
  }, [rollbackMutation, refetchRecentOperations]);


  return (
    <>
      <div className="space-y-6">
        {/* Summary Stats - KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Customers"
            value={kpisData?.kpis[0]?.value ?? '—'}
            subtitle={kpisData?.kpis[0]?.changeLabel}
            delta={kpisData?.kpis[0]?.change}
            icon={Users}
            isLoading={isLoadingKpis}
          />
          <MetricCard
            title="Total Revenue"
            value={kpisData?.kpis[1]?.value ?? '—'}
            subtitle={kpisData?.kpis[1]?.changeLabel}
            delta={kpisData?.kpis[1]?.change}
            icon={DollarSign}
            isLoading={isLoadingKpis}
          />
          <MetricCard
            title="Average LTV"
            value={kpisData?.kpis[2]?.value ?? '—'}
            subtitle={kpisData?.kpis[2]?.changeLabel}
            icon={TrendingUp}
            isLoading={isLoadingKpis}
          />
          <MetricCard
            title="Active Rate"
            value={kpisData?.kpis[3]?.value ?? '—'}
            subtitle={kpisData?.kpis[3]?.changeLabel}
            icon={AlertCircle}
            isLoading={isLoadingKpis}
          />
        </div>

        <div className="space-y-3">
          <DomainFilterBar<CustomerFiltersState>
            config={filterConfig}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            defaultFilters={DEFAULT_CUSTOMER_FILTERS}
            resultCount={total}
            presetsSuffix={
              <SavedFilterPresets
                savedFilters={savedFilters}
                isLoading={isLoadingSavedFilters}
                currentFilters={filters}
                onApply={(presetFilters) => {
                  handleFiltersChange({ ...filters, ...presetFilters });
                }}
                onSave={async (name, filterState) => {
                  await saveFilter({ name, filters: filterState });
                }}
                onUpdate={async (id, name) => {
                  await updateFilter({ id, name });
                }}
                onDelete={async (id) => {
                  await deleteFilter(id);
                }}
              />
            }
          />

        {/* Bulk Operations: floating bar + drawer (no layout shift) */}
        {selectedItems.length >= 2 && (
          <>
            <BulkActionsBar
              selectedCount={selectedItems.length}
              onClear={clearSelection}
              actions={[
                {
                  label: "Export",
                  icon: Download,
                  onClick: handleBulkExport,
                },
                {
                  label: "Bulk Actions",
                  icon: Settings,
                  onClick: () => setBulkDrawerOpen(true),
                },
              ]}
            />
            <Drawer
              open={bulkDrawerOpen}
              onOpenChange={setBulkDrawerOpen}
              direction="bottom"
            >
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="flex items-center justify-between border-b pb-4">
                  <DrawerTitle>
                    Bulk Operations — {selectedItems.length} customers selected
                  </DrawerTitle>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </DrawerClose>
                </DrawerHeader>
                <div className="overflow-y-auto p-6">
                  <BulkOperations
                    selectedCount={selectedItems.length}
                    selectedIds={Array.from(selectedIds)}
                    selectedCustomers={selectedItems.map((item) => ({
                      id: item.id,
                      status: item.status,
                      tags: item.tags?.map((tagId) => ({ id: tagId })) || [],
                    }))}
                    availableTags={availableTags}
                    onUpdateStatus={handleBulkStatusUpdate}
                    onAssignTags={handleBulkTagAssignment}
                    onUpdateHealthScore={handleBulkHealthScoreUpdate}
                    onDelete={handleBulkDelete}
                    onExport={handleBulkExport}
                    onBulkEmail={handleBulkEmail}
                    isLoading={
                      bulkUpdateMutation.isPending ||
                      bulkAssignMutation.isPending ||
                      bulkHealthScoreMutation.isPending ||
                      bulkDeleteMutation.isPending
                    }
                    result={operationResult}
                    currentOperation={currentOperation}
                    variant="embedded"
                  />
                </div>
              </DrawerContent>
            </Drawer>
          </>
        )}

        {/* Rollback UI - Show after operations complete */}
        {operationResult && operationResult.auditLogId && recentOperations?.operations && (
          <RollbackUI
            operations={recentOperations.operations.map((op) => ({
              id: op.id,
              action: op.action,
              entityType: op.entityType,
              timestamp: op.timestamp,
              affectedCount: op.affectedCount,
              operationType: op.operationType,
              canRollback: op.canRollback,
            })) as Array<{ id: string; action: string; entityType: string; timestamp: Date | string; affectedCount: number; operationType: string; canRollback: boolean }>}
            isLoading={false}
            onRollback={handleRollback}
            onRefresh={refetchRecentOperations}
          />
        )}

        <CustomersListPresenter
          customers={customers}
          isLoading={isCustomersLoading}
          error={customersError as Error | null}
          onRetry={() => {
            void refetchCustomers();
          }}
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
          onViewCustomer={handleViewCustomer}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          onEditCustomer={handleEditCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          page={page}
          pageSize={DISPLAY_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
        </div>
      </div>

      <Dialog
        open={showTagDialog}
        onOpenChange={(open) => {
          setShowTagDialog(open);
          if (!open) {
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Tags</DialogTitle>
            <DialogDescription>
              Choose tags to assign to {selectedItems.length} selected customer
              {selectedItems.length === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            {availableTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags available.</p>
            ) : (
              <form.Field name="tagIds">
                {(field) => (
                  <MultiComboboxField
                    field={field as unknown as import("@/components/shared/forms").StringArrayFieldApi}
                    label="Tags"
                    options={tagOptions}
                    placeholder="Select tags…"
                    searchPlaceholder="Search tags…"
                    emptyText="No tags found"
                    required
                    showSelectedTags
                    maxSelections={10}
                    onMaxSelected={() => toastError("You can assign up to 10 tags at a time.")}
                    disabled={bulkAssignMutation.isPending}
                  />
                )}
              </form.Field>
            )}
            <DialogFooter>
              <FormActions
                form={form}
                submitLabel="Assign Tags"
                loadingLabel="Assigning…"
                onCancel={() => setShowTagDialog(false)}
                submitDisabled={availableTags.length === 0}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CustomersListContainer;
