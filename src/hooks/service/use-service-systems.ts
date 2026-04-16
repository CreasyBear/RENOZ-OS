'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { normalizeQueryError } from '@/lib/error-handling';
import { queryKeys } from '@/lib/query-keys';
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
        const result = await getServiceSystemFn({ data: { id: serviceSystemId } });
        if (result == null) throw new Error('Service system query returned no data');
        return result;
      } catch (error) {
        throw normalizeQueryError(
          error,
          'Service system details are temporarily unavailable. Please refresh and try again.'
        );
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
        const result = await listServiceSystemsFn({ data: filters });
        if (result == null) throw new Error('Service systems query returned no data');
        return result;
      } catch (error) {
        throw normalizeQueryError(
          error,
          'Service systems are temporarily unavailable. Please refresh and try again.'
        );
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
        const result = await listServiceLinkageReviewsFn({ data: filters });
        if (result == null) throw new Error('Service linkage reviews query returned no data');
        return result;
      } catch (error) {
        throw normalizeQueryError(
          error,
          'Service linkage reviews are temporarily unavailable. Please refresh and try again.'
        );
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
        const result = await getServiceLinkageReviewFn({ data: { id: reviewId } });
        if (result == null) throw new Error('Service linkage review query returned no data');
        return result;
      } catch (error) {
        throw normalizeQueryError(
          error,
          'Service linkage review details are temporarily unavailable. Please refresh and try again.'
        );
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
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceLinkageReviews.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceSystems.lists() });
      if (result.resolvedServiceSystemId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.serviceSystems.detail(result.resolvedServiceSystemId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceLinkageReviews.detail(variables.reviewId),
      });
      toast.success('Service linkage review resolved');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to resolve service linkage review'
      );
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
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.all });
      toast.success('System ownership transferred successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to transfer system ownership'
      );
    },
  });
}
