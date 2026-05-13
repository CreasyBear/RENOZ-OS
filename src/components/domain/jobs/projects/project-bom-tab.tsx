/**
 * Project BOM Tab - Full Materials Management
 *
 * Complete Bill of Materials with:
 * - Product search and add
 * - Cost tracking (estimated vs actual)
 * - Quantity management (estimated → ordered → received → installed)
 * - Allocation to workstreams/site visits
 * - Status workflow
 *
 * @source src/components/domain/jobs/projects/project-bom-tab.tsx
 * @see docs/design-system/JOBS-DOMAIN-WORKFLOW.md
 */

import { useState, useCallback } from 'react';
import {
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/lib/toast';
import { useConfirmation } from '@/hooks';
// Hooks
import {
  formatProjectBomMutationError,
  useProjectBom,
  useCreateProjectBom,
  useRemoveBomItem,
  useRemoveBomItems,
  useUpdateBomItemsStatus,
  useImportBomFromCsv,
  useImportBomFromOrder,
} from '@/hooks/jobs';
import { useTableSelection, BulkActionsBar } from '@/components/shared/data-table';
import { BomTabSkeleton } from './bom-tab-skeleton';
import { BomAddItemDialog } from './bom-dialogs';
import { getProjectMaterialsReadErrorMessage } from './project-read-error-messages';
import { ProjectBomBulkStatusDialog } from './project-bom-bulk-status-dialog';
import { ProjectBomEditItemDialog } from './project-bom-edit-item-dialog';
import { ProjectBomEmptyState } from './project-bom-empty-state';
import { ProjectBomHeaderActions } from './project-bom-header-actions';
import { ProjectBomItemsTable } from './project-bom-items-table';
import { ProjectBomSummaryCards } from './project-bom-summary-cards';

// Types
import type { BomItemWithProduct } from '@/lib/schemas/jobs';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectBomTabProps {
  projectId: string;
  /** When set, enables "Import from Order" button */
  orderId?: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectBomTab({ projectId, orderId }: ProjectBomTabProps) {
  const { data: bomData, isLoading, error, refetch } = useProjectBom({ projectId });
  const createBom = useCreateProjectBom(projectId);
  const removeItem = useRemoveBomItem(projectId);
  const removeItems = useRemoveBomItems(projectId);
  const updateItemsStatus = useUpdateBomItemsStatus(projectId);
  const importCsv = useImportBomFromCsv(projectId);
  const importFromOrder = useImportBomFromOrder(projectId);
  const confirm = useConfirmation();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BomItemWithProduct | null>(null);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);

  const bom = bomData?.data?.bom ?? undefined;
  const items: BomItemWithProduct[] = bomData?.data?.items ?? [];
  const bomWarning = error ? (
    <Alert variant={bomData === undefined ? 'destructive' : 'default'}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{bomData === undefined ? 'Materials unavailable' : 'Showing cached materials'}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{getProjectMaterialsReadErrorMessage(error)}</span>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  ) : null;

  const {
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    lastClickedIndex,
    setLastClickedIndex,
    clearSelection,
    isSelected,
  } = useTableSelection({ items });

  const handleCreateBom = async () => {
    try {
      await createBom.mutateAsync('Bill of Materials');
      toast.success('BOM created');
    } catch (error) {
      toast.error(formatProjectBomMutationError(error, 'create'));
    }
  };

  const handleEditItem = (item: BomItemWithProduct) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleDeleteItem = async (item: BomItemWithProduct) => {
    const { confirmed } = await confirm.confirm({
      title: 'Remove from BOM',
      description: `Remove "${item.product?.name || 'this item'}" from the Bill of Materials?`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (confirmed) {
      try {
        await removeItem.mutateAsync({ data: { itemId: item.id } });
        toast.success('Item removed');
      } catch (error) {
        toast.error(formatProjectBomMutationError(error, 'removeItem'));
      }
    }
  };

  const handleBulkRemove = useCallback(async () => {
    const count = selectedItems.length;
    const { confirmed } = await confirm.confirm({
      title: 'Remove from BOM',
      description: `Remove ${count} item${count > 1 ? 's' : ''} from the Bill of Materials? This cannot be undone.`,
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await removeItems.mutateAsync({
        data: { itemIds: selectedItems.map((i) => i.id) },
      });
      toast.success(`Removed ${count} item${count > 1 ? 's' : ''}`);
      clearSelection();
    } catch (error) {
      toast.error(formatProjectBomMutationError(error, 'removeItems'));
    }
  }, [selectedItems, confirm, removeItems, clearSelection]);

  const handleBulkStatusOpen = useCallback(() => {
    setBulkStatusDialogOpen(true);
  }, []);

  const handleBulkStatusComplete = useCallback(() => {
    clearSelection();
    setBulkStatusDialogOpen(false);
  }, [clearSelection]);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const result = await importCsv.mutateAsync(text);
      const msg =
        result.added > 0
          ? `Imported ${result.added} item(s)`
          : 'No items imported';
      if (result.errors.length > 0) {
        toast.warning(`${msg}. ${result.errors.length} row(s) skipped.`);
      } else {
        toast.success(msg);
      }
    } catch (error) {
      toast.error(formatProjectBomMutationError(error, 'importCsv'));
    }
  };

  const handleImportFromOrder = async () => {
    if (!orderId) return;
    try {
      const result = await importFromOrder.mutateAsync();
      const msg =
        result.added > 0
          ? `Imported ${result.added} item(s) from order`
          : 'No items imported';
      if (result.errors.length > 0) {
        toast.warning(`${msg}. ${result.errors.length} row(s) skipped.`);
      } else {
        toast.success(msg);
      }
    } catch (error) {
      toast.error(formatProjectBomMutationError(error, 'importOrder'));
    }
  };

  if (isLoading) {
    return <BomTabSkeleton />;
  }

  if (!bom) {
    return (
      <ProjectBomEmptyState
        error={error}
        hasReadData={bomData !== undefined}
        orderId={orderId}
        isCreatingBom={createBom.isPending}
        isImportingCsv={importCsv.isPending}
        isImportingFromOrder={importFromOrder.isPending}
        onRetry={() => void refetch()}
        onCreateBom={() => void handleCreateBom()}
        onCsvImport={handleCsvImport}
        onImportFromOrder={() => void handleImportFromOrder()}
      />
    );
  }

  if (!bom) return null;

  return (
    <div className="space-y-6">
      {bomWarning}
      <ProjectBomHeaderActions
        bomNumber={bom.bomNumber}
        itemCount={items.length}
        orderId={orderId}
        isImportingCsv={importCsv.isPending}
        isImportingFromOrder={importFromOrder.isPending}
        onCsvImport={handleCsvImport}
        onImportFromOrder={() => void handleImportFromOrder()}
        onAddMaterial={() => setAddDialogOpen(true)}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar selectedCount={selectedItems.length} onClear={clearSelection}>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleBulkRemove}
          disabled={removeItems.isPending}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkStatusOpen}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Update status
        </Button>
      </BulkActionsBar>

      {/* Summary Cards */}
      <ProjectBomSummaryCards items={items} bom={bom} />

      {/* Items Table */}
      <ProjectBomItemsTable
        items={items}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        selection={{
          isSelected,
          handleSelect,
          handleSelectAll,
          handleShiftClickRange,
          setLastClickedIndex,
          lastClickedIndex,
          isAllSelected,
          isPartiallySelected,
        }}
      />

      {/* Allocation Note */}
      {items.length > 0 && (
        <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Materials can be allocated to specific workstreams or site visits.
            Edit an item to set its status and track progress from planned → ordered → received → installed.
          </p>
        </div>
      )}

      {/* Dialogs */}
      <BomAddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        bomId={bom.id}
      />

      <ProjectBomEditItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        projectId={projectId}
        item={editingItem}
      />

      <ProjectBomBulkStatusDialog
        open={bulkStatusDialogOpen}
        onOpenChange={setBulkStatusDialogOpen}
        items={selectedItems}
        onComplete={handleBulkStatusComplete}
        onUpdateStatus={updateItemsStatus}
      />
    </div>
  );
}
