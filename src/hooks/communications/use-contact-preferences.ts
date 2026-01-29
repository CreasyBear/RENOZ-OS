/**
 * Contact Preferences Hooks
 *
 * Query and mutation hooks for contact communication preferences.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-005
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { UpdatePreferencesInput } from '@/lib/schemas/communications/communication-preferences';
import {
  getContactPreferences,
  updateContactPreferences,
  getPreferenceHistory,
} from '@/server/functions/communications/communication-preferences';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseContactPreferencesOptions {
  contactId: string;
  enabled?: boolean;
}

export function useContactPreferences(options: UseContactPreferencesOptions) {
  const { contactId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.contactPreference(contactId),
    queryFn: () => getContactPreferences({ data: { contactId } }),
    enabled: enabled && !!contactId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export interface UsePreferenceHistoryOptions {
  contactId?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function usePreferenceHistory(options: UsePreferenceHistoryOptions = {}) {
  const { contactId, customerId, limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.preferenceHistory(contactId ?? '', { customerId }),
    queryFn: () => getPreferenceHistory({ data: { contactId, customerId, limit, offset } }),
    enabled: enabled && (!!contactId || !!customerId),
    staleTime: 5 * 60 * 1000, // 5 minutes - history doesn't change often
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useUpdateContactPreferences() {
  const queryClient = useQueryClient();
  const updatePreferencesFn = useServerFn(updateContactPreferences);

  return useMutation({
    mutationFn: (input: UpdatePreferencesInput) => updatePreferencesFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.contactPreference(variables.contactId),
      });
      // Also invalidate preference history since an update creates a new history entry
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.preferenceHistory(variables.contactId),
      });
    },
  });
}
