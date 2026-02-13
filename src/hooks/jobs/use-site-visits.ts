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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
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
        throw new Error('Invalid site visit filters');
      }
      return getSiteVisits({ data: parsed.data });
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
        throw new Error('Invalid site visit filters');
      }
      return getSiteVisits({ data: parsed.data });
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
        throw new Error('Invalid site visit filters');
      }
      return getSiteVisits({ data: parsed.data });
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
        throw new Error('Invalid site visit filters');
      }
      return getSiteVisits({ data: parsed.data });
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
      const result = await getPastDueSiteVisits({});
      if (result == null) throw new Error('Past due site visits returned no data');
      return result;
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
  enabled?: boolean;
}

/**
 * Get single site visit by ID
 */
export function useSiteVisit({ siteVisitId, enabled = true }: UseSiteVisitOptions) {
  return useQuery({
    queryKey: queryKeys.siteVisits.detail(siteVisitId),
    queryFn: async () => {
      const result = await getSiteVisit({
        data: { siteVisitId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!siteVisitId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

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
      // Invalidate project visits
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.byProject(result.projectId),
      });
      // Invalidate installer visits if assigned
      if (result.installerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.siteVisits.byInstaller(result.installerId),
        });
      }
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.lists() });
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
    onSuccess: (result, variables) => {
      // Invalidate specific visit and related lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.detail(variables.siteVisitId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.byProject(result.projectId),
      });
      if (result.installerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.siteVisits.byInstaller(result.installerId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.lists() });
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.detail(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.byProject(result.projectId),
      });
      if (result.installerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.siteVisits.byInstaller(result.installerId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.all });
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
    mutationFn: (siteVisitId: string) => deleteFn({ data: { siteVisitId } }),
    onSuccess: (_, siteVisitId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.siteVisits.detail(siteVisitId) });
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.lists() });
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
      // Update detail cache
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.detail(result.id) });
      // Invalidate project visits
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.byProject(result.projectId),
      });
      // Invalidate installer visits
      if (result.installerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.siteVisits.byInstaller(result.installerId),
        });
      }
      // Invalidate my visits
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
      // Update detail cache
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.detail(result.id) });
      // Invalidate project visits
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.byProject(result.projectId),
      });
      // Invalidate installer visits
      if (result.installerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.siteVisits.byInstaller(result.installerId),
        });
      }
      // Invalidate my visits
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
      // Update detail cache
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.detail(result.id) });
      // Invalidate project visits
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.byProject(result.projectId),
      });
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
    mutationFn: (data: { siteVisitId: string; reason?: string }) =>
      cancelFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.siteVisits.detail(variables.siteVisitId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.lists() });
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
      const result = await getSiteVisit({
        data: { siteVisitId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
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
