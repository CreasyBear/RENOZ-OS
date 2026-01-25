/**
 * Automation Job Progress Hook
 *
 * Provides real-time job progress updates via TanStack Query polling.
 * Automatically stops polling when job completes or fails.
 *
 * @see _Initiation/_prd/1-foundation/notifications/notifications.prd.json CC-NOTIFY-008b
 */

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { getJobStatus, getActiveJobs } from '@/server/automation-jobs';
import type { Job, JobStatus } from 'drizzle/schema/automation-jobs';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface UseJobProgressOptions {
  /** Job ID to track */
  jobId: string;
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
  /** Whether to show toast on completion */
  showCompletionToast?: boolean;
  /** Callback when job completes successfully */
  onComplete?: (job: Job) => void;
  /** Callback when job fails */
  onError?: (job: Job, error?: string) => void;
  /** Callback on each progress update */
  onProgress?: (job: Job) => void;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

export interface UseJobProgressReturn {
  /** Current job data */
  job: Job | null;
  /** Whether the job is loading initially */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Whether the job is still active (pending or running) */
  isActive: boolean;
  /** Manually refresh job status */
  refresh: () => Promise<void>;
}

export interface UseActiveJobsOptions {
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Callback when any job completes */
  onJobComplete?: (job: Job) => void;
  /** Callback when any job fails */
  onJobError?: (job: Job) => void;
}

export interface UseActiveJobsReturn {
  /** List of active jobs */
  jobs: Job[];
  /** Whether jobs are loading initially */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Manually refresh job list */
  refresh: () => Promise<void>;
  /** Dismiss a job from the list (doesn't cancel it) */
  dismissJob: (jobId: string) => void;
}

// ============================================================================
// SINGLE JOB PROGRESS HOOK
// ============================================================================

export function useJobProgress({
  jobId,
  pollInterval = 2000,
  showCompletionToast = true,
  onComplete,
  onError,
  onProgress,
  enabled = true,
}: UseJobProgressOptions): UseJobProgressReturn {
  const queryClient = useQueryClient();
  const getJobStatusFn = useServerFn(getJobStatus);
  const previousStatusRef = React.useRef<JobStatus | null>(null);
  const consecutiveErrorsRef = React.useRef(0);

  const query = useQuery({
    queryKey: queryKeys.jobProgress.status(jobId),
    queryFn: async () => {
      try {
        const result = await getJobStatusFn({ data: { jobId } });
        // Reset backoff on success
        consecutiveErrorsRef.current = 0;
        return result;
      } catch (err) {
        // Exponential backoff on error (max 30s)
        consecutiveErrorsRef.current += 1;
        throw err;
      }
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      // Stop polling if job is completed or failed
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      // Use exponential backoff on errors
      if (query.state.status === 'error') {
        return Math.min(pollInterval * Math.pow(2, consecutiveErrorsRef.current), 30000);
      }
      // Normal polling interval for active jobs
      return pollInterval;
    },
    refetchIntervalInBackground: true,
    staleTime: 0, // Always refetch for real-time updates
  });

  const { data: job, isLoading, error } = query;
  const isActive = job?.status === 'pending' || job?.status === 'running';

  // Handle status changes and callbacks
  React.useEffect(() => {
    if (!job) return;

    const previousStatus = previousStatusRef.current;
    if (previousStatus && previousStatus !== job.status) {
      // Call progress callback for any status update
      onProgress?.(job);

      if (job.status === 'completed') {
        onComplete?.(job);
        if (showCompletionToast) {
          toast.success(`${job.name} completed successfully`);
        }
      } else if (job.status === 'failed') {
        const metadata = job.metadata as { error?: { message?: string } } | null;
        const errorMessage = metadata?.error?.message;
        onError?.(job, errorMessage);
        if (showCompletionToast) {
          toast.error(`${job.name} failed`, {
            description: errorMessage,
          });
        }
      }
    }
    previousStatusRef.current = job.status;
  }, [job, onComplete, onError, onProgress, showCompletionToast]);

  return {
    job: job ?? null,
    isLoading,
    error: error as Error | null,
    isActive,
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobProgress.status(jobId) }),
  };
}

// ============================================================================
// ACTIVE JOBS LIST HOOK
// ============================================================================

export function useActiveJobs({
  pollInterval = 5000,
  enabled = true,
  onJobComplete,
  onJobError,
}: UseActiveJobsOptions = {}): UseActiveJobsReturn {
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [consecutiveErrors, setConsecutiveErrors] = React.useState(0);
  const getActiveJobsFn = useServerFn(getActiveJobs);
  const getJobStatusFn = useServerFn(getJobStatus);
  const previousJobsRef = React.useRef<Map<string, JobStatus>>(new Map());

  const query = useQuery({
    queryKey: queryKeys.jobProgress.active(),
    queryFn: async () => {
      try {
        const result = await getActiveJobsFn();
        setConsecutiveErrors(0); // Reset on success
        return result;
      } catch (err) {
        setConsecutiveErrors((prev) => prev + 1);
        throw err;
      }
    },
    enabled,
    refetchInterval: (query) => {
      // Use exponential backoff on errors
      if (query.state.status === 'error') {
        return Math.min(pollInterval * Math.pow(2, consecutiveErrors), 30000);
      }
      return pollInterval;
    },
    refetchIntervalInBackground: true,
    staleTime: pollInterval / 2, // Refetch halfway through the interval
  });

  const { data: jobs = [], isLoading, error } = query;

  // Detect completed/failed jobs and call callbacks
  React.useEffect(() => {
    if (!jobs.length) return;

    const currentIds = new Set(jobs.map((j) => j.id));
    const previousJobs = previousJobsRef.current;

    // Find jobs that were previously active but are no longer in the active list
    const completedJobIds: string[] = [];
    previousJobs.forEach((status, id) => {
      if (!currentIds.has(id) && (status === 'running' || status === 'pending')) {
        completedJobIds.push(id);
      }
    });

    // Check final status of completed jobs
    if (completedJobIds.length > 0) {
      completedJobIds.forEach(async (jobId) => {
        try {
          const finalJob = await getJobStatusFn({ data: { jobId } });
          if (finalJob.status === 'completed') {
            onJobComplete?.(finalJob);
          } else if (finalJob.status === 'failed') {
            onJobError?.(finalJob);
          }
        } catch {
          // Job might have been deleted
        }
      });
    }

    // Update previous jobs map
    const newMap = new Map<string, JobStatus>();
    jobs.forEach((job) => newMap.set(job.id, job.status));
    previousJobsRef.current = newMap;
  }, [jobs, onJobComplete, onJobError, getJobStatusFn]);

  const dismissJob = React.useCallback((jobId: string) => {
    setDismissedIds((prev) => new Set([...prev, jobId]));
  }, []);

  // Filter out dismissed jobs
  const visibleJobs = React.useMemo(
    () => jobs.filter((job) => !dismissedIds.has(job.id)),
    [jobs, dismissedIds]
  );

  return {
    jobs: visibleJobs,
    isLoading,
    error: error as Error | null,
    refresh: async () => {
      await query.refetch();
    },
    dismissJob,
  };
}
