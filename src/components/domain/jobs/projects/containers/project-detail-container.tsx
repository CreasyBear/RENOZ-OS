/**
 * Project Detail Container
 *
 * Handles data fetching via composite hook and passes data to presenter.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source project from useProjectDetail hook
 * @source siteVisits from useProjectDetail hook (enriched with installerName for tabs)
 * @source workstreams from useProjectDetail hook
 * @source tasks from useProjectDetail hook
 * @source bom from useProjectDetail hook
 * @source notes from useProjectDetail hook
 * @source files from useProjectDetail hook
 * @source activities from useProjectDetail hook
 * @source actions (onDelete, onStatusChange) from useProjectDetail hook
 *
 * @see STANDARDS.md §2 Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 6.2
 */

import { useCallback, useMemo, useState } from 'react';
import { Edit, Trash2, CheckCircle, FileOutput, Award } from 'lucide-react';
import { ErrorState } from '@/components/shared/error-state';
import { EntityHeaderActions } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { toast } from '@/lib/toast';
import { useProjectDetail, useUpdateProjectTask, useRescheduleSiteVisit } from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';
import { format } from 'date-fns';
import { ProjectDetailView } from '../views/project-detail-view';
import { useProjectDetailTabRenderers } from './use-project-detail-tab-renderers';
import { ProjectDetailDialogs } from './project-detail-dialogs';
import { getBomCompletionStats } from '@/lib/schemas/jobs/project-bom';
import type { CompletionValidation } from '@/lib/schemas/jobs/projects';
import type { SiteVisitItem } from '@/lib/schemas/jobs/site-visits';
import { toProjectTabVisit } from '@/lib/schemas/jobs/project-detail';
// Mobile sidebar is now implemented in project-detail-view.tsx
import { useTrackView } from '@/hooks/search';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectDetailContainerRenderProps {
  /** Header action buttons (for PageLayout.Header when using layout pattern) */
  headerActions?: React.ReactNode;
  /** Main content (includes EntityHeader with actions) */
  content: React.ReactNode;
}

export interface ProjectDetailContainerProps {
  /** Project ID to display */
  projectId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Render props pattern for layout composition */
  children?: (props: ProjectDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

import { ProjectDetailSkeleton } from '@/components/skeletons/projects';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectDetailContainer({
  projectId,
  onBack,
  onEdit,
  children,
  className,
}: ProjectDetailContainerProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // Composite Hook (handles all data fetching, state, and mutations)
  // ─────────────────────────────────────────────────────────────────────────
  const detail = useProjectDetail(projectId);
  const { onLogActivity, onScheduleFollowUp, loggerProps: activityLoggerProps } =
    useEntityActivityLogging({
      entityType: 'project',
      entityId: projectId,
      entityLabel: `Project: ${detail.project?.title ?? projectId}`,
    });
  const { getUser } = useUserLookup();
  const updateTask = useUpdateProjectTask(projectId);
  const rescheduleVisit = useRescheduleSiteVisit();
  useTrackView('job', detail.project?.id, detail.project?.title, detail.project?.projectNumber ?? undefined, `/projects/${projectId}`);
  useDetailBreadcrumb(
    `/projects/${projectId}`,
    detail.project ? (detail.project.title || detail.project.projectNumber || projectId) : undefined,
    !!detail.project
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const [isGeneratingWorkOrder, setIsGeneratingWorkOrder] = useState(false);
  const [isGeneratingCompletionCertificate, setIsGeneratingCompletionCertificate] = useState(false);

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit();
    } else {
      detail.setEditDialogOpen(true);
    }
  }, [onEdit, detail]);

  const handleDelete = useCallback(async () => {
    try {
      await detail.actions.onDelete();
      toast.success('Project deleted successfully');
      onBack?.();
    } catch {
      toast.error('Failed to delete project');
    }
  }, [detail.actions, onBack]);

  const handleGenerateWorkOrder = useCallback(async () => {
    if (isGeneratingWorkOrder) return;
    setIsGeneratingWorkOrder(true);
    try {
      await detail.actions.onGenerateWorkOrder();
      toast.success('Work order generated');
    } catch {
      toast.error('Failed to generate work order');
    } finally {
      setIsGeneratingWorkOrder(false);
    }
  }, [detail.actions, isGeneratingWorkOrder]);

