/**
 * Composite Project Detail Hook
 *
 * Composes data and UI hooks for backward compatibility.
 * New code should prefer using `useProjectDetailData` and `useProjectDetailUI`
 * separately for better separation of concerns.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 6.2
 * @see STANDARDS.md §2.3 Hook Patterns
 */

import { useCallback, useMemo } from 'react';
import {
  useProjectDetailData,
  type ProjectDetailData,
  type ProjectTeamMember,
  type ProjectDetailActions as DataActions,
} from './use-project-detail-data';
import { useProjectDetailUI } from './use-project-detail-ui';

import type { ProjectStatus } from '@/lib/schemas/jobs/projects';
import type { ProjectAlert } from '@/lib/schemas/jobs/project-alerts';
import type { SiteVisitItem } from '@/lib/schemas/jobs/site-visits';
import type { ProjectTaskResponse } from '@/lib/schemas/jobs/job-tasks';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import type { ProjectWorkstream, ProjectNote, ProjectFile } from '@/lib/schemas/jobs/workstreams-notes';
import type { GetProjectBomResponse } from '@/lib/schemas/jobs/project-bom';

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Re-export types for consumers
export type { ProjectDetailData, ProjectTeamMember };

/**
 * Actions available on the project detail view
 * Extended to include UI-triggering actions
 */
export interface ProjectDetailActions extends DataActions {
  onEdit: () => void;
  onComplete: () => void;
  /** Open activity logging dialog */
  onLogActivity: () => void;
  /** Open follow-up scheduling dialog */
  onScheduleFollowUp: () => void;
}

/**
 * Return type for useProjectDetail hook
 */
export interface UseProjectDetailReturn {
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

  // UI State
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;

  // Dialog States
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  completionDialogOpen: boolean;
  setCompletionDialogOpen: (open: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  activityDialogOpen: boolean;
  setActivityDialogOpen: (open: boolean) => void;

  // Actions (memoized)
  actions: ProjectDetailActions;

  // Derived (computed during render - no useEffect)
  scheduleStatus: 'on-track' | 'at-risk' | 'overdue';
  budgetStatus: 'under' | 'on-target' | 'over';
  nextStatusActions: ProjectStatus[];
  completedTasks: number;
  totalTasks: number;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Composite hook for project detail view.
 *
 * Composes `useProjectDetailData` and `useProjectDetailUI` for convenience.
 * For better separation of concerns, prefer using the individual hooks directly.
 *
 * @example
 * ```tsx
 * // Convenience (backward compatible)
 * const detail = useProjectDetail(projectId);
 *
 * // Preferred (better separation)
 * const data = useProjectDetailData(projectId);
 * const ui = useProjectDetailUI();
 * ```
 */
export function useProjectDetail(projectId: string): UseProjectDetailReturn {
  // Compose data and UI hooks
  const data = useProjectDetailData(projectId);
  const ui = useProjectDetailUI();

  // ─────────────────────────────────────────────────────────────────────────
  // Combined Actions (data actions + UI triggers)
  // ─────────────────────────────────────────────────────────────────────────

  const onDelete = useCallback(async () => {
    await data.actions.onDelete();
    ui.setDeleteDialogOpen(false);
  }, [data.actions, ui]);

  const actions = useMemo((): ProjectDetailActions => ({
    ...data.actions,
    onDelete,
    onEdit: ui.openEditDialog,
    onComplete: ui.openCompletionDialog,
    onLogActivity: ui.openActivityDialog,
    onScheduleFollowUp: ui.openActivityDialog, // Opens same dialog
  }), [data.actions, onDelete, ui.openEditDialog, ui.openCompletionDialog, ui.openActivityDialog]);

  // ─────────────────────────────────────────────────────────────────────────
  // Return Combined State
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // Core Data (from data hook)
    project: data.project,
    siteVisits: data.siteVisits,
    tasks: data.tasks,
    workstreams: data.workstreams,
    bom: data.bom,
    notes: data.notes,
    files: data.files,
    activities: data.activities,
    alerts: data.alerts,

    // Loading States (from data hook)
    isLoading: data.isLoading,
    isLoadingSecondary: data.isLoadingSecondary,
    error: data.error,

    // UI State (from UI hook)
    activeTab: ui.activeTab,
    onTabChange: ui.onTabChange,
    showSidebar: ui.showSidebar,
    toggleSidebar: ui.toggleSidebar,

    // Dialog States (from UI hook)
    deleteDialogOpen: ui.deleteDialogOpen,
    setDeleteDialogOpen: ui.setDeleteDialogOpen,
    completionDialogOpen: ui.completionDialogOpen,
    setCompletionDialogOpen: ui.setCompletionDialogOpen,
    editDialogOpen: ui.editDialogOpen,
    setEditDialogOpen: ui.setEditDialogOpen,
    activityDialogOpen: ui.activityDialogOpen,
    setActivityDialogOpen: ui.setActivityDialogOpen,

    // Combined Actions
    actions,

    // Derived (from data hook)
    scheduleStatus: data.scheduleStatus,
    budgetStatus: data.budgetStatus,
    nextStatusActions: data.nextStatusActions,
    completedTasks: data.completedTasks,
    totalTasks: data.totalTasks,
  };
}
