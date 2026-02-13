/**
 * Onboarding Progress Hook
 *
 * TanStack Query hooks for the Welcome Checklist onboarding component.
 *
 * @see src/components/domain/dashboard/welcome-checklist/
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  getOrganizationOnboardingProgress,
  dismissWelcomeChecklist,
} from '@/server/onboarding';

// ============================================================================
// TYPES
// ============================================================================

export interface UseOnboardingProgressOptions {
  enabled?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch onboarding progress for the welcome checklist.
 */
export function useOnboardingProgress({
  enabled = true,
}: UseOnboardingProgressOptions = {}) {
  const getProgressFn = useServerFn(getOrganizationOnboardingProgress);

  return useQuery({
    queryKey: queryKeys.dashboard.onboarding.progress(),
    queryFn: async () => {
      const result = await getProgressFn();
      if (result == null) throw new Error('Onboarding progress returned no data');
      return result;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Dismiss the welcome checklist permanently.
 */
export function useDismissWelcomeChecklist() {
  const queryClient = useQueryClient();
  const dismissFn = useServerFn(dismissWelcomeChecklist);

  return useMutation({
    mutationFn: async () => {
      return await dismissFn();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.onboarding.progress(),
      });
    },
  });
}
