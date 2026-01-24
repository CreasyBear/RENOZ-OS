/**
 * Job Materials Tab
 *
 * Main container for BOM management on job detail page.
 * Includes material list, cost summary, add/edit dialogs.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-002c
 */

import * as React from 'react';
import { Plus, AlertCircle, RefreshCw, Package2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MaterialCard } from './material-card';
import { MaterialsTableSkeleton } from './materials-table-skeleton';
import { AddMaterialDialog, type Product } from './add-material-dialog';
import type { MaterialResponse, JobMaterialCostSummary } from '@/lib/schemas';
import { useConfirmation } from '@/hooks/use-confirmation';

// ============================================================================
// TYPES
// ============================================================================

export interface JobMaterialsTabProps {
  /** Products available to add to BOM */
  products?: Product[];
  /** Whether products are loading */
  isLoadingProducts?: boolean;
  /** Source: Jobs materials container query. */
  materials: MaterialResponse[];
  /** Source: Jobs materials container query. */
  costSummary?: JobMaterialCostSummary | null;
  /** Source: Jobs materials container query. */
  isLoading: boolean;
  /** Source: Jobs materials container query. */
  isError: boolean;
  /** Source: Jobs materials container query. */
  error?: Error | null;
  /** Source: Jobs materials container query. */
  onRetry: () => void;
  /** Source: Jobs materials container add mutation. */
  onAddMaterial: (values: {
    productId: string;
    quantityRequired: number;
    unitCost: number;
    notes?: string;
  }) => Promise<void>;
  /** Source: Jobs materials container update mutation. */
  onUpdateMaterial: (
    materialId: string,
    values: {
      quantityRequired?: number;
      quantityUsed?: number;
      unitCost?: number;
      notes?: string;
    }
  ) => Promise<void>;
  /** Source: Jobs materials container remove mutation. */
  onRemoveMaterial: (materialId: string) => Promise<void>;
  /** Source: Jobs materials container mutations. */
  isSubmitting: boolean;
  /** Source: Jobs materials container mutations. */
  isMutating: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JobMaterialsTab({
  products = [],
  isLoadingProducts = false,
  materials,
  costSummary,
  isLoading,
  isError,
  error,
  onRetry,
  onAddMaterial,
  onUpdateMaterial,
  onRemoveMaterial,
  isSubmitting,
  isMutating,
}: JobMaterialsTabProps) {
  const confirm = useConfirmation();

  // State for dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<MaterialResponse | undefined>();

  // Handlers
  const handleOpenCreate = () => {
    setEditingMaterial(undefined);
    setFormOpen(true);
  };

  const handleOpenEdit = (material: MaterialResponse) => {
    setEditingMaterial(material);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingMaterial(undefined);
  };

  const handleSubmitForm = async (values: {
    productId: string;
    quantityRequired: number;
    unitCost: number;
    notes?: string;
  }) => {
    try {
      if (editingMaterial) {
        await onUpdateMaterial(editingMaterial.id, {
          quantityRequired: values.quantityRequired,
          unitCost: values.unitCost,
          notes: values.notes,
        });
      } else {
        await onAddMaterial({
          productId: values.productId,
          quantityRequired: values.quantityRequired,
          unitCost: values.unitCost,
          notes: values.notes,
        });
      }
      handleCloseForm();
    } catch (err) {
      console.error('Failed to save material:', err);
    }
  };

  const handleUpdateQuantityUsed = async (materialId: string, quantityUsed: number) => {
    try {
      await onUpdateMaterial(materialId, { quantityUsed });
    } catch (err) {
      console.error('Failed to update quantity used:', err);
    }
  };

  const handleDeleteClick = async (materialId: string) => {
    const confirmed = await confirm.confirm({
      title: 'Remove Material',
      description:
        'Are you sure you want to remove this material from the job? This action cannot be undone.',
      confirmLabel: 'Remove Material',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      await onRemoveMaterial(materialId);
    }
  };

  // Loading state
  if (isLoading) {
    return <MaterialsTableSkeleton count={3} />;
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading materials</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          {error?.message || 'Failed to load materials. Please try again.'}
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (materials.length === 0) {
    return (
      <>
        <Empty className="border-2">
          <EmptyHeader>
            <EmptyTitle>No materials added</EmptyTitle>
            <EmptyDescription>
              Add materials to track the bill of materials for this job.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Material
            </Button>
          </EmptyContent>
        </Empty>

        <AddMaterialDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          material={editingMaterial}
          products={products}
          isLoadingProducts={isLoadingProducts}
          onSubmit={handleSubmitForm}
          isSubmitting={isSubmitting}
        />
      </>
    );
  }

  // Materials list
  return (
    <div className="space-y-4">
      {/* Header with cost summary and add button */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        {/* Cost summary */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Package2 className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground">
              {materials.length} material{materials.length !== 1 ? 's' : ''}
            </span>
          </div>
          {costSummary && (
            <>
              <div className="flex items-center gap-2">
                <DollarSign className="text-muted-foreground h-4 w-4" />
                <span>
                  <span className="text-muted-foreground">Estimated:</span>{' '}
                  <span className="font-medium">{formatCurrency(costSummary.estimatedCost)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  <span className="text-muted-foreground">Actual:</span>{' '}
                  <span className="font-medium">{formatCurrency(costSummary.actualCost)}</span>
                </span>
              </div>
              {costSummary.variance !== 0 && (
                <div className={costSummary.variance > 0 ? 'text-green-600' : 'text-amber-600'}>
                  {costSummary.variance > 0 ? 'Under' : 'Over'} by{' '}
                  {formatCurrency(Math.abs(costSummary.variance))}
                </div>
              )}
            </>
          )}
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="gap-2"
          aria-label="Add new material"
        >
          <Plus className="h-4 w-4" />
          Add Material
        </Button>
      </div>

      {/* Table header - desktop only */}
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <div className="bg-muted/50 text-muted-foreground flex items-center gap-4 border-b px-4 py-3 text-sm font-medium">
          <div className="flex-1">Product</div>
          <div className="w-24 text-center">Required</div>
          <div className="w-24 text-center">Used</div>
          <div className="w-32">Progress</div>
          <div className="w-24 text-right">Unit Cost</div>
          <div className="w-24 text-right">Total</div>
          <div className="w-10" />
        </div>

        {/* Material rows */}
        {materials.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            onUpdateQuantityUsed={handleUpdateQuantityUsed}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteClick}
            disabled={isMutating}
          />
        ))}
      </div>

      {/* Card list - mobile only */}
      <div className="space-y-3 md:hidden">
        {materials.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            onUpdateQuantityUsed={handleUpdateQuantityUsed}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteClick}
            disabled={isMutating}
          />
        ))}
      </div>

      {/* Add/Edit dialog */}
      <AddMaterialDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        material={editingMaterial}
        products={products}
        isLoadingProducts={isLoadingProducts}
        onSubmit={handleSubmitForm}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
