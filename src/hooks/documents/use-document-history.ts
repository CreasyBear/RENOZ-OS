/**
 * Document History Hooks
 *
 * TanStack Query hooks for fetching document history for entities.
 * Shows previously generated documents with download links.
 *
 * @example
 * ```tsx
 * // Get document history for an order
 * const { data, isLoading } = useDocumentHistory({
 *   entityType: 'order',
 *   entityId: orderId,
 * });
 *
 * // Display the documents
 * {data?.documents.map(doc => (
 *   <a href={doc.storageUrl} target="_blank">{doc.filename}</a>
 * ))}
 * ```
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGeneratedDocuments } from '@/server/functions/documents/get-generated-documents';
import { queryKeys } from '@/lib/query-keys';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentEntityType = 'order' | 'warranty' | 'job' | 'opportunity' | 'project';

export type DocumentType =
  | 'quote'
  | 'invoice'
  | 'delivery-note'
  | 'work-order'
  | 'warranty-certificate'
  | 'completion-certificate';

export interface GeneratedDocument {
  id: string;
  organizationId: string;
  documentType: DocumentType;
  entityType: DocumentEntityType;
  entityId: string;
  filename: string;
  storageUrl: string;
  fileSize: number | null;
  generatedAt: Date | string;
  generatedById: string | null;
  createdAt?: Date | string;
}

export interface DocumentHistoryFilters {
  entityType: DocumentEntityType;
  entityId: string;
  documentType?: DocumentType;
  limit?: number;
  offset?: number;
}

export interface DocumentHistoryResult {
  documents: GeneratedDocument[];
  total: number;
}

// ============================================================================
// SERVER FUNCTION WRAPPER
// ============================================================================

/**
 * Wrapper to call the server function with proper typing.
 */
async function fetchDocumentHistory(
  filters: DocumentHistoryFilters
): Promise<DocumentHistoryResult> {
  const result = await getGeneratedDocuments({
    data: {
      entityType: filters.entityType,
      entityId: filters.entityId,
      documentType: filters.documentType,
      limit: filters.limit ?? 20,
      cursor: filters.offset?.toString(), // Using offset as cursor for simple pagination
      sortOrder: 'desc',
    },
  });

  // Transform server response to hook's expected format
  return {
    documents: result.items.map((item) => ({
      ...item,
      documentType: item.documentType as DocumentType,
      entityType: item.entityType as DocumentEntityType,
      generatedAt: item.generatedAt instanceof Date 
        ? item.generatedAt.toISOString() 
        : item.generatedAt,
      createdAt: item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : item.createdAt,
    })),
    total: result.items.length, // Note: This is the page total, not full total
  };
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch document history for an entity.
 *
 * Returns a list of previously generated documents with their
 * download URLs, file sizes, and generation dates.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useDocumentHistory({
 *   entityType: 'order',
 *   entityId: orderId,
 * });
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return (
 *   <ul>
 *     {data.documents.map(doc => (
 *       <li key={doc.id}>
 *         <a href={doc.storageUrl}>{doc.filename}</a>
 *         <span>{formatFileSize(doc.fileSize)}</span>
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useDocumentHistory(filters: DocumentHistoryFilters) {
  return useQuery({
    queryKey: queryKeys.documents.history(filters.entityType, filters.entityId, filters.documentType),
    queryFn: async () => {
      const result = await fetchDocumentHistory(filters);
      if (result == null) throw new Error('Document history returned no data');
      return result;
    },
    enabled: !!filters.entityId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get the latest document of a specific type for an entity.
 *
 * Useful for checking if a document already exists before generating a new one.
 *
 * @example
 * ```tsx
 * const { data: latestQuote } = useLatestDocument({
 *   entityType: 'order',
 *   entityId: orderId,
 *   documentType: 'quote',
 * });
 *
 * const hasExistingQuote = !!latestQuote;
 * ```
 */
export function useLatestDocument(filters: {
  entityType: DocumentEntityType;
  entityId: string;
  documentType: DocumentType;
}) {
  const { data } = useDocumentHistory({
    ...filters,
    limit: 1,
  });

  return {
    document: data?.documents[0] ?? null,
    hasDocument: (data?.documents.length ?? 0) > 0,
  };
}

/**
 * Invalidate document history cache.
 *
 * Call this after generating a new document to refresh the history list.
 *
 * @example
 * ```tsx
 * const invalidate = useInvalidateDocumentHistory();
 *
 * // After document generation
 * onSuccess: () => {
 *   invalidate({ entityType: 'order', entityId: orderId });
 * }
 * ```
 */
export function useInvalidateDocumentHistory() {
  const queryClient = useQueryClient();

  return (filters: { entityType: DocumentEntityType; entityId: string }) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.documents.history(filters.entityType, filters.entityId),
    });
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format file size in human-readable format.
 *
 * @example
 * formatFileSize(1024) // '1 KB'
 * formatFileSize(1048576) // '1 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Get display name for document type.
 *
 * @example
 * getDocumentTypeLabel('quote') // 'Quote'
 * getDocumentTypeLabel('delivery-note') // 'Delivery Note'
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    quote: 'Quote',
    invoice: 'Invoice',
    'delivery-note': 'Delivery Note',
    'work-order': 'Work Order',
    'warranty-certificate': 'Warranty Certificate',
    'completion-certificate': 'Completion Certificate',
  };
  return labels[type] ?? type;
}
