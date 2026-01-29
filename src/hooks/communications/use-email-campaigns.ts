/**
 * Email Campaigns Hooks
 *
 * Mutations for email campaign management.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see COMM-CAMPAIGNS story
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { CreateCampaignInput } from '@/lib/schemas/communications/email-campaigns';
import { createCampaign } from '@/server/functions/communications/email-campaigns';

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const createCampaignFn = useServerFn(createCampaign);

  return useMutation({
    mutationFn: (input: CreateCampaignInput) => createCampaignFn({ data: input }),
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
