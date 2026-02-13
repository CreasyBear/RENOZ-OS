/**
 * Job Documents Hooks
 *
 * TanStack Query hooks for job document management:
 * - Document listing and fetching
 * - Document upload
 * - Document deletion
 *
 * @see src/server/functions/jobs/job-documents.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  uploadJobDocument,
  listJobDocuments,
  deleteJobDocument,
} from '@/server/functions/jobs/job-documents';

// ============================================================================
// TYPES
// ============================================================================

export interface UseJobDocumentsOptions {
  jobAssignmentId: string;
  enabled?: boolean;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch documents for a job assignment.
 */
export function useJobDocuments(options: UseJobDocumentsOptions) {
  const { jobAssignmentId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.jobDocuments.list(jobAssignmentId),
    queryFn: async () => {
      const result = await listJobDocuments({
        data: { jobAssignmentId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!jobAssignmentId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export interface UploadJobDocumentInput {
  jobAssignmentId: string;
  file: File;
  type: string;
  caption?: string;
}

/**
 * Upload a document for a job assignment.
 */
export function useUploadJobDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadJobDocumentInput) =>
      uploadJobDocument({
        data: {
          jobAssignmentId: input.jobAssignmentId,
          file: input.file,
          type: input.type,
          caption: input.caption,
        },
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobDocuments.list(variables.jobAssignmentId),
      });
    },
  });
}

export interface DeleteJobDocumentInput {
  documentId: string;
  jobAssignmentId: string;
}

/**
 * Delete a document from a job assignment.
 */
export function useDeleteJobDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteJobDocumentInput) =>
      deleteJobDocument({
        data: {
          documentId: input.documentId,
          jobAssignmentId: input.jobAssignmentId,
        },
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobDocuments.list(variables.jobAssignmentId),
      });
    },
  });
}
