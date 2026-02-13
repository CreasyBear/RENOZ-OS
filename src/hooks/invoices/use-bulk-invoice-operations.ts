'use client';

/**
 * Bulk Invoice Operations Hooks
 *
 * Hooks for performing bulk operations on multiple invoices.
 * Batches individual operations for better UX and error handling.
 *
 * @see docs/design-system/BULK-OPERATIONS-STANDARDS.md
 */

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { sendInvoiceReminder } from '@/server/functions/invoices';
import { updateInvoiceStatus } from '@/server/functions/invoices';
import { queryKeys } from '@/lib/query-keys';
import { toastSuccess, toastError } from '@/hooks';
import type { InvoiceStatus } from '@/lib/constants/invoice-status';
import type { UpdateInvoiceStatusInput } from '@/lib/schemas/invoices';

const BATCH_SIZE = 10; // Process invoices in batches to avoid overwhelming the server

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Process items in batches with error handling
 */
async function processBatches(
  invoiceIds: string[],
  batchSize: number,
  processor: (invoiceId: string) => Promise<void>
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < invoiceIds.length; i += batchSize) {
    const batch = invoiceIds.slice(i, i + batchSize);
    const batchPromises = batch.map(async (invoiceId) => {
      try {
        await processor(invoiceId);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: invoiceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.allSettled(batchPromises);
  }

  return result;
}

/**
 * Invalidate invoice-related queries after bulk operations
 */
function invalidateInvoiceQueries(queryClient: QueryClient, invoiceIds: string[]): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.summary() });
  invoiceIds.forEach((id) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) });
  });
}

/**
 * Hook for bulk sending payment reminders
 */
export function useBulkSendReminders() {
  const queryClient = useQueryClient();
  const sendReminderFn = useServerFn(sendInvoiceReminder);

  return useMutation({
    mutationFn: async (invoiceIds: string[]): Promise<BulkOperationResult> => {
      const result = await processBatches(invoiceIds, BATCH_SIZE, async (invoiceId) => {
        await sendReminderFn({ data: { id: invoiceId } });
      });

      invalidateInvoiceQueries(queryClient, invoiceIds);

      return result;
    },
    onSuccess: (result) => {
      if (result.success > 0) {
        toastSuccess(`Sent reminders for ${result.success} invoice${result.success === 1 ? '' : 's'}`);
      }
      if (result.failed > 0) {
        toastError(`Failed to send ${result.failed} reminder${result.failed === 1 ? '' : 's'}`);
      }
    },
    onError: (error: Error) => {
      toastError(error.message || 'Failed to send reminders');
    },
  });
}

/**
 * Hook for bulk updating invoice status
 */
export function useBulkUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  const updateStatusFn = useServerFn(updateInvoiceStatus);

  return useMutation({
    mutationFn: async (
      params: { invoiceIds: string[]; status: InvoiceStatus; paidAt?: Date }
    ): Promise<BulkOperationResult> => {
      const { invoiceIds, status, paidAt } = params;

      const result = await processBatches(invoiceIds, BATCH_SIZE, async (invoiceId) => {
        const input: UpdateInvoiceStatusInput = {
          id: invoiceId,
          status,
          ...(paidAt && { paidAt }),
        };
        await updateStatusFn({ data: input });
      });

      invalidateInvoiceQueries(queryClient, invoiceIds);

      return result;
    },
    onSuccess: (result) => {
      if (result.success > 0) {
        toastSuccess(`Updated ${result.success} invoice${result.success === 1 ? '' : 's'}`);
      }
      if (result.failed > 0) {
        toastError(`Failed to update ${result.failed} invoice${result.failed === 1 ? '' : 's'}`);
      }
    },
    onError: (error: Error) => {
      toastError(error.message || 'Failed to update invoice statuses');
    },
  });
}
