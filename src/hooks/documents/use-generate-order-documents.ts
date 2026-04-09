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
import { type DocumentType } from '@/lib/documents/types';
import {
  generateOrderDocument,
  generateShipmentDocument,
} from '@/server/functions/documents/generate-documents-sync';

// ============================================================================
// TYPES
// ============================================================================

/** Backwards-compatible order document union for order-scoped generation. */
export type OrderDocumentType = Exclude<DocumentType, 'dispatch-note'>;

export interface GenerateOrderDocumentResult {
  orderId: string;
  documentType: DocumentType;
  status: 'completed';
  entityType?: 'order' | 'shipment';
  entityId?: string;
  shipmentId?: string;
  url: string;
  filename: string;
  storagePath: string;
  fileSize: number;
  checksum: string;
}

type UnknownRecord = Record<string, unknown>;

export interface GenerateOrderQuoteInput {
  orderId: string;
  regenerate?: boolean;
}

export interface GenerateOrderInvoiceInput {
  orderId: string;
  dueDate?: string;
  regenerate?: boolean;
}

export interface GenerateOrderProFormaInput {
  orderId: string;
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

export interface GenerateShipmentDocumentInput {
  shipmentId: string;
  regenerate?: boolean;
}

function invalidateOrderDocumentViews(queryClient: ReturnType<typeof useQueryClient>, orderId: string) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.documents.history('order', orderId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.orders.detail(orderId),
  });
}

function resolveOrderId(
  result: Pick<GenerateOrderDocumentResult, 'orderId'> | undefined,
  variables: { orderId: string }
) {
  return result?.orderId ?? variables.orderId;
}

function invalidateResolvedOrderDocumentViews(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string | undefined
) {
  if (!orderId) return;
  invalidateOrderDocumentViews(queryClient, orderId);
}

function resolveShipmentInvalidateId(
  result: Pick<GenerateOrderDocumentResult, 'shipmentId' | 'entityId'> | undefined,
  variables: { shipmentId: string }
) {
  return result?.shipmentId ?? result?.entityId ?? variables.shipmentId;
}

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

async function normalizeGeneratedDocumentResult(
  value: unknown,
  fallback: {
    orderId?: string;
    shipmentId?: string;
  }
): Promise<GenerateOrderDocumentResult> {
  const candidate = await unwrapServerFnResult(value);
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Document generation returned an invalid response');
  }

  const record = candidate as UnknownRecord;
  if (typeof record.url !== 'string' || typeof record.filename !== 'string') {
    throw new Error('Document generation returned an invalid response');
  }

  return {
    orderId: typeof record.orderId === 'string' ? record.orderId : fallback.orderId ?? '',
    documentType: record.documentType as DocumentType,
    status: 'completed',
    entityType:
      record.entityType === 'shipment' || record.entityType === 'order'
        ? record.entityType
        : undefined,
    entityId: typeof record.entityId === 'string' ? record.entityId : undefined,
    shipmentId:
      typeof record.shipmentId === 'string'
        ? record.shipmentId
        : typeof record.entityId === 'string'
          ? record.entityId
          : fallback.shipmentId,
    url: record.url,
    filename: record.filename,
    storagePath: typeof record.storagePath === 'string' ? record.storagePath : '',
    fileSize: typeof record.fileSize === 'number' ? record.fileSize : 0,
    checksum: typeof record.checksum === 'string' ? record.checksum : '',
  };
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
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(await generateFn({ data: input }), {
        orderId: input.orderId,
      }),
    onSuccess: (result, variables) => {
      invalidateResolvedOrderDocumentViews(queryClient, resolveOrderId(result, variables));
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
  const generateFn = useServerFn(generateOrderDocument);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderQuoteInput>({
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(
        await generateFn({ data: { ...input, documentType: 'quote' } }),
        { orderId: input.orderId }
      ),
    onSuccess: (result, variables) => {
      invalidateResolvedOrderDocumentViews(queryClient, resolveOrderId(result, variables));
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
  const generateFn = useServerFn(generateOrderDocument);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderInvoiceInput>({
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(
        await generateFn({ data: { ...input, documentType: 'invoice' } }),
        { orderId: input.orderId }
      ),
    onSuccess: (result, variables) => {
      invalidateResolvedOrderDocumentViews(queryClient, resolveOrderId(result, variables));
    },
  });
}

// ============================================================================
// PRO-FORMA INVOICE GENERATION
// ============================================================================

/**
 * Generate Pro-Forma Invoice PDF for an order synchronously.
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useGenerateOrderProForma();
 *
 * <Button
 *   onClick={() => mutate({ orderId })}
 *   disabled={isPending}
 * >
 *   {isPending ? 'Generating...' : 'Generate Pro-Forma'}
 * </Button>
 *
 * {data?.url && <a href={data.url} target="_blank">Download Pro-Forma</a>}
 * ```
 */
export function useGenerateOrderProForma() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateOrderDocument);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderProFormaInput>({
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(
        await generateFn({ data: { ...input, documentType: 'pro-forma' } }),
        { orderId: input.orderId }
      ),
    onSuccess: (result, variables) => {
      invalidateResolvedOrderDocumentViews(queryClient, resolveOrderId(result, variables));
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
  const generateFn = useServerFn(generateOrderDocument);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderPackingSlipInput>({
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(
        await generateFn({ data: { ...input, documentType: 'packing-slip' } }),
        { orderId: input.orderId }
      ),
    onSuccess: (result, variables) => {
      invalidateResolvedOrderDocumentViews(queryClient, resolveOrderId(result, variables));
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
  const generateFn = useServerFn(generateOrderDocument);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateOrderDeliveryNoteInput>({
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(
        await generateFn({ data: { ...input, documentType: 'delivery-note' } }),
        { orderId: input.orderId }
      ),
    onSuccess: (result, variables) => {
      invalidateResolvedOrderDocumentViews(queryClient, resolveOrderId(result, variables));
    },
  });
}

export function useGenerateShipmentPackingSlip() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateShipmentDocument);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateShipmentDocumentInput>({
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(
        await generateFn({ data: { ...input, documentType: 'packing-slip' } }),
        { shipmentId: input.shipmentId }
      ),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history(
          'shipment',
          resolveShipmentInvalidateId(result, variables)
        ),
      });
      invalidateResolvedOrderDocumentViews(queryClient, result?.orderId);
    },
  });
}

export function useGenerateShipmentDispatchNote() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateShipmentDocument);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateShipmentDocumentInput>({
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(
        await generateFn({ data: { ...input, documentType: 'dispatch-note' } }),
        { shipmentId: input.shipmentId }
      ),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history(
          'shipment',
          resolveShipmentInvalidateId(result, variables)
        ),
      });
      invalidateResolvedOrderDocumentViews(queryClient, result?.orderId);
    },
  });
}

export function useGenerateShipmentDeliveryNote() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateShipmentDocument);

  return useMutation<GenerateOrderDocumentResult, Error, GenerateShipmentDocumentInput>({
    mutationFn: async (input) =>
      normalizeGeneratedDocumentResult(
        await generateFn({ data: { ...input, documentType: 'delivery-note' } }),
        { shipmentId: input.shipmentId }
      ),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history(
          'shipment',
          resolveShipmentInvalidateId(result, variables)
        ),
      });
      invalidateResolvedOrderDocumentViews(queryClient, result?.orderId);
    },
  });
}
