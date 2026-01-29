/**
 * Synchronous Order Document Generation Hooks
 *
 * TanStack Query hooks for generating order PDF documents immediately.
 * Unlike the async Trigger.dev approach, these return the PDF URL directly.
 *
 * @example
 * ```tsx
 * // Generate quote PDF
 * const { mutate: generateQuote, isPending } = useGenerateOrderQuote();
 * const result = await generateQuote({ orderId: '...' });
 * // result.url contains the PDF URL immediately
 *
 * // Generate invoice PDF
 * const { mutate: generateInvoice } = useGenerateOrderInvoice();
 * generateInvoice({ orderId: '...', dueDate: '...' });
 *
 * // Generate packing slip
 * const { mutate: generatePackingSlip } = useGenerateOrderPackingSlip();
 * generatePackingSlip({ orderId: '...', carrier: 'DHL' });
 * ```
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  generateOrderQuotePdf,
  generateOrderInvoicePdf,
  generateOrderPackingSlipPdf,
  generateOrderDeliveryNotePdf,
  generateOrderDocument,
} from '@/server/functions/documents/generate-documents-sync';

// ============================================================================
// TYPES
// ============================================================================

export type OrderDocumentType = 'quote' | 'invoice' | 'packing-slip' | 'delivery-note';

export interface GenerateOrderDocumentResult {
  orderId: string;
  documentType: OrderDocumentType;
  status: 'completed';
  url: string;
  filename: string;
  storagePath: string;
  fileSize: number;
  checksum: string;
}

export interface GenerateOrderQuoteInput {
  orderId: string;
  regenerate?: boolean;
}

export interface GenerateOrderInvoiceInput {
  orderId: string;
  dueDate?: string;
  regenerate?: boolean;
}

export interface GenerateOrderPackingSlipInput {
  orderId: string;
  shipDate?: string;
  shippingMethod?: string;
  carrier?: string;
  specialInstructions?: string;
  packageCount?: number;
  totalWeight?: number;
}

export interface GenerateOrderDeliveryNoteInput {
  orderId: string;
  shipDate?: string;
  carrier?: string;
}

// ============================================================================
// GENERIC DOCUMENT GENERATION
// ============================================================================

/**
 * Generate any order document type synchronously.
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useGenerateOrderDocument();
 *
 * mutate(
 *   { orderId: '...', documentType: 'quote' },
 *   {
 *     onSuccess: (result) => {
 *       window.open(result.url, '_blank');
 *     },
 *   }
 * );
 * ```
 */
export function useGenerateOrderDocument() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateOrderDocument);

  return useMutation<GenerateOrderDocumentResult, Error, {
    orderId: string;
    documentType: OrderDocumentType;
    regenerate?: boolean;
    dueDate?: string;
    shipDate?: string;
    shippingMethod?: string;
    carrier?: string;
    specialInstructions?: string;
    packageCount?: number;
    totalWeight?: number;
  }>({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      // Invalidate order detail to reflect new PDF URLs
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(result.orderId),
      });
    },
  });
}

// ============================================================================
// QUOTE GENERATION
// ============================================================================

/**
 * Generate Quote PDF for an order synchronously.
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useGenerateOrderQuote();
 *
 * <Button
 *   onClick={() => mutate({ orderId })}
 *   disabled={isPending}
 * >
 *   {isPending ? 'Generating...' : 'Generate Quote PDF'}
 * </Button>
 *
 * {data?.url && <a href={data.url} target="_blank">Download Quote</a>}
 * ```
 */
export function useGenerateOrderQuote() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateOrderQuotePdf);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderQuoteInput>({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(result.orderId),
      });
    },
  });
}

// ============================================================================
// INVOICE GENERATION
// ============================================================================

/**
 * Generate Invoice PDF for an order synchronously.
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useGenerateOrderInvoice();
 *
 * mutate({
 *   orderId: '...',
 *   dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
 * });
 * ```
 */
export function useGenerateOrderInvoice() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateOrderInvoicePdf);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderInvoiceInput>({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(result.orderId),
      });
    },
  });
}

// ============================================================================
// PACKING SLIP GENERATION
// ============================================================================

/**
 * Generate Packing Slip PDF for an order synchronously.
 *
 * @example
 * ```tsx
 * const { mutate } = useGenerateOrderPackingSlip();
 *
 * mutate({
 *   orderId: '...',
 *   carrier: 'DHL',
 *   shippingMethod: 'Express',
 *   packageCount: 2,
 * });
 * ```
 */
export function useGenerateOrderPackingSlip() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateOrderPackingSlipPdf);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderPackingSlipInput>({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(result.orderId),
      });
    },
  });
}

// ============================================================================
// DELIVERY NOTE GENERATION
// ============================================================================

/**
 * Generate Delivery Note PDF for an order synchronously.
 *
 * @example
 * ```tsx
 * const { mutate } = useGenerateOrderDeliveryNote();
 *
 * mutate({
 *   orderId: '...',
 *   carrier: 'FedEx',
 * });
 * ```
 */
export function useGenerateOrderDeliveryNote() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateOrderDeliveryNotePdf);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderDeliveryNoteInput>({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(result.orderId),
      });
    },
  });
}
