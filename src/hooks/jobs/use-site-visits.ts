/**
 * Site Visits Hooks
 *
 * TanStack Query hooks for site visit data fetching:
 * - Site visit list with filtering
 * - Site visit detail view
 * - Site visit mutations (create, update, delete)
 * - Check-in/check-out operations
 * - Customer sign-off
 *
 * SPRINT-03: New domain hooks for project-centric jobs model
 */
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  getSiteVisits,
  getSiteVisit,
  createSiteVisit,
  updateSiteVisit,
  deleteSiteVisit,
  checkIn,
  checkOut,
  recordCustomerSignOff,
  cancelSiteVisit,
  rescheduleSiteVisit,
  getPastDueSiteVisits,
} from '@/server/functions/site-visits';
import {
  siteVisitListQuerySchema,
  type SiteVisitListQuery,
  type CreateSiteVisitInput,
  type UpdateSiteVisitInput,
  type RescheduleSiteVisitInput,
  type CheckInInput,
  type CheckOutInput,
  type CustomerSignOffInput,
  type ScopedSiteVisitIdInput,
  type SiteVisitListResult,
  type SiteVisitMutationResult,
  type CustomerSignOffResult,
} from '@/lib/schemas/jobs/site-visits';

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseSiteVisitsOptions extends Partial<SiteVisitListQuery> {
  enabled?: boolean;
}

/**
 * Get site visits list with filtering
 */
