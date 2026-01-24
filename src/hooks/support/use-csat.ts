/**
 * CSAT (Customer Satisfaction) Hooks
 *
 * TanStack Query hooks for CSAT feedback management.
 *
 * @see src/server/functions/customers/csat-responses.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005a
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  submitInternalFeedback,
  getIssueFeedback,
  listFeedback,
  getCsatMetrics,
  generateFeedbackToken,
  validateFeedbackToken,
  submitPublicFeedback,
} from '@/server/functions/customers/csat-responses';
import type {
  SubmitInternalFeedbackInput,
  ListFeedbackInput,
  GetCsatMetricsInput,
  GenerateFeedbackTokenInput,
  CsatSource,
  SubmitPublicFeedbackInput,
} from '@/lib/schemas/support/csat-responses';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// GET FEEDBACK FOR ISSUE
// ============================================================================

export interface UseIssueFeedbackOptions {
  issueId: string;
  enabled?: boolean;
}

export function useIssueFeedback({ issueId, enabled = true }: UseIssueFeedbackOptions) {
  return useQuery({
    queryKey: queryKeys.support.csatDetail(issueId),
    queryFn: () => getIssueFeedback({ data: { issueId } }),
    enabled: enabled && !!issueId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// LIST FEEDBACK
// ============================================================================

export interface UseFeedbackListOptions {
  issueId?: string;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  source?: CsatSource;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: ListFeedbackInput['sortBy'];
  sortOrder?: ListFeedbackInput['sortOrder'];
  enabled?: boolean;
}

export function useFeedbackList({
  issueId,
  rating,
  minRating,
  maxRating,
  source,
  startDate,
  endDate,
  page = 1,
  pageSize = 20,
  sortBy = 'submittedAt',
  sortOrder = 'desc',
  enabled = true,
}: UseFeedbackListOptions = {}) {
  const filters: Partial<ListFeedbackInput> = {
    issueId,
    rating,
    minRating,
    maxRating,
    source,
    startDate,
    endDate,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };

  return useQuery({
    queryKey: queryKeys.support.csatListFiltered(filters),
    queryFn: () =>
      listFeedback({
        data: {
          ...filters,
          page: page ?? 1,
          pageSize: pageSize ?? 20,
          sortBy: sortBy ?? 'submittedAt',
          sortOrder: sortOrder ?? 'desc',
        },
      }),
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// CSAT METRICS
// ============================================================================

export interface UseCsatMetricsOptions {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

export function useCsatMetrics({ startDate, endDate, enabled = true }: UseCsatMetricsOptions = {}) {
  const filters: Partial<GetCsatMetricsInput> = {
    startDate,
    endDate,
  };

  return useQuery({
    queryKey: queryKeys.support.csatMetricsWithFilters(filters),
    queryFn: () => getCsatMetrics({ data: filters }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// SUBMIT INTERNAL FEEDBACK MUTATION
// ============================================================================

export function useSubmitInternalFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitInternalFeedbackInput) => submitInternalFeedback({ data }),
    onSuccess: (result) => {
      // Update the issue-specific feedback cache
      queryClient.setQueryData(queryKeys.support.csatDetail(result.issueId), result);
      // Invalidate lists and metrics
      queryClient.invalidateQueries({ queryKey: queryKeys.support.csatList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.csatMetrics() });
    },
  });
}

// ============================================================================
// GENERATE FEEDBACK TOKEN MUTATION
// ============================================================================

export function useGenerateFeedbackToken() {
  return useMutation({
    mutationFn: (data: GenerateFeedbackTokenInput) => generateFeedbackToken({ data }),
  });
}

// ============================================================================
// PUBLIC FEEDBACK (Token-based)
// ============================================================================

export interface UseValidateFeedbackTokenOptions {
  token: string;
  enabled?: boolean;
}

export function useValidateFeedbackToken({
  token,
  enabled = true,
}: UseValidateFeedbackTokenOptions) {
  return useQuery({
    queryKey: queryKeys.support.csatToken(token),
    queryFn: () => validateFeedbackToken({ data: { token } }),
    enabled: enabled && !!token,
    retry: false,
  });
}

export function useSubmitPublicFeedback() {
  return useMutation({
    mutationFn: (data: SubmitPublicFeedbackInput) => submitPublicFeedback({ data }),
  });
}
