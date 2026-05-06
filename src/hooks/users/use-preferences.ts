/**
 * User Preferences Hooks
 *
 * TanStack Query hooks for user preference management.
 *
 * @see src/server/functions/users/user-preferences.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { USER_READ_MESSAGES } from '@/lib/users/read-error-messages';
import {
  getPreferences,
  setPreference,
} from '@/server/functions/users/user-preferences';

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch user preferences, optionally filtered by category.
 */
export function usePreferences(category?: string) {
  const getPreferencesFn = useServerFn(getPreferences);

  return useQuery({
    queryKey: queryKeys.user.preferences(category),
    queryFn: async () => {
      try {
        const result = await getPreferencesFn({
          data: category ? { category } : {},
        });
        return result.grouped;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: USER_READ_MESSAGES.preferences,
        });
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Set a user preference value.
 */
export function useSetPreference() {
  const queryClient = useQueryClient();
  const setPreferenceFn = useServerFn(setPreference);

  return useMutation({
    mutationFn: async (data: {
      category: string;
      key: string;
      value: string | number | boolean | unknown[] | Record<string, unknown> | null;
    }) => {
      return await setPreferenceFn({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.preferences(),
      });
    },
  });
}