  const handleGenerateCompletionCertificate = useCallback(async () => {
    if (isGeneratingCompletionCertificate) return;
    setIsGeneratingCompletionCertificate(true);
    try {
      await detail.actions.onGenerateCompletionCertificate();
      toast.success('Completion certificate generated');
    } catch {
      toast.error('Failed to generate completion certificate');
    } finally {
      setIsGeneratingCompletionCertificate(false);
    }
  }, [detail.actions, isGeneratingCompletionCertificate]);

  // ─────────────────────────────────────────────────────────────────────────
  // Completion validation (for completion dialog)
  // ─────────────────────────────────────────────────────────────────────────
  const completionValidation = ((): CompletionValidation | undefined => {
    const bomStats = getBomCompletionStats(detail.bom);
    return {
      completedTasks: detail.completedTasks,
      totalTasks: detail.totalTasks,
      installedBomItems: bomStats.installedBomItems,
      totalBomItems: bomStats.totalBomItems,
    };
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const canComplete = detail.project
    ? !['completed', 'cancelled'].includes(detail.project.status)
    : false;

  // ─────────────────────────────────────────────────────────────────────────
  // Related Links (Cross-Entity Navigation - WORKFLOW-CONTINUITY P3)
  // ─────────────────────────────────────────────────────────────────────────
  const relatedLinks = useMemo(() => {
    const siteVisits = detail.siteVisits ?? [];
    const firstVisitWithInstaller = siteVisits.find(
      (v: SiteVisitItem) => v.installerId
    );
    const installerId = firstVisitWithInstaller?.installerId ?? null;
    const installerUser = installerId ? getUser(installerId) : null;
    return {
      orderId: detail.project?.orderId ?? null,
      installerId: installerId ?? null,
      installerName: installerUser?.name ?? installerUser?.email ?? null,
    };
  }, [detail.siteVisits, detail.project?.orderId, getUser]);

  // Enrich site visits with installerName and normalize to ProjectTabVisit for tab renderers (SCHEMA-TRACE §8)
  const enrichedSiteVisits = useMemo(() => {
    const visits = detail.siteVisits ?? [];
    return visits.map((v: SiteVisitItem) => {
      const installerUser = v.installerId ? getUser(v.installerId) : null;
      return toProjectTabVisit({
        ...v,
        installerName: installerUser?.name ?? installerUser?.email ?? undefined,
      });
    });
  }, [detail.siteVisits, getUser]);

  // ─────────────────────────────────────────────────────────────────────────
  // Tab Content Renderers (extracted to hook)
  // ─────────────────────────────────────────────────────────────────────────
  const workstreamNames = useMemo(() => {
    const w = detail.workstreams ?? [];
    return Object.fromEntries(w.map((ws) => [ws.id, ws.name]));
  }, [detail.workstreams]);

  const handleGanttDateChange = useCallback(
    async (taskId: string, visitId: string | undefined, isTask: boolean, startDate: Date, _endDate: Date) => {
      const dateStr = format(startDate, 'yyyy-MM-dd');
      try {
        if (isTask) {
          await updateTask.mutateAsync({ taskId, dueDate: dateStr });
          toast.success('Task date updated');
        } else if (visitId) {
          await rescheduleVisit.mutateAsync({ siteVisitId: visitId, scheduledDate: dateStr });
          toast.success('Visit rescheduled');
        }
      } catch {
        toast.error(isTask ? 'Failed to update task date' : 'Failed to reschedule visit');
      }
    },
    [updateTask, rescheduleVisit]
  );

  const tabs = useProjectDetailTabRenderers({
    project: detail.project,
    siteVisits: enrichedSiteVisits,
    tasks: detail.tasks ?? [],
    workstreamNames,
    onGanttDateChange: handleGanttDateChange,
    onGenerateWorkOrder: handleGenerateWorkOrder,
    onGenerateCompletionCertificate: handleGenerateCompletionCertificate,
    isGeneratingWorkOrder,
    isGeneratingCompletionCertificate,
    onCompleteProjectClick: canComplete ? detail.actions.onComplete : undefined,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.isLoading) {
    const loadingContent = <ProjectDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({ headerActions: <Skeleton className="h-10 w-32" />, content: loadingContent })}
        </>
      );
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.error || !detail.project) {
    const errorContent = (
      <ErrorState
        title="Project not found"
        message="The project you're looking for doesn't exist or has been deleted."
        onRetry={detail.actions.onRefresh}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({ headerActions: null, content: errorContent })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: EntityHeader actions (per DETAIL-VIEW-STANDARDS)
  // ─────────────────────────────────────────────────────────────────────────
  const primaryAction = canComplete
    ? {
        label: 'Complete',
        onClick: detail.actions.onComplete,
        icon: <CheckCircle className="h-4 w-4" />,
      }
    : undefined;

  const secondaryActions = [
    { label: 'Edit Project', onClick: handleEdit, icon: <Edit className="h-4 w-4" /> },
    { label: 'Generate Work Order', onClick: handleGenerateWorkOrder, icon: <FileOutput className="h-4 w-4" />, disabled: isGeneratingWorkOrder },
    ...(detail.project.status === 'completed'
      ? [
          {
            label: 'Generate Completion Certificate',
            onClick: handleGenerateCompletionCertificate,
            icon: <Award className="h-4 w-4" />,
            disabled: isGeneratingCompletionCertificate,
          },
        ]
      : []),
    { label: 'Delete Project', onClick: () => detail.setDeleteDialogOpen(true), icon: <Trash2 className="h-4 w-4" />, destructive: true },
  ];

  const headerActions = children ? (
    <EntityHeaderActions
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      onEdit={handleEdit}
      onDelete={() => detail.setDeleteDialogOpen(true)}
    />
  ) : undefined;

  const actionPropsForView = children
    ? { primaryAction: undefined, secondaryActions: [], onEdit: undefined, onDelete: undefined }
    : {
        primaryAction,
        secondaryActions,
        onEdit: handleEdit,
        onDelete: () => detail.setDeleteDialogOpen(true),
      };

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <>
      <ProjectDetailView
        project={detail.project}
        alerts={detail.alerts}
        activeTab={detail.activeTab}
        onTabChange={detail.onTabChange}
        showSidebar={detail.showSidebar}
        primaryAction={actionPropsForView.primaryAction}
        secondaryActions={actionPropsForView.secondaryActions}
        onEdit={actionPropsForView.onEdit}
        onDelete={actionPropsForView.onDelete}
        onToggleSidebar={detail.toggleSidebar}
        activities={detail.activities}
        activitiesLoading={detail.isLoadingSecondary}
        scheduleStatus={detail.scheduleStatus}
        budgetStatus={detail.budgetStatus}
        completedTasks={detail.completedTasks}
        totalTasks={detail.totalTasks}
        tabCounts={{
          workstreams: detail.workstreams?.length,
          tasks: detail.totalTasks,
          notes: detail.notes?.length,
          files: detail.files?.length,
        }}
        renderOverviewTab={tabs.renderOverviewTab}
        renderWorkstreamsTab={tabs.renderWorkstreamsTab}
        renderVisitsTab={tabs.renderVisitsTab}
        renderTasksTab={tabs.renderTasksTab}
        renderBomTab={tabs.renderBomTab}
        renderNotesTab={tabs.renderNotesTab}
        renderFilesTab={tabs.renderFilesTab}
        renderDocumentsTab={tabs.renderDocumentsTab}
        onLogActivity={onLogActivity}
        onScheduleFollowUp={onScheduleFollowUp}
        relatedLinks={relatedLinks}
        className={className}
      />

      <ProjectDetailDialogs
        projectId={projectId}
        project={detail.project}
        activityLoggerProps={activityLoggerProps}
        siteVisitCreateOpen={tabs.siteVisitCreateOpen}
        setSiteVisitCreateOpen={tabs.setSiteVisitCreateOpen}
        deleteDialogOpen={detail.deleteDialogOpen}
        setDeleteDialogOpen={detail.setDeleteDialogOpen}
        onDelete={handleDelete}
        completionDialogOpen={detail.completionDialogOpen}
        setCompletionDialogOpen={detail.setCompletionDialogOpen}
        completionValidation={completionValidation}
        editDialogOpen={detail.editDialogOpen}
        setEditDialogOpen={detail.setEditDialogOpen}
      />
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: With Render Props or Default
  // ─────────────────────────────────────────────────────────────────────────
  if (children) {
    return <>{children({ headerActions, content })}</>;
  }

  // Default rendering (standalone usage) - content has EntityHeader with actions
  return <div className={className}>{content}</div>;
}

export default ProjectDetailContainer;
