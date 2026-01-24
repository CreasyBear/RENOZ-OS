/**
 * Job Batch Operations Hooks
 *
 * TanStack Query hooks for job batch operations.
 * Provides mutation hooks for processing multiple job operations in batches.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { processJobBatchOperations } from '@/server/functions/jobs/job-batch-operations';
import type {
  ProcessJobBatchInput,
  ProcessJobBatchResult,
} from '@/server/functions/jobs/job-batch-operations';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook for processing job batch operations
 */
export function useProcessJobBatchOperations() {
  const queryClient = useQueryClient();
  const processBatchFn = useServerFn(processJobBatchOperations);

  return useMutation({
    mutationFn: (input: ProcessJobBatchInput) => processBatchFn({ data: input }),
    onSuccess: (_result: ProcessJobBatchResult) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobTasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobAssignments.all });
    },
  });
}
