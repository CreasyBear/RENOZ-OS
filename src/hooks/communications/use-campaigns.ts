/**
 * Email Campaigns Hooks
 *
 * Query and mutation hooks for email campaigns.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-003d
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
  CancelCampaignInput,
  DeleteCampaignInput,
  PopulateCampaignRecipientsInput,
} from '@/lib/schemas/communications/email-campaigns';
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
} from '@/server/functions/communications/email-campaigns';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseCampaignsOptions {
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

// Type for getCampaigns response (server function has @ts-expect-error breaking inference)
interface CampaignsResponse {
  items: Array<{
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    templateType: string;
    templateData: Record<string, unknown>;
    recipientCriteria: Record<string, unknown>;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
    scheduledAt: Date | null;
    sentAt: Date | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
}

export function useCampaigns(options: UseCampaignsOptions = {}) {
  const { status, limit = 50, offset = 0, enabled = true } = options;

  return useQuery<CampaignsResponse>({
    queryKey: queryKeys.communications.campaignsList({ status, limit, offset }),
    queryFn: () => getCampaigns({ data: { status, limit, offset } }) as Promise<CampaignsResponse>,
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

// Backwards-compatible alias
export const usePreviewCampaignRecipients = useCampaignPreview;

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const createCampaignFn = useServerFn(createCampaign);

  return useMutation({
    mutationFn: (input: CreateCampaignInput) => createCampaignFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const updateCampaignFn = useServerFn(updateCampaign);

  return useMutation({
    mutationFn: (input: UpdateCampaignInput) => updateCampaignFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignDetail(variables.id),
      });
    },
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();
  const cancelCampaignFn = useServerFn(cancelCampaign);

  return useMutation({
    mutationFn: (input: CancelCampaignInput) => cancelCampaignFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignDetail(variables.id),
      });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  const deleteCampaignFn = useServerFn(deleteCampaign);

  return useMutation({
    mutationFn: (input: DeleteCampaignInput) => deleteCampaignFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
    },
  });
}

export function usePopulateCampaignRecipients() {
  const queryClient = useQueryClient();
  const populateRecipientsFn = useServerFn(populateCampaignRecipients);

  return useMutation({
    mutationFn: (input: PopulateCampaignRecipientsInput) =>
      populateRecipientsFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignDetail(variables.campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignRecipients(variables.campaignId, {}),
      });
    },
  });
}
