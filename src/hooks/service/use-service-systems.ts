'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from '@/hooks/_shared/use-toast';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { queryKeys } from '@/lib/query-keys';
import { SERVICE_READ_MESSAGES } from '@/lib/service/read-error-messages';
import { formatServiceActionMutationError } from './_mutation-errors';
import type {
  ListServiceSystemsInput,
  ListServiceLinkageReviewsInput,
  ResolveServiceLinkageReviewInput,
  TransferServiceSystemOwnershipInput,
} from '@/lib/schemas/service';
import {
  getServiceLinkageReview,
  getServiceSystem,
  listServiceSystems,
  listServiceLinkageReviews,
  resolveServiceLinkageReview,
  transferServiceSystemOwnership,
} from '@/server/functions/service';

const DETAIL_STALE_TIME = 60 * 1000;
const LIST_STALE_TIME = 30 * 1000;

export function useServiceSystem(serviceSystemId: string, enabled = true) {
  const getServiceSystemFn = useServerFn(getServiceSystem);

  return useQuery({
    queryKey: queryKeys.serviceSystems.detail(serviceSystemId),
    queryFn: async () => {
      try {
        return await getServiceSystemFn({ data: { id: serviceSystemId } });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: SERVICE_READ_MESSAGES.systemDetail,
          notFoundMessage: SERVICE_READ_MESSAGES.systemNotFound,
        });
      }
    },
    enabled: enabled && !!serviceSystemId,
    staleTime: DETAIL_STALE_TIME,
  });
}

export function useServiceSystems(filters: Partial<ListServiceSystemsInput> = {}) {
  const listServiceSystemsFn = useServerFn(listServiceSystems);

  return useQuery({
    queryKey: queryKeys.serviceSystems.list(filters),
    queryFn: async () => {
      try {
        return await listServiceSystemsFn({ data: filters });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: SERVICE_READ_MESSAGES.systemsList,
        });
      }
    },
    staleTime: LIST_STALE_TIME,
  });
}

export function useServiceLinkageReviews(
  filters: Partial<ListServiceLinkageReviewsInput> = {}
) {
  const listServiceLinkageReviewsFn = useServerFn(listServiceLinkageReviews);

  return useQuery({
    queryKey: queryKeys.serviceLinkageReviews.list(filters),
    queryFn: async () => {
      try {
        return await listServiceLinkageReviewsFn({ data: filters });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: SERVICE_READ_MESSAGES.linkageReviewsList,
        });
      }
    },
    staleTime: LIST_STALE_TIME,
  });
}

export function useServiceLinkageReview(reviewId: string, enabled = true) {
  const getServiceLinkageReviewFn = useServerFn(getServiceLinkageReview);

  return useQuery({
    queryKey: queryKeys.serviceLinkageReviews.detail(reviewId),
    queryFn: async () => {
      try {
        return await getServiceLinkageReviewFn({ data: { id: reviewId } });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: SERVICE_READ_MESSAGES.linkageReviewDetail,
          notFoundMessage: SERVICE_READ_MESSAGES.linkageReviewNotFound,
        });
      }
    },
    enabled: enabled && !!reviewId,
    staleTime: DETAIL_STALE_TIME,
  });
}

export function useResolveServiceLinkageReview() {
  const queryClient = useQueryClient();
  const resolveServiceLinkageReviewFn = useServerFn(resolveServiceLinkageReview);

  return useMutation({
    mutationFn: (input: ResolveServiceLinkageReviewInput) =>
      resolveServiceLinkageReviewFn({ data: input }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceLinkageReviews.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceLinkageReviews.detail(variables.reviewId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceSystems.lists() });
      if (result.resolvedServiceSystemId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceSystems.detail(result.resolvedServiceSystemId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.statusCounts() });
      if (result.sourceWarrantyId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.warranties.detail(result.sourceWarrantyId),
        });
      }
      toast.success('Service linkage review resolved');
    },
    onError: (error) => {
      toast.error(formatServiceActionMutationError(error, 'resolveLinkageReview'));
    },
  });
}

export function useTransferServiceSystemOwnership() {
  const queryClient = useQueryClient();
  const transferServiceSystemOwnershipFn = useServerFn(transferServiceSystemOwnership);

  return useMutation({
    mutationFn: (input: TransferServiceSystemOwnershipInput) =>
      transferServiceSystemOwnershipFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceSystems.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceSystems.detail(result.serviceSystemId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.statusCounts() });
      for (const warrantyId of result.linkedWarrantyIds ?? []) {
        queryClient.invalidateQueries({ queryKey: queryKeys.warranties.detail(warrantyId) });
      }
      toast.success('System ownership transferred successfully');
    },
    onError: (error) => {
      toast.error(formatServiceActionMutationError(error, 'transferOwnership'));
    },
  });
}
