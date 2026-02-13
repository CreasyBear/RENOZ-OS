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
import { QUERY_CONFIG } from '@/lib/constants';
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
  CancelCampaignInput,
  DeleteCampaignInput,
  PopulateCampaignRecipientsInput,
  SendCampaignInput,
  PauseCampaignInput,
  ResumeCampaignInput,
  DuplicateCampaignInput,
  TestSendCampaignInput,
  Campaign,
  PreviewRecipientsResult,
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
  sendCampaign,
  pauseCampaign,
  resumeCampaign,
  duplicateCampaign,
  testSendCampaign,
} from '@/server/functions/communications/email-campaigns';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseCampaignsOptions {
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  search?: string;
  templateType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

// Type for getCampaigns response - matches what server function returns
// Note: ServerFn return type assertion needed until CampaignRecipientCriteria.customFilters
// uses wire type per SCHEMA-TRACE.md §4. See @ts-expect-error in email-campaigns server.

interface CampaignsResponse {
  items: Campaign[]
  total: number
}

export function useCampaigns(options: UseCampaignsOptions = {}) {
  const { status, search, templateType, dateFrom, dateTo, limit = 50, offset = 0, enabled = true } = options;

  return useQuery<CampaignsResponse>({
    queryKey: queryKeys.communications.campaignsList({ status, search, templateType, dateFrom, dateTo, limit, offset }),
    queryFn: async () => {
      const result = await getCampaigns({
        data: { status, search, templateType, dateFrom, dateTo, limit, offset },
      });
      if (result == null) throw new Error('Campaigns list returned no data');
      return result as CampaignsResponse;
    },
    enabled,
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  });
}

export interface UseCampaignOptions {
  campaignId: string;
  enabled?: boolean;
}

export function useCampaign(options: UseCampaignOptions) {
  const { campaignId, enabled = true } = options;

  return useQuery<Campaign | undefined>({
    queryKey: queryKeys.communications.campaignDetail(campaignId),
    queryFn: async () => {
      const r = await getCampaignById({ data: { id: campaignId } });
      return r && typeof r === 'object' && 'id' in r ? (r as Campaign) : undefined;
    },
    enabled: enabled && !!campaignId,
    staleTime: QUERY_CONFIG.STALE_TIME_MEDIUM,
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
    queryFn: async () => {
      const result = await getCampaignRecipients({ data: { campaignId, status, limit, offset } });
      if (result == null) throw new Error('Campaign recipients returned no data');
      return result;
    },
    enabled: enabled && !!campaignId,
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
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

  return useQuery<PreviewRecipientsResult>({
    queryKey: queryKeys.communications.campaignPreview(recipientCriteria),
    queryFn: async () => {
      const result = await previewCampaignRecipients({
        data: { recipientCriteria, sampleSize } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && Object.keys(recipientCriteria).length > 0,
    staleTime: QUERY_CONFIG.STALE_TIME_MEDIUM, // preview data can be cached a bit
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

  return useMutation<Campaign, Error, CreateCampaignInput>({
    mutationFn: async (input: CreateCampaignInput) => (await createCampaignFn({ data: input })) as Campaign,
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

  return useMutation<Campaign, Error, UpdateCampaignInput>({
    mutationFn: async (input: UpdateCampaignInput) => (await updateCampaignFn({ data: input })) as Campaign,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignDetail(variables.id),
      });
      // Also invalidate inbox since campaign changes may affect inbox items
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inbox(),
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

export function useSendCampaign() {
  const queryClient = useQueryClient();
  const sendCampaignFn = useServerFn(sendCampaign);

  return useMutation({
    mutationFn: (input: SendCampaignInput) => sendCampaignFn({ data: input }),
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

export function usePauseCampaign() {
  const queryClient = useQueryClient();
  const pauseCampaignFn = useServerFn(pauseCampaign);

  return useMutation({
    mutationFn: (input: PauseCampaignInput) => pauseCampaignFn({ data: input }),
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

export function useResumeCampaign() {
  const queryClient = useQueryClient();
  const resumeCampaignFn = useServerFn(resumeCampaign);

  return useMutation({
    mutationFn: (input: ResumeCampaignInput) => resumeCampaignFn({ data: input }),
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

export function useDuplicateCampaign() {
  const queryClient = useQueryClient();
  const duplicateCampaignFn = useServerFn(duplicateCampaign);

  return useMutation({
    mutationFn: (input: DuplicateCampaignInput) => duplicateCampaignFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });
    },
  });
}

export function useTestSendCampaign() {
  const queryClient = useQueryClient();
  const testSendCampaignFn = useServerFn(testSendCampaign);

  return useMutation({
    mutationFn: (input: TestSendCampaignInput) => testSendCampaignFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaignDetail(variables.campaignId),
      });
    },
  });
}
