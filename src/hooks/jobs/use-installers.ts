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
} from '@/server/functions/installers';
import type {
  InstallerListQuery,
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
    queryFn: () => listInstallers({ data: filters as InstallerListQuery }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get all active installers (for dropdowns, small datasets)
 */
export function useAllInstallers(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.installers.lists(), 'all-active'],
    queryFn: async () => {
      const allResults: InstallerListItem[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page < 20) {
        const result = await listInstallers({
          data: { page, pageSize: 100, status: 'active' } as InstallerListQuery,
        });
        allResults.push(...(result.items as InstallerListItem[]));
        hasMore =
          result.items.length === 100 &&
          allResults.length < result.pagination.totalItems;
        page++;
      }

      return allResults;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export interface InstallerListItem {
  id: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string;
  };
  status: string;
  yearsExperience: number;
  maxJobsPerDay: number;
  vehicleType: string;
}

export interface InstallerDetail extends InstallerListItem {
  vehicleReg: string | null;
  equipment: string[];
  maxTravelKm: number | null;
  workingHours: Record<string, { start: string; end: string; working: boolean }>;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  notes: string | null;
  certifications: Certification[];
  skills: Skill[];
  territories: Territory[];
  blockouts: Blockout[];
}

export interface Certification {
  id: string;
  certificationType: string;
  licenseNumber: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  isVerified: boolean;
  documentUrl: string | null;
}

export interface Skill {
  id: string;
  skill: string;
  proficiencyLevel: number;
  yearsExperience: number;
  projectsCompleted: number;
  isVerified: boolean;
}

export interface Territory {
  id: string;
  postcode: string;
  suburb: string | null;
  state: string | null;
  priority: number;
}

export interface Blockout {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  blockoutType: string | null;
}

export interface AvailabilityResult {
  installerId: string;
  dateRange: { startDate: string; endDate: string };
  availability: Record<
    string,
    { available: boolean; reason?: string; existingJobs: number }
  >;
  maxJobsPerDay: number;
}

export interface WorkloadResult {
  installerId: string;
  activeProjects: number;
  upcomingVisits: number;
  thisWeekVisits: number;
}

export interface Suggestion {
  installerId: string;
  name: string;
  score: number;
  skills: Skill[];
  yearsExperience: number;
  reasons: string[];
  warnings: string[];
}

/**
 * Get single installer with full profile
 */
export function useInstaller(installerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.installers.detail(installerId),
    queryFn: () => getInstaller({ data: { id: installerId } }),
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
    queryFn: () =>
      checkAvailability({
        data: { installerId, startDate: startDate!, endDate: endDate! },
      }),
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
    queryFn: () => getInstallerWorkload({ data: { id: installerId } }),
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
    queryFn: () =>
      suggestInstallers({
        data: { postcode, ...normalizedOptions },
      }),
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
    },
  });
}

export function useUpdateCertification() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateCertification);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      // Invalidation handled by component refetching
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
    },
  });
}

export function useVerifyCertification() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(verifyCertification);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
    },
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteCertification);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
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
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateSkill);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteSkill);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
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
    },
  });
}

export function useUpdateTerritory() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateTerritory);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
    },
  });
}

export function useDeleteTerritory() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteTerritory);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.availability(data.installerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.installers.detail(data.installerId),
      });
    },
  });
}

export function useUpdateBlockout() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(updateBlockout);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
    },
  });
}

export function useDeleteBlockout() {
  const queryClient = useQueryClient();
  const serverFn = useServerFn(deleteBlockout);

  return useMutation({
    mutationFn: serverFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installers.all });
    },
  });
}
