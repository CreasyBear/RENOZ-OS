/**
 * Project Detail Data Hook
 *
 * Pure data fetching hook for project detail view.
 * Fetches data in parallel per Vercel React Best Practices (async-parallel).
 * Separated from UI state per STANDARDS.md.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 6.2
 * @see STANDARDS.md §2.3 Hook Patterns
 */

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Import from specific files to avoid circular imports (STANDARDS.md compliance)
import { logger } from '@/lib/logger';
import { useProject, useDeleteProject, useUpdateProject } from './use-projects';
import { useSiteVisitsByProject } from './use-site-visits';
import { useWorkstreams } from './use-workstreams';
import { useNotes } from './use-notes';
import { useFiles } from './use-files';
import { useProjectBom } from './use-project-bom';
import { useProjectTasks } from './use-project-tasks';
import { useProjectAlerts } from './use-project-alerts';
import { useUnifiedActivities } from '@/hooks/activities';
import {
  useGenerateWorkOrder,
  useGenerateCompletionCertificate,
} from '@/hooks/documents';

import type { ProjectStatus } from '@/lib/schemas/jobs/projects';
import type { ProjectAlert } from '@/lib/schemas/jobs/project-alerts';
import type { SiteVisitItem } from '@/lib/schemas/jobs/site-visits';
import type { ProjectTaskResponse } from '@/lib/schemas/jobs/job-tasks';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import type { ProjectWorkstream, ProjectNote, ProjectFile } from '@/lib/schemas/jobs/workstreams-notes';
import type { GetProjectBomResponse } from '@/lib/schemas/jobs/project-bom';
import {
  type ProjectDetailData,
  type ProjectTeamMember,
  type ScheduleStatus,
  type BudgetStatus,
  transformToProjectDetailData,
} from '@/lib/schemas/jobs/project-detail';

// Re-export canonical types
export type { ProjectDetailData, ProjectTeamMember, ScheduleStatus, BudgetStatus };

/**
 * Actions available on the project detail view
 */
export interface ProjectDetailActions {
  onUpdateStatus: (status: ProjectStatus) => Promise<void>;
  onDelete: () => Promise<void>;
  onRefresh: () => void;
  onGenerateWorkOrder: () => Promise<void>;
  onGenerateCompletionCertificate: () => Promise<void>;
}

/**
 * Return type for useProjectDetailData hook
 */
export interface UseProjectDetailDataReturn {
  // Core Data
  project: ProjectDetailData | null;
  siteVisits: SiteVisitItem[];
  tasks: ProjectTaskResponse[];
  workstreams: ProjectWorkstream[];
  bom: GetProjectBomResponse | null;
  notes: ProjectNote[];
  files: ProjectFile[];
  activities: UnifiedActivity[];
  alerts: ProjectAlert[];

  // Loading States
  isLoading: boolean;
  isLoadingSecondary: boolean;
  error: Error | null;

  // Actions
  actions: ProjectDetailActions;

  // Mutation States (for loading indicators)
  isDeleting: boolean;
  isUpdating: boolean;

