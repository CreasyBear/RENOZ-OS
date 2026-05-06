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

type UnknownRecord = Record<string, unknown>;

async function unwrapServerFnResult(value: unknown): Promise<unknown> {
  if (value instanceof Response) {
    const contentType = value.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return unwrapServerFnResult(await value.json());
    }
    throw new Error('Project document generation returned a non-JSON response');
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

async function normalizeProjectDocumentResult(
  value: unknown,
  fallback: { projectId: string }
): Promise<GenerateProjectDocumentResult> {
  const candidate = await unwrapServerFnResult(value);
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Project document generation returned an invalid response');
  }

  const record = candidate as UnknownRecord;
  if (typeof record.url !== 'string' || typeof record.filename !== 'string') {
    throw new Error('Project document generation returned an invalid response');
  }

  return {
    projectId: typeof record.projectId === 'string' ? record.projectId : fallback.projectId,
    documentType: record.documentType as ProjectDocumentType,
    status: 'completed',
    url: record.url,
    filename: record.filename,
    storagePath: typeof record.storagePath === 'string' ? record.storagePath : '',
    fileSize: typeof record.fileSize === 'number' ? record.fileSize : 0,
    checksum: typeof record.checksum === 'string' ? record.checksum : '',
  };
}

function invalidateProjectDocumentViews(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string | undefined
) {
  if (!projectId) return;
  queryClient.invalidateQueries({
    queryKey: queryKeys.projects.detail(projectId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.documents.history('project', projectId),
  });
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
    mutationFn: async (input) =>
      normalizeProjectDocumentResult(await generateFn({ data: input }), {
        projectId: input.projectId,
      }),
    onSuccess: (result, variables) => {
      invalidateProjectDocumentViews(queryClient, result.projectId || variables.projectId);
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
    mutationFn: async (input) =>
      normalizeProjectDocumentResult(await generateFn({ data: input }), {
        projectId: input.projectId,
      }),
    onSuccess: (result, variables) => {
      invalidateProjectDocumentViews(queryClient, result.projectId || variables.projectId);
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
    mutationFn: async (input) =>
      normalizeProjectDocumentResult(await generateFn({ data: input }), {
        projectId: input.projectId,
      }),
    onSuccess: (result, variables) => {
      invalidateProjectDocumentViews(queryClient, result.projectId || variables.projectId);
    },
  });
}
