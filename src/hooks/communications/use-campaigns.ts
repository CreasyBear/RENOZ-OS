/**
 * Email Campaigns Hooks
 *
 * Query and mutation hooks for email campaigns.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-003d
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getCampaigns,
  getCampaignById,
  getCampaignRecipients,
  createCampaign,
  updateCampaign,
  cancelCampaign,
  deleteCampaign,
  previewCampaignRecipients,
  populateCampaignRecipients,
} from '@/lib/server/email-campaigns';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseCampaignsOptions {
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useCampaigns(options: UseCampaignsOptions = {}) {
  const { status, limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.campaignsList({ status, limit, offset }),
    queryFn: () => getCampaigns({ data: { status, limit, offset } }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export interface UseCampaignOptions {
  campaignId: string;
  enabled?: boolean;
}

export function useCampaign(options: UseCampaignOptions) {
  const { campaignId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.campaignDetail(campaignId),
    queryFn: () => getCampaignById({ data: { id: campaignId } }),
    enabled: enabled && !!campaignId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export interface UseCampaignRecipientsOptions {
  campaignId: string;
  status?: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed';
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useCampaignRecipients(options: UseCampaignRecipientsOptions) {
  const { campaignId, status, limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.campaignRecipients(campaignId, { status, limit }),
    queryFn: () => getCampaignRecipients({ data: { campaignId, status, limit, offset } }),
    enabled: enabled && !!campaignId,
    staleTime: 30 * 1000,
  });
}

export interface UseCampaignPreviewOptions {
  recipientCriteria: {
    tags?: string[];
    statuses?: string[];
    customerTypes?: string[];
    contactIds?: string[];
    customerIds?: string[];
    excludeContactIds?: string[];
  };
  sampleSize?: number;
  enabled?: boolean;
}

export function useCampaignPreview(options: UseCampaignPreviewOptions) {
  const { recipientCriteria, sampleSize = 5, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.campaignPreview(recipientCriteria),
    queryFn: () => previewCampaignRecipients({ data: { recipientCriteria, sampleSize } }),
    enabled: enabled && Object.keys(recipientCriteria).length > 0,
    staleTime: 60 * 1000, // 1 minute - preview data can be cached a bit
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCampaign,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignDetail(variables.data.id),
      });
    },
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelCampaign,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignDetail(variables.data.id),
      });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
    },
  });
}

export function usePopulateCampaignRecipients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: populateCampaignRecipients,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignDetail(variables.data.campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignRecipients(variables.data.campaignId, {}),
      });
    },
  });
}
