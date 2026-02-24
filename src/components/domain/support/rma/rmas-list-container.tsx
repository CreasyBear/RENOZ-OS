/**
 * RMA List Container
 *
 * Handles data fetching, selection state, and bulk actions for the RMA list.
 * Per STANDARDS §2: Container owns data; RmaList is presenter.
 *
 * @source rmas from useRmas hook
 * @source selection from useTableSelection hook
 * @source bulkApproveRma from useBulkApproveRma hook
 * @source bulkReceiveRma from useBulkReceiveRma hook
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { toastSuccess, toastError } from '@/hooks';
import { useRmas, useBulkApproveRma, useBulkReceiveRma } from '@/hooks/support';
import { useTableSelection, BulkActionsBar } from '@/components/shared/data-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RmaList } from './rma-list';
import type { RmaStatus, RmaReason } from '@/lib/schemas/support/rma';
import { CheckCircle, Package } from 'lucide-react';

export interface RmasListContainerProps {
  /** Filter state from URL */
  status?: RmaStatus;
  reason?: RmaReason;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'rmaNumber' | 'status';
  sortOrder?: 'asc' | 'desc';
  /** Callback to create new RMA */
  onCreateRma?: () => void;
  /** Called when filters/search/page change; parent updates URL */
  onStatusFilterChange?: (value: RmaStatus | 'all') => void;
  onReasonFilterChange?: (value: RmaReason | 'all') => void;
  onSearchChange?: (value: string) => void;
  onPageChange?: (page: number) => void;
}

