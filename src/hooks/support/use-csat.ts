/**
 * CSAT (Customer Satisfaction) Hooks
 *
 * TanStack Query hooks for CSAT feedback management.
 *
 * @see src/server/functions/customers/csat-responses.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005a
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
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
    queryFn: async () => {
      try {
        return await getIssueFeedback({
          data: { issueId }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'nullable-by-design',
          fallbackMessage: 'Issue feedback is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
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
    queryFn: async () => {
      try {
        return await listFeedback({
          data: {
            ...filters,
            page: page ?? 1,
            pageSize: pageSize ?? 20,
            sortBy: sortBy ?? 'submittedAt',
            sortOrder: sortOrder ?? 'desc',
          },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Feedback history is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
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
    queryFn: async () => {
      try {
        return await getCsatMetrics({ data: filters });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'CSAT metrics are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
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
    queryFn: async () => {
      try {
        return await validateFeedbackToken({
          data: { token }
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Feedback link validation is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!token,
    retry: false,
  });
}

export function useSubmitPublicFeedback() {
  return useMutation({
    mutationFn: (data: SubmitPublicFeedbackInput) => submitPublicFeedback({ data }),
  });
}
