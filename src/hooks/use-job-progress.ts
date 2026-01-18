/**
 * Job Progress Hook
 *
 * Provides real-time job progress updates via polling.
 * Automatically stops polling when job completes or fails.
 *
 * @see _Initiation/_prd/1-foundation/notifications/notifications.prd.json CC-NOTIFY-008b
 */

import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { getJobStatus, getActiveJobs } from "@/server/jobs";
import type { Job, JobStatus } from "@/../drizzle/schema/jobs";
import { toast } from "sonner";

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
  const [job, setJob] = React.useState<Job | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const previousStatusRef = React.useRef<JobStatus | null>(null);
  const isMountedRef = React.useRef(true);
  const consecutiveErrorsRef = React.useRef(0);
  const currentIntervalRef = React.useRef(pollInterval);
  const getJobStatusFn = useServerFn(getJobStatus);

  // Track mount state to prevent setState after unmount
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isActive = job?.status === "pending" || job?.status === "running";

  const fetchJob = React.useCallback(async () => {
    try {
      const result = await getJobStatusFn({ data: { jobId } });

      // Guard against setState after unmount
      if (!isMountedRef.current) return;

      // Reset backoff on success
      consecutiveErrorsRef.current = 0;
      currentIntervalRef.current = pollInterval;

      setJob(result);
      setError(null);

      // Call progress callback
      onProgress?.(result);

      // Check for status changes
      const previousStatus = previousStatusRef.current;
      if (previousStatus && previousStatus !== result.status) {
        if (result.status === "completed") {
          onComplete?.(result);
          if (showCompletionToast) {
            toast.success(`${result.name} completed successfully`);
          }
        } else if (result.status === "failed") {
          const metadata = result.metadata as { error?: { message?: string } } | null;
          const errorMessage = metadata?.error?.message;
          onError?.(result, errorMessage);
          if (showCompletionToast) {
            toast.error(`${result.name} failed`, {
              description: errorMessage,
            });
          }
        }
      }
      previousStatusRef.current = result.status;
    } catch (err) {
      if (!isMountedRef.current) return;

      // Exponential backoff on error (max 30s)
      consecutiveErrorsRef.current += 1;
      const backoffMs = Math.min(
        pollInterval * Math.pow(2, consecutiveErrorsRef.current),
        30000
      );
      currentIntervalRef.current = backoffMs;

      setError(err instanceof Error ? err : new Error("Failed to fetch job"));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [jobId, getJobStatusFn, onComplete, onError, onProgress, showCompletionToast, pollInterval]);

  // Initial fetch
  React.useEffect(() => {
    if (enabled) {
      fetchJob();
    }
  }, [enabled, fetchJob]);

  // Polling with dynamic interval (supports exponential backoff)
  React.useEffect(() => {
    if (!enabled || !isActive) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        fetchJob().then(() => {
          if (isMountedRef.current && enabled && isActive) {
            scheduleNext();
          }
        });
      }, currentIntervalRef.current);
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [enabled, isActive, fetchJob]);

  return {
    job,
    isLoading,
    error,
    isActive,
    refresh: fetchJob,
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
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const previousJobsRef = React.useRef<Map<string, JobStatus>>(new Map());
  const isMountedRef = React.useRef(true);
  const consecutiveErrorsRef = React.useRef(0);
  const currentIntervalRef = React.useRef(pollInterval);
  const getActiveJobsFn = useServerFn(getActiveJobs);
  const getJobStatusFn = useServerFn(getJobStatus);

  // Track mount state to prevent setState after unmount
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchJobs = React.useCallback(async () => {
    try {
      const result = await getActiveJobsFn();

      // Guard against setState after unmount
      if (!isMountedRef.current) return;

      // Reset backoff on success
      consecutiveErrorsRef.current = 0;
      currentIntervalRef.current = pollInterval;

      // Check for completed/failed jobs (they won't be in active list anymore)
      const currentIds = new Set(result.map((j) => j.id));
      const previousJobs = previousJobsRef.current;

      // Collect job IDs that need status lookup (throttle: max 3 concurrent)
      const jobsToCheck: string[] = [];
      previousJobs.forEach((status, id) => {
        if (!currentIds.has(id) && (status === "running" || status === "pending")) {
          jobsToCheck.push(id);
        }
      });

      // Throttled parallel fetch (max 3 concurrent requests)
      const MAX_CONCURRENT = 3;
      for (let i = 0; i < jobsToCheck.length; i += MAX_CONCURRENT) {
        const batch = jobsToCheck.slice(i, i + MAX_CONCURRENT);
        await Promise.allSettled(
          batch.map(async (id) => {
            try {
              const finalJob = await getJobStatusFn({ data: { jobId: id } });
              if (finalJob.status === "completed") {
                onJobComplete?.(finalJob);
              } else if (finalJob.status === "failed") {
                onJobError?.(finalJob);
              }
            } catch {
              // Job might have been deleted
            }
          })
        );
      }

      // Update previous jobs map
      const newMap = new Map<string, JobStatus>();
      result.forEach((job) => {
        newMap.set(job.id, job.status);
      });
      previousJobsRef.current = newMap;

      setJobs(result);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;

      // Exponential backoff on error (max 30s)
      consecutiveErrorsRef.current += 1;
      const backoffMs = Math.min(
        pollInterval * Math.pow(2, consecutiveErrorsRef.current),
        30000
      );
      currentIntervalRef.current = backoffMs;

      setError(err instanceof Error ? err : new Error("Failed to fetch jobs"));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getActiveJobsFn, getJobStatusFn, onJobComplete, onJobError, pollInterval]);

  // Initial fetch
  React.useEffect(() => {
    if (enabled) {
      fetchJobs();
    }
  }, [enabled, fetchJobs]);

  // Polling with dynamic interval (supports exponential backoff)
  React.useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        fetchJobs().then(() => {
          if (isMountedRef.current && enabled) {
            scheduleNext();
          }
        });
      }, currentIntervalRef.current);
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [enabled, fetchJobs]);

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
    error,
    refresh: fetchJobs,
    dismissJob,
  };
}