export function RmasListContainer({
  status,
  reason,
  search,
  page = 1,
  pageSize = 20,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onCreateRma,
  onStatusFilterChange,
  onReasonFilterChange,
  onSearchChange,
  onPageChange,
}: RmasListContainerProps) {
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useRmas({
    status,
    reason,
    search,
    page,
    pageSize,
    sortBy,
    sortOrder,
  });

  const rmas = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCount = data?.pagination?.totalCount ?? 0;

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
  } = useTableSelection({ items: rmas });

  const bulkApproveMutation = useBulkApproveRma();
  const bulkReceiveMutation = useBulkReceiveRma();
  const [bulkFailures, setBulkFailures] = useState<Array<{ rmaId: string; rmaLabel: string; message: string }>>([]);
  const [lastBulkAction, setLastBulkAction] = useState<'approve' | 'receive' | null>(null);

  const handleShiftClickRangeWithIndex = useCallback(
    (rowIndex: number) => {
      if (lastClickedIndex !== null) {
        handleShiftClickRange(lastClickedIndex, rowIndex);
      }
      setLastClickedIndex(rowIndex);
    },
    [lastClickedIndex, handleShiftClickRange, setLastClickedIndex]
  );

  const handleSelectWithIndex = useCallback(
    (id: string, checked: boolean) => {
      handleSelect(id, checked);
      const idx = rmas.findIndex((r) => r.id === id);
      if (idx !== -1) {
        setLastClickedIndex(idx);
      }
    },
    [handleSelect, rmas, setLastClickedIndex]
  );

  const handleRmaClick = useCallback(
    (rma: { id: string }) => {
      navigate({ to: '/support/rmas/$rmaId', params: { rmaId: rma.id } });
    },
    [navigate]
  );

  const canBulkApprove = useMemo(() => {
    if (selectedItems.length === 0) return false;
    return selectedItems.every((r) => r.status === 'requested');
  }, [selectedItems]);

  const canBulkReceive = useMemo(() => {
    if (selectedItems.length === 0) return false;
    return selectedItems.every((r) => r.status === 'approved');
  }, [selectedItems]);

  const handleBulkApprove = useCallback(async () => {
    if (!canBulkApprove || selectedItems.length === 0) return;
    setLastBulkAction('approve');
    try {
      const result = await bulkApproveMutation.mutateAsync({
        rmaIds: selectedItems.map((r) => r.id),
      });
      if (result.updated > 0) {
        toastSuccess(`Approved ${result.updated} RMA${result.updated === 1 ? '' : 's'}`);
      }
      if (result.failed.length > 0) {
        const failureItems = result.failed.map((failure) => {
          const match = selectedItems.find((item) => item.id === failure.rmaId);
          return {
            rmaId: failure.rmaId,
            rmaLabel: match?.rmaNumber ?? failure.rmaId.slice(0, 8),
            message: failure.error,
          };
        });
        setBulkFailures(failureItems);
        clearSelection();
        failureItems.forEach((failure) => handleSelect(failure.rmaId, true));
        toastError(
          `${result.failed.length} failed: ${failureItems
            .slice(0, 2)
            .map((f) => `${f.rmaLabel}: ${f.message}`)
            .join(' | ')}`
        );
        return;
      }
      setBulkFailures([]);
      clearSelection();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to approve RMAs');
    }
  }, [canBulkApprove, selectedItems, bulkApproveMutation, clearSelection, handleSelect]);

  const handleBulkReceive = useCallback(async () => {
    if (!canBulkReceive || selectedItems.length === 0) return;
    setLastBulkAction('receive');
    try {
      const result = await bulkReceiveMutation.mutateAsync({
        rmaIds: selectedItems.map((r) => r.id),
      });
      if (result.updated > 0) {
        toastSuccess(`Received ${result.updated} RMA${result.updated === 1 ? '' : 's'}. Stock restored to inventory.`);
      }
      if (result.failed.length > 0) {
        const failureItems = result.failed.map((failure) => {
          const match = selectedItems.find((item) => item.id === failure.rmaId);
          return {
            rmaId: failure.rmaId,
            rmaLabel: match?.rmaNumber ?? failure.rmaId.slice(0, 8),
            message: failure.error,
          };
        });
        setBulkFailures(failureItems);
        clearSelection();
        failureItems.forEach((failure) => handleSelect(failure.rmaId, true));
        toastError(
          `${result.failed.length} failed: ${failureItems
            .slice(0, 2)
            .map((f) => `${f.rmaLabel}: ${f.message}`)
            .join(' | ')}`
        );
        return;
      }
      setBulkFailures([]);
      clearSelection();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to receive RMAs');
    }
  }, [canBulkReceive, selectedItems, bulkReceiveMutation, clearSelection, handleSelect]);

  const handleRetryFailed = useCallback(async () => {
    if (!lastBulkAction || bulkFailures.length === 0) return;
    const failedIds = bulkFailures.map((failure) => failure.rmaId);
    try {
      const result =
        lastBulkAction === 'approve'
          ? await bulkApproveMutation.mutateAsync({ rmaIds: failedIds })
          : await bulkReceiveMutation.mutateAsync({ rmaIds: failedIds });
      if (result.updated > 0) {
        toastSuccess(
          `${lastBulkAction === 'approve' ? 'Approved' : 'Received'} ${result.updated} failed RMA${result.updated === 1 ? '' : 's'}`
        );
      }
      if (result.failed.length > 0) {
        const nextFailures = result.failed.map((failure) => {
          const existing = bulkFailures.find((item) => item.rmaId === failure.rmaId);
          return {
            rmaId: failure.rmaId,
            rmaLabel: existing?.rmaLabel ?? failure.rmaId.slice(0, 8),
            message: failure.error,
          };
        });
        setBulkFailures(nextFailures);
        return;
      }
      setBulkFailures([]);
      clearSelection();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to retry RMAs');
    }
  }, [bulkFailures, bulkApproveMutation, bulkReceiveMutation, clearSelection, lastBulkAction]);

  return (
    <>
      {bulkFailures.length > 0 && (
        <Alert variant="destructive" className="mb-3">
          <AlertTitle>
            {bulkFailures.length} RMA bulk failure{bulkFailures.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <div className="text-sm">
              {bulkFailures.slice(0, 5).map((failure) => (
                <div key={failure.rmaId}>
                  <strong>{failure.rmaLabel}</strong>: {failure.message}
                </div>
              ))}
              {bulkFailures.length > 5 && (
                <div>...and {bulkFailures.length - 5} more.</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetryFailed}
                disabled={bulkApproveMutation.isPending || bulkReceiveMutation.isPending}
              >
                Retry Failed
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBulkFailures([])}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Bulk Actions Bar - show when 2+ selected */}
      {selectedIds.size >= 2 && (
        <BulkActionsBar selectedCount={selectedIds.size} onClear={clearSelection}>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkApprove}
            disabled={!canBulkApprove || bulkApproveMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkReceive}
            disabled={!canBulkReceive || bulkReceiveMutation.isPending}
          >
            <Package className="h-4 w-4 mr-1" />
            Receive
          </Button>
        </BulkActionsBar>
      )}

      <RmaList
        rmas={rmas}
        totalCount={totalCount}
        isLoading={isLoading}
        error={error instanceof Error ? error : null}
        onRetry={refetch}
        statusFilter={status ?? 'all'}
        reasonFilter={reason ?? 'all'}
        searchQuery={search ?? ''}
        page={page}
        onStatusFilterChange={onStatusFilterChange ?? (() => {})}
        onReasonFilterChange={onReasonFilterChange ?? (() => {})}
        onSearchChange={onSearchChange ?? (() => {})}
        onPageChange={onPageChange ?? (() => {})}
        onRmaClick={handleRmaClick}
        onCreateRma={onCreateRma}
        showCreateButton
        showFilters
        pageSize={pageSize}
        selection={{
          isSelected,
          isAllSelected,
          isPartiallySelected,
          onSelect: handleSelectWithIndex,
          onSelectAll: handleSelectAll,
          onShiftClickRange: handleShiftClickRangeWithIndex,
          lastClickedIndex,
          setLastClickedIndex,
        }}
      />
    </>
  );
}
