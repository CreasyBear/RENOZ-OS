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
} from '@/server/functions/site-visits';
import type {
  SiteVisitListQuery,
  CreateSiteVisitInput,
  UpdateSiteVisitInput,
  CheckInInput,
  CheckOutInput,
  CustomerSignOffInput,
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

  return useQuery({
    queryKey: queryKeys.siteVisits.list(filters),
    queryFn: () => getSiteVisits({ data: filters as SiteVisitListQuery }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get site visits by project
 */
export function useSiteVisitsByProject(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.siteVisits.byProject(projectId),
    queryFn: () =>
      getSiteVisits({
        data: { projectId, page: 1, pageSize: 100 } as SiteVisitListQuery,
      }),
    enabled: enabled && !!projectId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get site visits by installer
 */
export function useSiteVisitsByInstaller(installerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.siteVisits.byInstaller(installerId),
    queryFn: () =>
      getSiteVisits({
        data: { installerId, page: 1, pageSize: 100 } as SiteVisitListQuery,
      }),
    enabled: enabled && !!installerId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get schedule for a date range
 */
export function useSchedule(dateFrom: string, dateTo: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.siteVisits.schedule(dateFrom, dateTo),
    queryFn: () =>
      getSiteVisits({
        data: { dateFrom, dateTo, page: 1, pageSize: 500 } as SiteVisitListQuery,
      }),
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    queryFn: () => getSiteVisit({ data: { siteVisitId } }),
    enabled: enabled && !!siteVisitId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

type SiteVisitResult = { id: string; projectId: string; installerId: string | null };

/**
 * Create a new site visit
 */
export function useCreateSiteVisit() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createSiteVisit);

  return useMutation({
    mutationFn: async (input: CreateSiteVisitInput) => {
      const result = await createFn({ data: input });
      return result as SiteVisitResult;
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
    mutationFn: async (input: UpdateSiteVisitInput) => {
      const result = await updateFn({ data: input });
      return result as SiteVisitResult;
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
    mutationFn: async (input: CheckInInput) => {
      const result = await checkInFn({ data: input });
      return result as SiteVisitResult;
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
    mutationFn: async (input: CheckOutInput) => {
      const result = await checkOutFn({ data: input });
      return result as SiteVisitResult;
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

type SignOffResult = { id: string; projectId: string };

/**
 * Record customer sign-off for a completed visit
 */
export function useCustomerSignOff() {
  const queryClient = useQueryClient();
  const signOffFn = useServerFn(recordCustomerSignOff);

  return useMutation({
    mutationFn: async (input: CustomerSignOffInput) => {
      const result = await signOffFn({ data: input });
      return result as SignOffResult;
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
      queryFn: () => getSiteVisit({ data: { siteVisitId } }),
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
  CheckInInput,
  CheckOutInput,
  CustomerSignOffInput,
};
