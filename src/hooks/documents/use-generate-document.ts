/**
 * Document Generation Hooks
 *
 * TanStack Query hooks for generating PDF documents via Trigger.dev jobs.
 * Handles quote, invoice, and other document types.
 *
 * @example
 * ```tsx
 * // Generate a quote PDF
 * const { mutate: generateQuote, isPending } = useGenerateQuote();
 * generateQuote({ orderId: '...' });
 *
 * // Generate an invoice PDF
 * const { mutate: generateInvoice } = useGenerateInvoice();
 * generateInvoice({ orderId: '...', dueDate: '...' });
 *
 * // Check document status
 * const { data } = useDocumentStatus({ orderId: '...', documentType: 'quote' });
 * ```
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  generateQuotePdf,
  generateInvoicePdf,
  getDocumentStatus,
} from '@/server/functions/documents';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType =
  | 'quote'
  | 'invoice'
  | 'delivery-note'
  | 'work-order'
  | 'warranty-certificate'
  | 'completion-certificate';

export interface GenerateQuoteInput {
  orderId: string;
  regenerate?: boolean;
}

export interface GenerateInvoiceInput {
  orderId: string;
  dueDate?: string;
  regenerate?: boolean;
}

export interface DocumentStatusInput {
  orderId: string;
  documentType: 'quote' | 'invoice';
}

export interface DocumentStatusResult {
  orderId: string;
  documentType: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  url: string | null;
}

// ============================================================================
// QUOTE GENERATION
// ============================================================================

/**
 * Generate a Quote PDF for an order.
 *
 * Triggers a background job to generate the PDF.
 * The PDF URL will be stored on the order record.
 *
 * @example
 * ```tsx
 * const { mutate, isPending, isSuccess } = useGenerateQuote();
 *
 * <Button
 *   onClick={() => mutate({ orderId })}
 *   disabled={isPending}
 * >
 *   {isPending ? 'Generating...' : 'Generate Quote PDF'}
 * </Button>
 * ```
 */
export function useGenerateQuote() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateQuotePdf);

  return useMutation<
    Awaited<ReturnType<typeof generateQuotePdf>>,
    Error,
    GenerateQuoteInput
  >({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      // Invalidate document-related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(result.orderId),
      });
      // Invalidate document history so Documents tab updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history('order', result.orderId),
      });
    },
  });
}

// ============================================================================
// INVOICE GENERATION
// ============================================================================

/**
 * Generate an Invoice PDF for an order.
 *
 * Triggers a background job to generate the PDF.
 * The PDF URL will be stored on the order record.
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useGenerateInvoice();
 *
 * <Button
 *   onClick={() => mutate({ orderId, dueDate: new Date().toISOString() })}
 *   disabled={isPending}
 * >
 *   {isPending ? 'Generating...' : 'Generate Invoice PDF'}
 * </Button>
 * ```
 */
export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateInvoicePdf);

  return useMutation<
    Awaited<ReturnType<typeof generateInvoicePdf>>,
    Error,
    GenerateInvoiceInput
  >({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      // Invalidate document-related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(result.orderId),
      });
      // Invalidate document history so Documents tab updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history('order', result.orderId),
      });
    },
  });
}

// ============================================================================
// DOCUMENT STATUS
// ============================================================================

/**
 * Get the status/URL of a generated document.
 *
 * Use this to poll for document generation completion or to check if
 * a document already exists for an entity.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useDocumentStatus({
 *   orderId: '...',
 *   documentType: 'quote',
 * });
 *
 * if (data?.url) {
 *   window.open(data.url, '_blank');
 * }
 * ```
 */
export function useDocumentStatus(
  input: DocumentStatusInput,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) {
  const statusFn = useServerFn(getDocumentStatus);

  return useQuery<DocumentStatusResult, Error>({
    queryKey: queryKeys.documents.status(input.orderId, input.documentType),
    queryFn: async () => {
      const result = await statusFn({ data: input });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 1000, // 5 seconds - document status can change quickly
    refetchInterval: options?.refetchInterval ?? false,
  });
}

/**
 * Poll for document generation completion.
 *
 * Automatically polls every 2 seconds while the document is being generated.
 * Stops polling once the document is completed or failed.
 *
 * @example
 * ```tsx
 * const { data, isPolling } = useDocumentPolling({
 *   orderId: '...',
 *   documentType: 'quote',
 *   enabled: isGenerating,
 * });
 * ```
 */
export function useDocumentPolling(
  input: DocumentStatusInput & {
    enabled?: boolean;
    onTerminalStatus?: (data: DocumentStatusResult) => void;
  }
) {
  const { enabled = true, onTerminalStatus, ...statusInput } = input;
  const statusFn = useServerFn(getDocumentStatus);

  return useQuery<DocumentStatusResult, Error>({
    queryKey: queryKeys.documents.status(statusInput.orderId, statusInput.documentType),
    queryFn: async () => {
      const result = await statusFn({ data: statusInput });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 5 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling if completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        onTerminalStatus?.(data);
        return false;
      }
      // Poll every 2 seconds while pending/generating
      return 2000;
    },
    refetchIntervalInBackground: true,
  });
}
