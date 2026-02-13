/**
 * Installers Hooks
 *
 * TanStack Query hooks for installer management:
 * - Installer list with filtering
 * - Installer detail with full profile
 * - Availability checking
 * - Workload tracking
 * - Smart assignment suggestions
 *
 * SPRINT-03: New hooks for installer management (Stories 019)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  listInstallers,
  listAllActiveInstallers,
  getInstaller,
  createInstallerProfile,
  updateInstallerProfile,
  deleteInstallerProfile,
  createCertification,
  updateCertification,
  verifyCertification,
  deleteCertification,
  createSkill,
  updateSkill,
  deleteSkill,
  createTerritory,
  updateTerritory,
  deleteTerritory,
  createBlockout,
  updateBlockout,
  deleteBlockout,
  checkAvailability,
  getInstallerWorkload,
  suggestInstallers,
  updateInstallerStatusBatch,
} from '@/server/functions/installers';
import type {
  InstallerListQuery,
  InstallerListItem,
  SuggestInstallersInput,
} from '@/lib/schemas/jobs/installers';

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseInstallersOptions extends Partial<InstallerListQuery> {
  enabled?: boolean;
}

/**
 * Get installers list with filtering and pagination
 */
export function useInstallers(options: UseInstallersOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.installers.list(filters),
    queryFn: async () => {
      const result = await listInstallers({ data: filters as InstallerListQuery });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get all active installers (for dropdowns, small datasets)
 * Uses dedicated server function without pagination (Finding #17)
 */
export function useAllInstallers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.installers.allActive(),
    queryFn: async () => {
      const result = await listAllActiveInstallers();
      // Map to InstallerListItem format
      return result.map((item) => ({
        id: item.id,
        userId: item.userId,
        name: item.name,
        email: item.email,
        status: item.status,
        yearsExperience: item.yearsExperience,
        vehicleType: item.vehicleType,
        maxJobsPerDay: item.maxJobsPerDay,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })) as InstallerListItem[];
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

/**
 * Get single installer with full profile
 */
export function useInstaller(installerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.installers.detail(installerId),
    queryFn: async () => {
      const result = await getInstaller({
        data: { id: installerId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!installerId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// AVAILABILITY & WORKLOAD HOOKS
// ============================================================================

/**
 * Check installer availability for date range
 */
export function useInstallerAvailability(
  installerId: string,
  startDate?: string,
  endDate?: string,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.installers.availability(installerId, startDate, endDate),
    queryFn: async () => {
      const result = await checkAvailability({
        data: { installerId, startDate: startDate!, endDate: endDate! },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!installerId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get installer workload (current assignments)
 */
export function useInstallerWorkload(installerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.installers.workload(installerId),
    queryFn: async () => {
      const result = await getInstallerWorkload({
        data: { id: installerId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!installerId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get smart installer suggestions for a job
 */
export function useSuggestInstallers(
  postcode: string,
  options: Partial<Omit<SuggestInstallersInput, 'postcode'>> = {},
  enabled = true
) {
  const normalizedOptions: Omit<SuggestInstallersInput, 'postcode'> = { limit: 5, ...options };
  return useQuery({
    queryKey: queryKeys.installers.suggestions(postcode, normalizedOptions),
    queryFn: async () => {
      const result = await suggestInstallers({
        data: { postcode, ...normalizedOptions },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!postcode,
    staleTime: 5 * 60 * 1000, // 5 minutes - suggestions don't change often
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create installer profile
 */
export function useCreateInstallerProfile() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(createInstallerProfile);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

/**
 * Update installer profile
 */
export function useUpdateInstallerProfile() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateInstallerProfile);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.id),
      });
    },
  });
}

/**
 * Delete installer profile (soft delete)
 */
export function useDeleteInstallerProfile() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteInstallerProfile);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

// ============================================================================
// CERTIFICATION MUTATIONS
// ============================================================================

export function useCreateCertification() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(createCertification);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.certifications(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useUpdateCertification() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateCertification);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.certifications(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useVerifyCertification() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(verifyCertification);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.certifications(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteCertification);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.certifications(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

// ============================================================================
// SKILL MUTATIONS
// ============================================================================

export function useCreateSkill() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(createSkill);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.skills(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateSkill);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.skills(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteSkill);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.skills(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

// ============================================================================
// TERRITORY MUTATIONS
// ============================================================================

export function useCreateTerritory() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(createTerritory);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.territories(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useUpdateTerritory() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateTerritory);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.territories(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useDeleteTerritory() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteTerritory);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.territories(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

// ============================================================================
// BLOCKOUT MUTATIONS
// ============================================================================

export function useCreateBlockout() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(createBlockout);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.blockouts(data.installerId),
      });
      // Invalidate all availability queries for this installer (date ranges may vary)
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'installers' &&
          query.queryKey[1] === 'availability' &&
          query.queryKey[2] === data.installerId,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useUpdateBlockout() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateBlockout);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.blockouts(data.installerId),
      });
      // Invalidate all availability queries for this installer (date ranges may have changed)
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'installers' &&
          query.queryKey[1] === 'availability' &&
          query.queryKey[2] === data.installerId,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

export function useDeleteBlockout() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteBlockout);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.blockouts(data.installerId),
      });
      // Invalidate all availability queries for this installer
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'installers' &&
          query.queryKey[1] === 'availability' &&
          query.queryKey[2] === data.installerId,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
    },
  });
}

// ============================================================================
// BULK MUTATIONS
// ============================================================================

/**
 * Bulk update installer statuses
 * Used for list-level bulk operations
 */
export function useUpdateInstallerStatusBatch() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateInstallerStatusBatch);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      // Invalidate all installer lists (status affects list display)
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.lists() });
      // Invalidate all detail queries (status is shown in detail view)
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.details() });
      // Invalidate suggestions (status affects availability)
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'installers' && query.queryKey[1] === 'suggestions',
      });
    },
  });
}