export function useSiteVisits(options: UseSiteVisitsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery<SiteVisitListResult>({
    queryKey: queryKeys.siteVisits.list(filters),
    queryFn: async () => {
      const parsed = siteVisitListQuerySchema.safeParse(filters);
      if (!parsed.success) {
        throw normalizeReadQueryError(
          {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            message: 'Invalid site visit filters',
          },
          {
            contractType: 'always-shaped',
            fallbackMessage: 'Site visits are temporarily unavailable. Please refresh and try again.',
          }
        );
      }
      try {
        return await getSiteVisits({ data: parsed.data });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Site visits are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get site visits by project
 */
export function useSiteVisitsByProject(projectId: string, enabled = true) {
  return useQuery<SiteVisitListResult>({
    queryKey: queryKeys.siteVisits.byProject(projectId),
    queryFn: async () => {
      const parsed = siteVisitListQuerySchema.safeParse({ projectId, page: 1, pageSize: 100 });
      if (!parsed.success) {
        throw normalizeReadQueryError(
          {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            message: 'Invalid site visit filters',
          },
          {
            contractType: 'always-shaped',
            fallbackMessage: 'Project site visits are temporarily unavailable. Please refresh and try again.',
          }
        );
      }
      try {
        return await getSiteVisits({ data: parsed.data });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Project site visits are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!projectId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get site visits by installer
 */
export function useSiteVisitsByInstaller(installerId: string, enabled = true) {
  return useQuery<SiteVisitListResult>({
    queryKey: queryKeys.siteVisits.byInstaller(installerId),
    queryFn: async () => {
      const parsed = siteVisitListQuerySchema.safeParse({ installerId, page: 1, pageSize: 100 });
      if (!parsed.success) {
        throw normalizeReadQueryError(
          {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            message: 'Invalid site visit filters',
          },
          {
            contractType: 'always-shaped',
            fallbackMessage:
              'Installer site visits are temporarily unavailable. Please refresh and try again.',
          }
        );
      }
      try {
        return await getSiteVisits({ data: parsed.data });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Installer site visits are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!installerId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get schedule for a date range, optionally filtered by project.
 */
export function useSchedule(
  dateFrom: string,
  dateTo: string,
  options?: { projectId?: string; enabled?: boolean }
) {
  const { projectId, enabled = true } = options ?? {};
  return useQuery<SiteVisitListResult>({
    queryKey: queryKeys.siteVisits.schedule(dateFrom, dateTo, projectId),
    queryFn: async () => {
      const parsed = siteVisitListQuerySchema.safeParse({
        dateFrom,
        dateTo,
        projectId,
        page: 1,
        pageSize: 500,
      });
      if (!parsed.success) {
        throw normalizeReadQueryError(
          {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            message: 'Invalid site visit filters',
          },
          {
            contractType: 'always-shaped',
            fallbackMessage: 'Schedule data is temporarily unavailable. Please refresh and try again.',
          }
        );
      }
      try {
        return await getSiteVisits({ data: parsed.data });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Schedule data is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get past-due site visits (scheduled before today, not completed)
 * For the "Needs rescheduling" sidebar in the schedule calendar.
 */
export function usePastDueSiteVisits(enabled = true) {
  return useQuery<SiteVisitListResult>({
    queryKey: queryKeys.siteVisits.pastDue(),
    queryFn: async () => {
      try {
        return await getPastDueSiteVisits({});
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Past-due site visits are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export interface UseSiteVisitOptions {
  siteVisitId: string;
  projectId?: string;
  enabled?: boolean;
}

/**
 * Get single site visit by ID
 */
export function useSiteVisit({ siteVisitId, projectId, enabled = true }: UseSiteVisitOptions) {
  return useQuery({
    queryKey: queryKeys.siteVisits.detail(siteVisitId),
    queryFn: async () => {
      try {
        return await getSiteVisit({
          data: { siteVisitId, ...(projectId ? { projectId } : {}) },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage:
            'Site visit details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested site visit could not be found.',
        });
      }
    },
    enabled: enabled && !!siteVisitId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

type CancelSiteVisitInput = ScopedSiteVisitIdInput & { reason?: string };
type DeleteSiteVisitInput = string | ScopedSiteVisitIdInput;

function invalidateSiteVisitMutationViews(
  queryClient: QueryClient,
  result: { id?: string; projectId?: string | null; installerId?: string | null }
) {
  if (result.id) {
    queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.detail(result.id) });
  }
  if (result.projectId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.siteVisits.byProject(result.projectId),
    });
  }
  if (result.installerId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.siteVisits.byInstaller(result.installerId),
    });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.all });
}

/**
 * Create a new site visit
 */
export function useCreateSiteVisit() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createSiteVisit);

  return useMutation({
    mutationFn: async (input: CreateSiteVisitInput): Promise<SiteVisitMutationResult> => {
      const result = await createFn({ data: input });
      return { id: result.id, projectId: result.projectId, installerId: result.installerId };
    },
    onSuccess: (result) => {
      invalidateSiteVisitMutationViews(queryClient, result);
    },
  });
}

/**
 * Update a site visit
 */
export function useUpdateSiteVisit() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateSiteVisit);

  return useMutation({
    mutationFn: async (input: UpdateSiteVisitInput): Promise<SiteVisitMutationResult> => {
      const result = await updateFn({ data: input });
      return { id: result.id, projectId: result.projectId, installerId: result.installerId };
    },
    onSuccess: (result) => {
      invalidateSiteVisitMutationViews(queryClient, result);
    },
  });
}

/**
 * Reschedule a site visit (scheduled/in_progress only)
 */
export function useRescheduleSiteVisit() {
  const queryClient = useQueryClient();
  const rescheduleFn = useServerFn(rescheduleSiteVisit);

  return useMutation({
    mutationFn: async (input: RescheduleSiteVisitInput): Promise<SiteVisitMutationResult> => {
      const result = await rescheduleFn({ data: input });
      return { id: result.id, projectId: result.projectId, installerId: result.installerId };
    },
    onSuccess: (result) => {
      invalidateSiteVisitMutationViews(queryClient, result);
    },
  });
}

/**
 * Delete a site visit
 */
export function useDeleteSiteVisit() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteSiteVisit);

  return useMutation({
    mutationFn: async (input: DeleteSiteVisitInput): Promise<SiteVisitMutationResult> => {
      const data = typeof input === 'string' ? { siteVisitId: input } : input;
      const result = await deleteFn({ data });
      return { id: result.id, projectId: result.projectId, installerId: result.installerId };
    },
    onSuccess: (result) => {
      queryClient.removeQueries({ queryKey: queryKeys.siteVisits.detail(result.id) });
      invalidateSiteVisitMutationViews(queryClient, result);
    },
  });
}

// ============================================================================
// CHECK-IN / CHECK-OUT
// ============================================================================

/**
 * Check in to a site visit
 */
export function useCheckIn() {
  const queryClient = useQueryClient();
  const checkInFn = useServerFn(checkIn);

  return useMutation({
    mutationFn: async (input: CheckInInput): Promise<SiteVisitMutationResult> => {
      const result = await checkInFn({ data: input });
      return { id: result.id, projectId: result.projectId, installerId: result.installerId };
    },
    onSuccess: (result) => {
      invalidateSiteVisitMutationViews(queryClient, result);
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.myVisits() });
    },
  });
}

/**
 * Check out from a site visit
 */
export function useCheckOut() {
  const queryClient = useQueryClient();
  const checkOutFn = useServerFn(checkOut);

  return useMutation({
    mutationFn: async (input: CheckOutInput): Promise<SiteVisitMutationResult> => {
      const result = await checkOutFn({ data: input });
      return { id: result.id, projectId: result.projectId, installerId: result.installerId };
    },
    onSuccess: (result) => {
      invalidateSiteVisitMutationViews(queryClient, result);
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.myVisits() });
    },
  });
}

// ============================================================================
// CUSTOMER SIGN-OFF
// ============================================================================

/**
 * Record customer sign-off for a completed visit
 */
export function useCustomerSignOff() {
  const queryClient = useQueryClient();
  const signOffFn = useServerFn(recordCustomerSignOff);

  return useMutation({
    mutationFn: async (input: CustomerSignOffInput): Promise<CustomerSignOffResult> => {
      const result = await signOffFn({ data: input });
      return { id: result.id, projectId: result.projectId };
    },
    onSuccess: (result) => {
      invalidateSiteVisitMutationViews(queryClient, result);
    },
  });
}

// ============================================================================
// CANCEL SITE VISIT
// ============================================================================

/**
 * Cancel a site visit (status-based cancellation for scheduled visits)
 */
export function useCancelSiteVisit() {
  const queryClient = useQueryClient();
  const cancelFn = useServerFn(cancelSiteVisit);

  return useMutation({
    mutationFn: async (data: CancelSiteVisitInput): Promise<SiteVisitMutationResult> => {
      const result = await cancelFn({ data });
      return { id: result.id, projectId: result.projectId, installerId: result.installerId };
    },
    onSuccess: (result) => {
      invalidateSiteVisitMutationViews(queryClient, result);
    },
  });
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * Prefetch a site visit for faster navigation
 */
export function usePrefetchSiteVisit() {
  const queryClient = useQueryClient();

  return (siteVisitId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.siteVisits.detail(siteVisitId),
      queryFn: async () => {
        try {
          return await getSiteVisit({
            data: { siteVisitId },
          });
        } catch (error) {
          throw normalizeReadQueryError(error, {
            contractType: 'detail-not-found',
            fallbackMessage:
              'Site visit details are temporarily unavailable. Please refresh and try again.',
            notFoundMessage: 'The requested site visit could not be found.',
          });
        }
      },
      staleTime: 60 * 1000,
    });
  };
}

// ============================================================================
// TYPES
// ============================================================================

export type {
  SiteVisitListQuery,
  CreateSiteVisitInput,
  UpdateSiteVisitInput,
  RescheduleSiteVisitInput,
  CheckInInput,
  CheckOutInput,
  CustomerSignOffInput,
};
