/**
 * Job Costing TanStack Query Hook
 *
 * Provides data fetching for job costing reports.
 *
 * @see src/server/functions/job-costing.ts
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-008b
 */

import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  calculateJobCost,
  getJobProfitability,
  getJobCostingReport,
} from '@/server/functions/jobs/job-costing';
import type {
  CalculateJobCostInput,
  GetJobProfitabilityInput,
  GetJobCostingReportInput,
} from '@/lib/schemas';

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// CALCULATE JOB COST
// ============================================================================

/**
 * Hook for calculating a job's total cost.
 */
export function useJobCost(options: CalculateJobCostInput | undefined) {
  const calculateFn = useServerFn(calculateJobCost);

  return useQuery({
    queryKey: queryKeys.jobCosting.cost(options?.jobId ?? ''),
    queryFn: () => calculateFn({ data: options! }),
    enabled: !!options?.jobId,
  });
}

// ============================================================================
// GET JOB PROFITABILITY
// ============================================================================

/**
 * Hook for fetching a job's profitability analysis.
 */
export function useJobProfitability(options: GetJobProfitabilityInput | undefined) {
  const profitabilityFn = useServerFn(getJobProfitability);

  return useQuery({
    queryKey: queryKeys.jobCosting.job(options?.jobId ?? ''),
    queryFn: () => profitabilityFn({ data: options! }),
    enabled: !!options?.jobId,
  });
}

// ============================================================================
// GET JOB COSTING REPORT
// ============================================================================

/**
 * Hook for fetching the job costing report.
 */
export function useJobCostingReport(options: GetJobCostingReportInput) {
  const reportFn = useServerFn(getJobCostingReport);

  return useQuery({
    queryKey: queryKeys.jobCosting.report(options),
    queryFn: () => reportFn({ data: options }),
  });
}