  // Derived (computed during render - no useEffect)
  scheduleStatus: ScheduleStatus;
  budgetStatus: BudgetStatus;
  nextStatusActions: ProjectStatus[];
  completedTasks: number;
  totalTasks: number;
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  quoting: ['approved', 'cancelled'],
  approved: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Data-only hook for project detail view.
 *
 * Fetches all project-related data in parallel and provides
 * data transformation and derived state calculations.
 *
 * Use with `useProjectDetailUI` for complete functionality.
 *
 * @example
 * ```tsx
 * const data = useProjectDetailData(projectId);
 * const ui = useProjectDetailUI();
 *
 * if (data.isLoading) return <Skeleton />;
 * if (data.error || !data.project) return <ErrorState />;
 *
 * return <ProjectDetailView {...data} {...ui} />;
 * ```
 */
export function useProjectDetailData(projectId: string): UseProjectDetailDataReturn {
  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching (Parallel - Vercel async-parallel pattern)
  // ─────────────────────────────────────────────────────────────────────────

  // Core project data (blocks initial render)
  const projectQuery = useProject({ projectId });

  // Secondary data (loads in parallel, doesn't block)
  const siteVisitsQuery = useSiteVisitsByProject(projectId);
  const workstreamsQuery = useWorkstreams(projectId);
  const notesQuery = useNotes(projectId);
  const filesQuery = useFiles(projectId);
  const bomQuery = useProjectBom({ projectId });
  const tasksQuery = useProjectTasks({ projectId });
  const alertsQuery = useProjectAlerts(projectId);
  const activitiesQuery = useUnifiedActivities({
    entityType: 'project',
    entityId: projectId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteProject();
  const updateMutation = useUpdateProject();
  const workOrderMutation = useGenerateWorkOrder();
  const completionCertMutation = useGenerateCompletionCertificate();

  // ─────────────────────────────────────────────────────────────────────────
  // Transform Data (using canonical transformation)
  // ─────────────────────────────────────────────────────────────────────────
  const project = useMemo((): ProjectDetailData | null => {
    if (!projectQuery.data) return null;
    try {
      return transformToProjectDetailData(projectQuery.data);
    } catch (error) {
      logger.error('[useProjectDetailData] Failed to transform project data', error);
      throw error;
    }
  }, [projectQuery.data]);

  // Extract data from queries (typed from hooks)
  const siteVisits = useMemo((): SiteVisitItem[] => {
    return siteVisitsQuery.data?.items ?? [];
  }, [siteVisitsQuery.data]);

  const tasks = useMemo((): ProjectTaskResponse[] => {
    const data = tasksQuery.data;
    return Array.isArray(data) ? data : [];
  }, [tasksQuery.data]);

  const workstreams = useMemo((): ProjectWorkstream[] => {
    const res = workstreamsQuery.data;
    return res?.data ?? [];
  }, [workstreamsQuery.data]);

  const notes = useMemo((): ProjectNote[] => {
    const res = notesQuery.data;
    return res?.data ?? [];
  }, [notesQuery.data]);

  const files = useMemo((): ProjectFile[] => {
    const res = filesQuery.data;
    return res?.data ?? [];
  }, [filesQuery.data]);

  const bom = bomQuery.data ?? null;
  const alerts = alertsQuery.alerts;
  const activities: UnifiedActivity[] = activitiesQuery.activities ?? [];

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State (computed during render - no useEffect)
  // ─────────────────────────────────────────────────────────────────────────

  const scheduleStatus = useMemo((): ScheduleStatus => {
    if (!project?.targetCompletionDate) return 'on-track';

    const target = new Date(project.targetCompletionDate);
    const today = new Date();

    if (project.actualCompletionDate) return 'on-track'; // Completed

    const daysUntilDue = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 7) return 'at-risk';
    return 'on-track';
  }, [project?.targetCompletionDate, project?.actualCompletionDate]);

  const budgetStatus = useMemo((): BudgetStatus => {
    const estimated = project?.estimatedTotalValue
      ? parseFloat(String(project.estimatedTotalValue))
      : 0;
    const actual = project?.actualTotalCost
      ? parseFloat(String(project.actualTotalCost))
      : 0;

    if (!estimated || !actual) return 'on-target';

    const variance = ((actual - estimated) / estimated) * 100;

    if (variance <= -5) return 'under';
    if (variance >= 5) return 'over';
    return 'on-target';
  }, [project]);

  const nextStatusActions = useMemo((): ProjectStatus[] => {
    if (!project?.status) return [];
    return STATUS_TRANSITIONS[project.status] ?? [];
  }, [project]);

  const { completedTasks, totalTasks } = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return { completedTasks: completed, totalTasks: tasks.length };
  }, [tasks]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions (pure - no UI state dependencies)
  // ─────────────────────────────────────────────────────────────────────────

  const actions = useMemo((): ProjectDetailActions => ({
    onDelete: async () => {
      await deleteMutation.mutateAsync(projectId);
    },

    onUpdateStatus: async (status: ProjectStatus) => {
      await updateMutation.mutateAsync({ projectId, status });
    },

    onRefresh: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },

    onGenerateWorkOrder: async () => {
      await workOrderMutation.mutateAsync({ projectId });
    },

    onGenerateCompletionCertificate: async () => {
      await completionCertMutation.mutateAsync({ projectId });
    },
  }), [
    projectId,
    queryClient,
    deleteMutation,
    updateMutation,
    workOrderMutation,
    completionCertMutation,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading States
  // ─────────────────────────────────────────────────────────────────────────

  const isLoading = projectQuery.isLoading;
  const isLoadingSecondary =
    siteVisitsQuery.isLoading ||
    tasksQuery.isLoading ||
    bomQuery.isLoading ||
    notesQuery.isLoading ||
    filesQuery.isLoading;

  const error = projectQuery.error instanceof Error ? projectQuery.error : projectQuery.error ? new Error(String(projectQuery.error)) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // Core Data
    project,
    siteVisits,
    tasks,
    workstreams,
    bom,
    notes,
    files,
    activities,
    alerts,

    // Loading States
    isLoading,
    isLoadingSecondary,
    error,

    // Actions
    actions,

    // Mutation States
    isDeleting: deleteMutation.isPending,
    isUpdating: updateMutation.isPending,

    // Derived
    scheduleStatus,
    budgetStatus,
    nextStatusActions,
    completedTasks,
    totalTasks,
  };
}
