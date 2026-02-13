'use client';

/**
 * Send Invoice Reminder Hook
 *
 * Mutation hook for sending payment reminder emails.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { sendInvoiceReminder } from '@/server/functions/invoices';
import { toastSuccess, toastError } from '@/hooks';

export function useSendInvoiceReminder() {
  const queryClient = useQueryClient();
  const sendReminderFn = useServerFn(sendInvoiceReminder);

  return useMutation({
    mutationFn: (invoiceId: string) => sendReminderFn({ data: { id: invoiceId } }),
    onSuccess: (_, invoiceId) => {
      toastSuccess('Payment reminder sent successfully');
      // Invalidate invoice detail to refresh reminder timestamp
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
    },
    onError: (error: Error) => {
      toastError(error.message || 'Failed to send reminder');
    },
  });
}
