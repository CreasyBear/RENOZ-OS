/**
 * SLA Hooks
 *
 * TanStack Query hooks for SLA configuration and tracking.
 *
 * @see src/server/functions/support/sla.ts
 * @see src/lib/query-keys.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, type SlaConfigurationFilters } from '@/lib/query-keys';
import {
  getSlaConfigurations,
  getSlaConfiguration,
  getDefaultSlaConfiguration,
  createSlaConfiguration,
  updateSlaConfiguration,
  hasSlsConfigurations,
  seedDefaultSlaConfigurations,
  getSlaMetrics,
  getSlaReportByIssueType,
  getSlaState,
  getSlaEvents,
  startSlaTracking,
  pauseSla,
  resumeSla,
  recordSlaResponse,
  recordSlaResolution,
} from '@/server/functions/support/sla';

// ============================================================================
// SLA CONFIGURATION HOOKS
// ============================================================================

/**
 * Fetch SLA configurations for the organization
 */
export function useSlaConfigurations(filters?: SlaConfigurationFilters) {
  return useQuery({
    queryKey: queryKeys.support.slaConfigurationsList(filters),
    queryFn: () => getSlaConfigurations({ data: filters ?? {} }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single SLA configuration by ID
 */
export function useSlaConfiguration(configurationId: string) {
  return useQuery({
    queryKey: queryKeys.support.slaConfigurationDetail(configurationId),
    queryFn: () => getSlaConfiguration({ data: { configurationId } }),
    enabled: !!configurationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the default SLA configuration for a domain
 */
export function useDefaultSlaConfiguration(domain: 'support' | 'warranty' | 'jobs') {
  return useQuery({
    queryKey: queryKeys.support.slaConfigurationDefault(domain),
    queryFn: () => getDefaultSlaConfiguration({ data: { domain } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if the organization has SLA configurations
 */
export function useHasSlaConfigurations(domain?: 'support' | 'warranty' | 'jobs') {
  return useQuery({
    queryKey: queryKeys.support.slaHasConfigurations(domain),
    queryFn: () => hasSlsConfigurations({ data: { domain } }),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new SLA configuration
 */
export function useCreateSlaConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createSlaConfiguration>[0]['data']) =>
      createSlaConfiguration({ data }),
    onSuccess: (result) => {
      // Invalidate all SLA configuration lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaConfigurations(),
      });
    },
  });
}

/**
 * Update an SLA configuration
 */
export function useUpdateSlaConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof updateSlaConfiguration>[0]['data']) =>
      updateSlaConfiguration({ data }),
    onSuccess: (result) => {
      // Invalidate lists and the specific config detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaConfigurations(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaConfigurationDetail(result.id),
      });
    },
  });
}

/**
 * Seed default SLA configurations for the organization
 */
export function useSeedDefaultSlaConfigurations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: {
      skipExisting?: boolean;
      domains?: ('support' | 'warranty' | 'jobs')[];
    }) => seedDefaultSlaConfigurations({ data: data ?? {} }),
    onSuccess: () => {
      // Invalidate all SLA-related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaConfigurations(),
      });
    },
  });
}

// ============================================================================
// SLA METRICS HOOKS
// ============================================================================

/**
 * Fetch SLA metrics for the organization
 */
export function useSlaMetrics(filters?: {
  domain?: 'support' | 'warranty' | 'jobs';
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: queryKeys.support.slaMetrics(filters),
    queryFn: () => getSlaMetrics({ data: filters ?? {} }),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch SLA report broken down by issue type
 */
export function useSlaReportByIssueType(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: queryKeys.support.slaReportByIssueType(filters),
    queryFn: () => getSlaReportByIssueType({ data: filters ?? {} }),
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// SLA TRACKING HOOKS
// ============================================================================

/**
 * Fetch SLA tracking state snapshot
 */
export function useSlaState(trackingId: string) {
  return useQuery({
    queryKey: queryKeys.support.slaTrackingState(trackingId),
    queryFn: () => getSlaState({ data: { trackingId } }),
    enabled: !!trackingId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch SLA events for a tracking record
 */
export function useSlaEvents(trackingId: string) {
  return useQuery({
    queryKey: queryKeys.support.slaTrackingEvents(trackingId),
    queryFn: () => getSlaEvents({ data: { trackingId } }),
    enabled: !!trackingId,
    staleTime: 30 * 1000,
  });
}

/**
 * Start SLA tracking for an entity
 */
export function useStartSlaTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof startSlaTracking>[0]['data']) =>
      startSlaTracking({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTracking(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaMetrics(),
      });
    },
  });
}

/**
 * Pause SLA tracking
 */
export function usePauseSla() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof pauseSla>[0]['data']) =>
      pauseSla({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTrackingState(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTrackingEvents(result.id),
      });
    },
  });
}

/**
 * Resume SLA tracking
 */
export function useResumeSla() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof resumeSla>[0]['data']) =>
      resumeSla({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTrackingState(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTrackingEvents(result.id),
      });
    },
  });
}

/**
 * Record response on SLA tracking
 */
export function useRecordSlaResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof recordSlaResponse>[0]['data']) =>
      recordSlaResponse({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTrackingState(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTrackingEvents(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaMetrics(),
      });
    },
  });
}

/**
 * Record resolution on SLA tracking
 */
export function useRecordSlaResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof recordSlaResolution>[0]['data']) =>
      recordSlaResolution({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTrackingState(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaTrackingEvents(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.slaMetrics(),
      });
    },
  });
}
