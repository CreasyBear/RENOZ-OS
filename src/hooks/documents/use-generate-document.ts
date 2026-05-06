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
import { isReadQueryError, normalizeReadQueryError } from '@/lib/read-path-policy';
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

export interface DocumentGenerationStartResult {
  success: true;
  orderId: string;
  message: string;
}

type UnknownRecord = Record<string, unknown>;

async function unwrapServerFnResult(value: unknown): Promise<unknown> {
  if (value instanceof Response) {
    const contentType = value.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return unwrapServerFnResult(await value.json());
    }
    throw new Error('Document generation returned a non-JSON response');
  }

  if (!value || typeof value !== 'object') return value;

  const record = value as UnknownRecord;
  if ('result' in record && record.result !== value) {
    return unwrapServerFnResult(record.result);
  }
  if ('data' in record && record.data !== value) {
    return unwrapServerFnResult(record.data);
  }

  return value;
}

async function normalizeDocumentGenerationStartResult(
  value: unknown,
  fallback: { orderId: string }
): Promise<DocumentGenerationStartResult> {
  const candidate = await unwrapServerFnResult(value);
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Document generation returned an invalid response');
  }

  const record = candidate as UnknownRecord;

  return {
    success: true,
    orderId: typeof record.orderId === 'string' ? record.orderId : fallback.orderId,
    message:
      typeof record.message === 'string'
        ? record.message
        : 'Document PDF generation started',
  };
}

async function normalizeDocumentStatusResult(
  value: unknown,
  fallback: DocumentStatusInput
): Promise<DocumentStatusResult> {
  const candidate = await unwrapServerFnResult(value);
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Document status returned an invalid response');
  }

  const record = candidate as UnknownRecord;
  const status = record.status;
  if (
    status !== 'pending' &&
    status !== 'generating' &&
    status !== 'completed' &&
    status !== 'failed'
  ) {
    throw new Error('Document status returned an invalid response');
  }

  return {
    orderId: typeof record.orderId === 'string' ? record.orderId : fallback.orderId,
    documentType:
      typeof record.documentType === 'string' ? record.documentType : fallback.documentType,
    status,
    url: typeof record.url === 'string' ? record.url : null,
  };
}

function invalidateAsyncDocumentViews(
  queryClient: ReturnType<typeof useQueryClient>,
  params: DocumentStatusInput
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.orders.detail(params.orderId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.documents.history('order', params.orderId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.documents.status(params.orderId, params.documentType),
  });
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

  return useMutation<DocumentGenerationStartResult, Error, GenerateQuoteInput>({
    mutationFn: async (input) =>
      normalizeDocumentGenerationStartResult(await generateFn({ data: input }), {
        orderId: input.orderId,
      }),
    onSuccess: (result, variables) => {
      invalidateAsyncDocumentViews(queryClient, {
        orderId: result.orderId || variables.orderId,
        documentType: 'quote',
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

  return useMutation<DocumentGenerationStartResult, Error, GenerateInvoiceInput>({
    mutationFn: async (input) =>
      normalizeDocumentGenerationStartResult(await generateFn({ data: input }), {
        orderId: input.orderId,
      }),
    onSuccess: (result, variables) => {
      invalidateAsyncDocumentViews(queryClient, {
        orderId: result.orderId || variables.orderId,
        documentType: 'invoice',
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
      try {
        return await normalizeDocumentStatusResult(await statusFn({ data: input }), input);
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Document status is temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested order could not be found.',
        });
      }
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
      try {
        return await normalizeDocumentStatusResult(
          await statusFn({ data: statusInput }),
          statusInput
        );
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Document status is temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested order could not be found.',
        });
      }
    },
    enabled,
    staleTime: 5 * 1000,
    refetchInterval: (query) => {
      const queryError = query.state.error;
      if (isReadQueryError(queryError) && queryError.failureKind === 'not-found') {
        return false;
      }

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
