/**
 * Serialized items container.
 *
 * @source serialized items from useSerializedItems
 * @source serialized detail from useSerializedItem
 * @source product options from useProducts
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProducts } from '@/hooks/products';
import {
  useAddSerializedItemNote,
  useCreateSerializedItem,
  useDeleteSerializedItem,
  useSerializedItem,
  useSerializedItems,
  useUpdateSerializedItem,
} from '@/hooks/inventory';
import type {
  CreateSerializedItemInput,
  SerializedItem,
  SerializedItemStatus,
  UpdateSerializedItemInput,
} from '@/lib/schemas/inventory';
import { SerializedItemDetailSheet } from './serialized-item-detail-sheet';
import { SerializedItemFormDialog } from './serialized-item-form-dialog';
import { SerializedItemsListPresenter } from './serialized-items-list-presenter';

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: SerializedItemStatus | 'all' }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Available', value: 'available' },
  { label: 'Allocated', value: 'allocated' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Returned', value: 'returned' },
  { label: 'Quarantined', value: 'quarantined' },
  { label: 'Scrapped', value: 'scrapped' },
];

interface SerializedItemsListContainerProps {
  initialSearch?: string;
  onSearchChange?: (search: string) => void;
  initialDetailId?: string | null;
  onDetailChange?: (detailId: string | null) => void;
}

export function SerializedItemsListContainer({
  initialSearch = '',
  onSearchChange,
  initialDetailId = null,
  onDetailChange,
}: SerializedItemsListContainerProps = {}) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<SerializedItemStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<SerializedItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<SerializedItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(initialDetailId);

  const serializedQuery = useSerializedItems({
    page,
    pageSize: 25,
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
  });
  const detailQuery = useSerializedItem(detailId ?? '', !!detailId);
  const createMutation = useCreateSerializedItem();
  const updateMutation = useUpdateSerializedItem();
  const deleteMutation = useDeleteSerializedItem();
  const noteMutation = useAddSerializedItemNote();
  const productsQuery = useProducts({ pageSize: 200 });

  const total = serializedQuery.data?.total ?? 0;
  const pageSize = serializedQuery.data?.pageSize ?? 25;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const canPrevious = page > 1;
  const canNext = page < pageCount;

  const productOptions = useMemo(
    () =>
      (productsQuery.data?.products ?? []).map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
      })),
    [productsQuery.data?.products]
  );

  const openCreateDialog = useCallback(() => {
    setFormMode('create');
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const openEditDialog = useCallback((item: SerializedItem) => {
    setFormMode('edit');
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const handleSubmitForm = useCallback(
    async (payload: CreateSerializedItemInput | UpdateSerializedItemInput) => {
      if (formMode === 'create') {
        await createMutation.mutateAsync(payload as CreateSerializedItemInput);
      } else {
        await updateMutation.mutateAsync(payload as UpdateSerializedItemInput);
      }
      setIsFormOpen(false);
      setEditingItem(null);
    },
    [formMode, createMutation, updateMutation]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync({ id: deletingItem.id });
    setDeletingItem(null);
  }, [deletingItem, deleteMutation]);

  const errorMessage = serializedQuery.error instanceof Error ? serializedQuery.error.message : null;

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setDetailId(initialDetailId);
  }, [initialDetailId]);

  const handleDetailChange = useCallback(
    (nextDetailId: string | null) => {
      setDetailId(nextDetailId);
      onDetailChange?.(nextDetailId);
    },
    [onDetailChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={search}
            onChange={(event) => {
              const next = event.target.value;
              setSearch(next);
              onSearchChange?.(next);
              setPage(1);
            }}
            placeholder="Search serial, product name, or SKU"
            className="md:max-w-md"
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as SerializedItemStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => serializedQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add serialized item
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load serialized items</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <SerializedItemsListPresenter
        items={serializedQuery.data?.items ?? []}
        isLoading={serializedQuery.isLoading || serializedQuery.isFetching}
        onView={(itemId) => handleDetailChange(itemId)}
        onEdit={openEditDialog}
        onDelete={setDeletingItem}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {(serializedQuery.data?.items ?? []).length} of {total} items
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!canPrevious} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <span>
            Page {page} / {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={!canNext} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
        </div>
      </div>

      <SerializedItemFormDialog
        key={`${formMode}:${editingItem?.id ?? 'new'}:${isFormOpen ? 'open' : 'closed'}`}
        open={isFormOpen}
        mode={formMode}
        item={editingItem}
        products={productOptions}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingItem(null);
        }}
        onSubmit={handleSubmitForm}
      />

      <SerializedItemDetailSheet
        open={!!detailId}
        data={detailQuery.data}
        isLoading={detailQuery.isLoading || detailQuery.isFetching}
        isSavingNote={noteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) handleDetailChange(null);
        }}
        onSubmitNote={async (note) => {
          if (!detailId) return;
          await noteMutation.mutateAsync({ id: detailId, note });
          await detailQuery.refetch();
        }}
      />

      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open && deleteMutation.isPending) {
            return;
          }
          if (!open) {
            setDeletingItem(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete serialized item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the canonical serial record. This action is blocked if the item has active
              allocations or shipment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteConfirm();
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
