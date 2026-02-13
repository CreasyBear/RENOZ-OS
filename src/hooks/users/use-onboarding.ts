/**
 * User Onboarding Hooks
 *
 * TanStack Query hooks for user onboarding progress.
 *
 * @see src/server/functions/users/onboarding.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  getOnboardingProgress,
  completeOnboardingStep,
  dismissOnboardingStep,
  resetOnboarding,
} from '@/server/functions/users/onboarding';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingStep {
  key: string;
  name: string;
  description: string;
  action: string;
  isCompleted: boolean;
  completedAt: Date | null;
  isDismissed: boolean;
  dismissedAt: Date | null;
}

export interface OnboardingStats {
  totalSteps: number;
  completedSteps: number;
  dismissedSteps: number;
  remainingSteps: number;
  percentComplete: number;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  stats: OnboardingStats;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch user's onboarding progress.
 */
export function useOnboardingProgress() {
  const getProgressFn = useServerFn(getOnboardingProgress);

  return useQuery<OnboardingProgress>({
    queryKey: queryKeys.user.onboarding(),
    queryFn: async () => {
      const result = await getProgressFn({ data: {} });
      if (result == null) throw new Error('Onboarding progress returned no data');
      return result as OnboardingProgress;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Complete an onboarding step.
 */
export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();
  const completeStepFn = useServerFn(completeOnboardingStep);

  return useMutation({
    mutationFn: async (stepKey: string) => {
      return await completeStepFn({ data: { stepKey } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.onboarding(),
      });
    },
  });
}

/**
 * Dismiss an onboarding step (user chose to skip).
 */
export function useDismissOnboardingStep() {
  const queryClient = useQueryClient();
  const dismissStepFn = useServerFn(dismissOnboardingStep);

  return useMutation({
    mutationFn: async (stepKey: string) => {
      return await dismissStepFn({ data: { stepKey } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.onboarding(),
      });
    },
  });
}

/**
 * Reset all onboarding progress for the current user.
 */
export function useResetOnboarding() {
  const queryClient = useQueryClient();
  const resetFn = useServerFn(resetOnboarding);

  return useMutation({
    mutationFn: async () => {
      return await resetFn({ data: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.onboarding(),
      });
    },
  });
}
