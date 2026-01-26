/**
 * Win/Loss Reasons Hooks
 *
 * TanStack Query hooks for win/loss reason management:
 * - List reasons
 * - Create reason
 * - Update reason
 * - Delete reason
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listWinLossReasons,
  createWinLossReason,
  updateWinLossReason,
  deleteWinLossReason,
} from '@/server/functions/pipeline/win-loss-reasons';
import type { WinLossReasonType } from '@/lib/schemas/pipeline';

// ============================================================================
// TYPES
// ============================================================================

export interface WinLossReason {
  id: string;
  organizationId: string;
  name: string;
  type: WinLossReasonType;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface ReasonForm {
  name: string;
  type: WinLossReasonType;
  description: string;
  isActive: boolean;
}

export interface WinLossReasonsFilters {
  type?: WinLossReasonType;
  isActive?: boolean;
}

// ============================================================================
// LIST HOOK
// ============================================================================

export interface UseWinLossReasonsOptions {
  filters?: WinLossReasonsFilters;
  enabled?: boolean;
}

/**
 * Fetch all win/loss reasons for the organization.
 * Can filter by type (win or loss) and active status.
 */
export function useWinLossReasons({
  filters = {},
  enabled = true,
}: UseWinLossReasonsOptions = {}) {
  return useQuery({
    queryKey: [...queryKeys.settings.winLossReasons(), filters] as const,
    queryFn: () => listWinLossReasons({ data: filters }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new win/loss reason.
 * Requires admin permission.
 */
export function useCreateWinLossReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReasonForm) => createWinLossReason({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.winLossReasons() });
    },
  });
}

/**
 * Update an existing win/loss reason.
 * Requires admin permission.
 */
export function useUpdateWinLossReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReasonForm }) =>
      updateWinLossReason({ data: { id, data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.winLossReasons() });
    },
  });
}

/**
 * Delete a win/loss reason.
 * If the reason is in use, it will be soft-deleted (deactivated) instead.
 * Requires admin permission.
 */
export function useDeleteWinLossReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWinLossReason({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.winLossReasons() });
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { WinLossReasonType };
