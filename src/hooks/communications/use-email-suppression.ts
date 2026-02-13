/**
 * Email Suppression Hooks
 *
 * Query and mutation hooks for email suppression list management.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see INT-RES-003, INT-RES-005
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { QUERY_CONFIG } from "@/lib/constants";
import {
  getSuppressionList,
  isEmailSuppressed,
  checkSuppressionBatch,
  addSuppression,
  removeSuppression,
} from "@/server/functions/communications/email-suppression";
import type {
  SuppressionListFilters,
  AddSuppressionInput,
  RemoveSuppressionInput,
} from "@/lib/schemas/communications/email-suppression";

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseSuppressionListOptions extends Partial<SuppressionListFilters> {
  enabled?: boolean;
}

/**
 * Query suppression list with optional filters.
 * Supports pagination, search, and reason filtering.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSuppressionList({
 *   reason: 'bounce',
 *   page: 1,
 *   pageSize: 20,
 * });
 * ```
 */
export function useSuppressionList(options: UseSuppressionListOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.communications.emailSuppression.list(filters),
    queryFn: async () => {
      const result = await getSuppressionList({
        data: {
          reason: filters.reason,
          search: filters.search,
          includeDeleted: filters.includeDeleted ?? false,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 20,
          sortBy: filters.sortBy ?? "createdAt",
          sortOrder: filters.sortOrder ?? "desc",
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  });
}

export interface UseCheckSuppressionOptions {
  email: string;
  enabled?: boolean;
}

/**
 * Check if a single email is suppressed.
 *
 * @example
 * ```tsx
 * const { data } = useCheckSuppression({
 *   email: 'user@example.com',
 *   enabled: !!email,
 * });
 *
 * if (data?.isSuppressed) {
 *   console.log(`Suppressed: ${data.reason}`);
 * }
 * ```
 */
export function useCheckSuppression(options: UseCheckSuppressionOptions) {
  const { email, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.emailSuppression.check(email),
    queryFn: async () => {
      const result = await isEmailSuppressed({
        data: { email } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!email,
    staleTime: QUERY_CONFIG.STALE_TIME_MEDIUM,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Add an email to the suppression list.
 * Invalidates suppression list queries on success.
 *
 * @example
 * ```tsx
 * const { mutate: addToSuppression } = useAddSuppression();
 *
 * addToSuppression({
 *   email: 'user@example.com',
 *   reason: 'manual',
 *   metadata: { notes: 'Customer requested removal' },
 * });
 * ```
 */
export function useAddSuppression() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddSuppressionInput) =>
      addSuppression({ data: input }),
    onSuccess: (_, variables) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.emailSuppression.lists(),
      });

      // Invalidate check for this specific email
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.emailSuppression.check(
          variables.email.toLowerCase().trim()
        ),
      });
    },
  });
}

/**
 * Remove an email from the suppression list (soft delete).
 * Invalidates suppression list queries on success.
 *
 * @example
 * ```tsx
 * const { mutate: removeFromSuppression } = useRemoveSuppression();
 *
 * removeFromSuppression({
 *   id: 'uuid-here',
 *   reason: 'Customer re-opted in',
 * });
 * ```
 */
export function useRemoveSuppression() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveSuppressionInput) =>
      removeSuppression({ data: input }),
    onSuccess: () => {
      // Invalidate all suppression queries since we don't know the email
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.emailSuppression.all(),
      });
    },
  });
}

// ============================================================================
// BATCH CHECK (Non-hook utility for campaign sends)
// ============================================================================

/**
 * Batch check multiple emails for suppression.
 * Not a hook - call directly in campaign/scheduled email sends.
 *
 * @example
 * ```ts
 * const result = await batchCheckSuppression(['a@example.com', 'b@example.com']);
 * const validEmails = result.results.filter(r => !r.isSuppressed);
 * ```
 */
export async function batchCheckSuppression(emails: string[]) {
  return checkSuppressionBatch({ data: { emails } });
}
