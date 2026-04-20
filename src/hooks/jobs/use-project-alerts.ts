/**
 * Project Alerts Hook
 *
 * TanStack Query hook for fetching project health alerts.
 * Uses centralized query keys per STANDARDS.md.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 6.0 Blocker 2
 * @see STANDARDS.md §3 Query Key Rules
 */

import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import { getProjectAlerts } from '@/server/functions/jobs/project-alerts';
import type { ProjectAlert } from '@/lib/schemas/jobs/project-alerts';

// ============================================================================
// TYPES
// ============================================================================

export interface UseProjectAlertsOptions {
  /** Whether the query should execute */
  enabled?: boolean;
}

export interface UseProjectAlertsReturn {
  /** Array of computed alerts */
  alerts: ProjectAlert[];
  /** Whether the query has a usable payload, even if it is currently stale */
  hasData: boolean;
  /** Whether alerts are loading */
  isLoading: boolean;
  /** Whether alerts failed to load */
  isError: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch alerts */
  refetch: () => Promise<unknown>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Fetches project health alerts.
 *
 * @example
 * ```tsx
 * const { alerts, isLoading } = useProjectAlerts(projectId);
 *
 * if (isLoading) return <AlertsSkeleton />;
 * return <ProjectAlerts alerts={alerts} />;
 * ```
 */
export function useProjectAlerts(
  projectId: string,
  options?: UseProjectAlertsOptions
): UseProjectAlertsReturn {
  const getAlertsFn = useServerFn(getProjectAlerts);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.projects.alerts(projectId),
    queryFn: async () => {
      try {
        return await getAlertsFn({
          data: { projectId },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage:
            'Project alerts are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested project could not be found.',
        });
      }
    },
    staleTime: 60 * 1000, // 1 minute - alerts should be fresh
    enabled: options?.enabled !== false && !!projectId,
  });

  return {
    alerts: data ?? [],
    hasData: data !== undefined,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type { ProjectAlert, ProjectAlertType, AlertSeverity } from '@/lib/schemas/jobs/project-alerts';
