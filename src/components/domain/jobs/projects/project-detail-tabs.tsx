/**
 * Project Detail Tabs Components
 *
 * Tab content components for the project detail page.
 * Follows container/presenter pattern from STANDARDS.md.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-03: Integrated with workstreams, notes, files backend
 *
 * @source workstreams from useWorkstreams hook
 * @source notes from useNotes hook
 * @source files from useFiles hook
 */

import { useState, useCallback } from 'react';
import {
  Plus,
  MapPin,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { toast } from '@/lib/toast';

// Enhanced Components
import { ProjectBomTab as EnhancedProjectBomTab } from './project-bom-tab';
import { ProjectTasksTab as EnhancedProjectTasksTab } from './project-tasks-tab';
import { ProjectNotesTab as EnhancedProjectNotesTab } from './project-notes-tab';
import { ProjectFilesTab as EnhancedProjectFilesTab } from './project-files-tab';

// Dialogs
import {
  WorkstreamCreateDialog,
} from './';

// Hooks
import {
  formatProjectWorkstreamMutationError,
  useWorkstreams,
  useDeleteWorkstream,
  useReorderWorkstreams,
} from '@/hooks/jobs';
import { useConfirmation, confirmations } from '@/hooks/_shared/use-confirmation';



// Presentation components
import { ProjectWorkstreamsView } from '@/components/jobs/presentation/workstreams/ProjectWorkstreamsView';

// Import overview components
import {
  ProjectDescriptionCard,
  ScopeColumns,
  OutcomesList,
  KeyFeaturesColumns,
} from './project-overview-panels';
import { ProjectTimelineGantt } from './project-timeline-gantt';

// ============================================================================
// TYPES
// ============================================================================

import type {
  ProjectTabData,
  ProjectTabVisit,
  ProjectTimelineTask,
} from '@/lib/schemas/jobs/project-detail';
import {
  tasksToProjectTimelineTasks,
  visitsToProjectTimelineTasks,
} from '@/lib/schemas/jobs/project-detail';

export type { ProjectTabData };
export { ProjectVisitsTab } from './project-visits-tab';

interface TabProps {
  project: ProjectTabData;
}

// ============================================================================
// OVERVIEW TAB - ENHANCED
// ============================================================================

interface ProjectOverviewTabProps extends TabProps {
  /** Job tasks (TaskResponse) - when provided, shown in Gantt; otherwise visits used */
  tasks?: unknown[];
  visits?: ProjectTabVisit[];
  /** Workstream id->name for task labels */
  workstreamNames?: Record<string, string>;
  /** Called when user drags/resizes a Gantt bar */
  onDateChange?: (taskId: string, visitId: string | undefined, isTask: boolean, startDate: Date, endDate: Date) => void;
}

export function ProjectOverviewTab({
  project,
  tasks = [],
  visits = [],
  workstreamNames,
  onDateChange,
}: ProjectOverviewTabProps) {
  const safeVisits = Array.isArray(visits) ? visits : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const navigate = useNavigate();
  const timelineTasks: ProjectTimelineTask[] =
    safeTasks.length > 0
      ? tasksToProjectTimelineTasks(
          safeTasks as Parameters<typeof tasksToProjectTimelineTasks>[0],
          workstreamNames
        )
      : visitsToProjectTimelineTasks(
          safeVisits as Parameters<typeof visitsToProjectTimelineTasks>[0]
        );

  const handleGanttItemClick = useCallback(
    (task: ProjectTimelineTask) => {
      if (task.visitId) {
        navigate({
          to: '/projects/$projectId/visits/$visitId',
          params: { projectId: project.id, visitId: task.visitId },
        });
      } else if (task.isTask) {
        navigate({
          to: '/projects/$projectId',
          params: { projectId: project.id },
          search: { tab: 'tasks' },
        });
      }
    },
    [navigate, project.id]
  );

  return (
    <div className="space-y-6">
      {/* Description */}
      <ProjectDescriptionCard description={project.description} />

      {/* Scope */}
      <ScopeColumns scope={project.scope} />

      {/* Outcomes */}
      <OutcomesList outcomes={project.outcomes} />

      {/* Key Features */}
      <KeyFeaturesColumns features={project.keyFeatures} />

      {/* Timeline Gantt */}
      <ProjectTimelineGantt
        tasks={timelineTasks}
        projectStartDate={project.startDate ? new Date(project.startDate) : undefined}
        projectEndDate={project.targetCompletionDate ? new Date(project.targetCompletionDate) : undefined}
        onItemClick={handleGanttItemClick}
        onDateChange={
          onDateChange
            ? (taskId, startDate, endDate) => {
                const task = timelineTasks.find((t) => t.id === taskId);
                onDateChange(taskId, task?.visitId, !!task?.isTask, startDate, endDate);
              }
            : undefined
        }
      />

      {/* Site Address Card */}
      {project.siteAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Site Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-0.5">
              <p>{project.siteAddress.street}</p>
              <p>
                {project.siteAddress.city}, {project.siteAddress.state}{' '}
                {project.siteAddress.postalCode}
              </p>
              <p className="text-muted-foreground">{project.siteAddress.country}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// WORKSTREAMS TAB - CONTAINER
// ============================================================================

/**
 * Project Workstreams Tab Container
 * @source workstreams from useWorkstreams hook
 * @source createWorkstream from useCreateWorkstream mutation
 * @source deleteWorkstream from useDeleteWorkstream mutation
 */
export function ProjectWorkstreamsTab({ project }: TabProps) {
  // Data fetching
  const { data: workstreamsData, isLoading, error, refetch } = useWorkstreams(project.id);
  const workstreams = workstreamsData?.data || [];

  // Mutations
  const deleteWorkstream = useDeleteWorkstream(project.id);
  const reorderWorkstreams = useReorderWorkstreams(project.id);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleAddWorkstream = () => {
    setCreateDialogOpen(true);
  };

  const confirmation = useConfirmation();
  const handleDeleteWorkstream = async (workstream: { id: string; name: string }) => {
    const { confirmed } = await confirmation.confirm(confirmations.delete(workstream.name, 'workstream'));
    if (!confirmed) return;
    try {
      await deleteWorkstream.mutateAsync(workstream.id);
      toast.success('Workstream deleted');
    } catch (error) {
      toast.error(formatProjectWorkstreamMutationError(error, 'delete'));
    }
  };

  const handleReorderWorkstreams = async (workstreamIds: string[]) => {
    try {
      await reorderWorkstreams.mutateAsync(workstreamIds);
      toast.success('Workstreams reordered');
    } catch (error) {
      toast.error(formatProjectWorkstreamMutationError(error, 'reorder'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Workstreams</h3>
          <p className="text-sm text-muted-foreground">
            Organize project tasks by phase or work area. Drag to reorder.
          </p>
        </div>
        <Button onClick={handleAddWorkstream}>
          <Plus className="mr-2 h-4 w-4" />
          Add Workstream
        </Button>
      </div>

      <ProjectWorkstreamsView
        workstreams={workstreams}
        onAddWorkstream={handleAddWorkstream}
        onDeleteWorkstream={handleDeleteWorkstream}
        onReorderWorkstreams={handleReorderWorkstreams}
        isLoading={isLoading}
        isReorderable={workstreams.length > 1}
        error={error as Error | null}
        hasData={workstreamsData !== undefined}
        onRetry={() => {
          void refetch();
        }}
      />

      <WorkstreamCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={project.id}
      />
    </div>
  );
}

// ============================================================================
// TASKS TAB - CONTAINER
// ============================================================================

/**
 * Project Tasks Tab Container
 * Full-featured task management with workstream grouping
 */
export function ProjectTasksTab({
  project,
  onCompleteProjectClick,
}: TabProps & { onCompleteProjectClick?: () => void }) {
  return (
    <EnhancedProjectTasksTab
      projectId={project.id}
      onCompleteProjectClick={onCompleteProjectClick}
    />
  );
}

// ============================================================================
// BOM TAB - CONTAINER
// ============================================================================

/**
 * Project BOM Tab Container
 * Full materials management with cost tracking
 */
export function ProjectBomTab({ project }: TabProps) {
  return (
    <EnhancedProjectBomTab
      projectId={project.id}
      orderId={project.orderId ?? undefined}
    />
  );
}

// ============================================================================
// NOTES TAB - CONTAINER
// ============================================================================

/**
 * Project Notes Tab Container
 * Delegates to enhanced ProjectNotesTab
 */
export function ProjectNotesTab({ project }: TabProps) {
  return <EnhancedProjectNotesTab projectId={project.id} />;
}

// ============================================================================
// FILES TAB - CONTAINER
// ============================================================================

/**
 * Project Files Tab Container
 * Delegates to enhanced ProjectFilesTab
 */
export function ProjectFilesTab({ project }: TabProps) {
  return <EnhancedProjectFilesTab projectId={project.id} />;
}
