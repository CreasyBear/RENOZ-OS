/**
 * Email Campaigns Hooks
 *
 * Mutations for email campaign management.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see COMM-CAMPAIGNS story
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { createCampaign } from '@/lib/server/email-campaigns';

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      // Invalidate campaigns
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
      // Invalidate all timelines (new emails may appear)
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.all,
      });
    },
  });
}
