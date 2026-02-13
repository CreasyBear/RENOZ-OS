/**
 * Synchronous Project Document Generation Hooks
 *
 * TanStack Query hooks for generating project PDF documents immediately.
 * Returns the PDF URL directly for immediate download.
 *
 * @example
 * ```tsx
 * // Generate work order PDF
 * const { mutate: generateWorkOrder, isPending } = useGenerateWorkOrder();
 * const result = await generateWorkOrder({ projectId: '...' });
 * // result.url contains the PDF URL immediately
 *
 * // Generate completion certificate PDF
 * const { mutate: generateCertificate } = useGenerateCompletionCertificate();
 * generateCertificate({ projectId: '...', technicianName: 'John Smith' });
 * ```
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  generateProjectWorkOrderPdf,
  generateProjectCompletionCertificatePdf,
  generateProjectDocument,
} from '@/server/functions/documents';

// ============================================================================
// TYPES
// ============================================================================

export type ProjectDocumentType = 'work-order' | 'completion-certificate' | 'handover-pack';

export interface GenerateProjectDocumentResult {
  projectId: string;
  documentType: ProjectDocumentType;
  status: 'completed';
  url: string;
  filename: string;
  storagePath: string;
  fileSize: number;
  checksum: string;
}

export interface GenerateWorkOrderInput {
  projectId: string;
  scheduledDate?: string;
  scheduledTimeWindow?: string;
  estimatedDuration?: string;
  technicianId?: string;
  technicianName?: string;
  safetyNotes?: string;
  technicianNotes?: string;
  regenerate?: boolean;
}

export interface GenerateCompletionCertificateInput {
  projectId: string;
  technicianName?: string;
  regenerate?: boolean;
}

// ============================================================================
// GENERIC PROJECT DOCUMENT GENERATION
// ============================================================================

/**
 * Generate any project document type synchronously.
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useGenerateProjectDocument();
 *
 * mutate(
 *   { projectId: '...', documentType: 'work-order' },
 *   {
 *     onSuccess: (result) => {
 *       window.open(result.url, '_blank');
 *     },
 *   }
 * );
 * ```
 */
export function useGenerateProjectDocument() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateProjectDocument);

  return useMutation<GenerateProjectDocumentResult, Error, {
    projectId: string;
    documentType: ProjectDocumentType;
    regenerate?: boolean;
    scheduledDate?: string;
    scheduledTimeWindow?: string;
    estimatedDuration?: string;
    technicianId?: string;
    technicianName?: string;
    safetyNotes?: string;
    technicianNotes?: string;
  }>({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      // Invalidate project detail to reflect new state
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(result.projectId),
      });
      // Invalidate document history so Documents tab updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history('project', result.projectId),
      });
    },
  });
}

// ============================================================================
// WORK ORDER GENERATION
// ============================================================================

/**
 * Generate Work Order PDF for a project synchronously.
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useGenerateWorkOrder();
 *
 * <Button
 *   onClick={() => mutate({ projectId, technicianName: 'John Smith' })}
 *   disabled={isPending}
 * >
 *   {isPending ? 'Generating...' : 'Generate Work Order'}
 * </Button>
 *
 * {data?.url && <a href={data.url} target="_blank">Download Work Order</a>}
 * ```
 */
export function useGenerateWorkOrder() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateProjectWorkOrderPdf);

  return useMutation<GenerateProjectDocumentResult, Error, GenerateWorkOrderInput>({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(result.projectId),
      });
      // Also invalidate document history so Documents tab updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history('project', result.projectId),
      });
    },
  });
}

// ============================================================================
// COMPLETION CERTIFICATE GENERATION
// ============================================================================

/**
 * Generate Completion Certificate PDF for a project synchronously.
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useGenerateCompletionCertificate();
 *
 * <Button
 *   onClick={() => mutate({ projectId, technicianName: 'John Smith' })}
 *   disabled={isPending}
 * >
 *   {isPending ? 'Generating...' : 'Generate Certificate'}
 * </Button>
 *
 * {data?.url && <a href={data.url} target="_blank">Download Certificate</a>}
 * ```
 */
export function useGenerateCompletionCertificate() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateProjectCompletionCertificatePdf);

  return useMutation<GenerateProjectDocumentResult, Error, GenerateCompletionCertificateInput>({
    mutationFn: (input) => generateFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(result.projectId),
      });
      // Also invalidate document history so Documents tab updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.history('project', result.projectId),
      });
    },
  });
}
