/**
 * Project Tasks Tab - Enhanced
 *
 * Full-featured task management with:
 * - Priority badges (urgent, high, normal, low)
 * - Due dates with overdue warnings
 * - Assignee avatars
 * - Estimated hours
 * - Status workflow (checkbox toggle)
 * - Workstream grouping
 * - Inline quick actions
 *
 * @source tasks from useProjectTasks hook
 * @source workstreams from useWorkstreams hook
 * @source users from useUserLookup hook
 * @source mutations from useUpdateJobTaskStatus, useDeleteProjectTask hooks
 *
 * SPRINT-03: Enhanced task tab maximizing schema potential
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/lib/toast';

// Hooks
import {
  formatProjectTaskMutationError,
  useProjectTasks,
  useDeleteProjectTask,
  useWorkstreams,
  useSiteVisitsByProject,
} from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';
import { DEFAULT_TASK_FILTERS } from './project-task-config';
import { ProjectTaskCompletionCta } from './project-task-completion-cta';
import {
  ProjectTaskActiveFilterChips,
  ProjectTaskFilterPopover,
  ProjectTaskSortDropdown,
} from './project-task-filter-controls';
import { useProjectTaskQuickAdd } from './project-task-quick-add';
import { useProjectTaskReorderMutation } from './project-task-reorder-mutation';
import { ProjectTaskSummaryCards } from './project-task-summary-cards';
import { useProjectTaskRouteState } from './project-task-route-state';
import { useProjectTaskStatusMutation } from './project-task-status-mutation';
import {
  ProjectTasksCachedWarning,
  ProjectTasksEmptyState,
  ProjectTasksFilteredEmptyState,
  ProjectTasksLoadingState,
  ProjectTasksUnavailableState,
} from './project-task-states';
import {
  areAllProjectTasksComplete,
  buildProjectTaskViewModels,
  filterProjectTasks,
  getProjectTaskCounts,
  groupProjectTasksByWorkstream,
  hasProjectTaskActiveFilters,
  sortProjectTasks,
} from './project-task-view-model';
import { ProjectTaskWorkstreamGroup } from './project-task-workstream-group';

// Types
import type {
  TaskWithWorkstream,
} from '@/lib/schemas/jobs';

// Dialogs
import { TaskCreateDialog, TaskEditDialog } from './task-dialogs';
import { KanbanQuickAdd } from '@/components/shared/kanban';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectTasksTabProps {
  projectId: string;
  /** When provided, show "All tasks complete" CTA and open completion dialog on click */
  onCompleteProjectClick?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectTasksTab({ projectId, onCompleteProjectClick }: ProjectTasksTabProps) {
  const { data: tasksData, error, isLoading, refetch } = useProjectTasks({ projectId });
  const { data: workstreamsData } = useWorkstreams(projectId);
  const { data: siteVisitsData } = useSiteVisitsByProject(projectId);
  const deleteTask = useDeleteProjectTask(projectId);
  const { getUser, currentUserId } = useUserLookup();
  const { filters, sortBy, updateFilters, updateSort } = useProjectTaskRouteState(projectId);

  const siteVisits = useMemo(
    () => siteVisitsData?.items ?? [],
    [siteVisitsData?.items]
  );
  const { handleQuickAdd, isQuickAddPending } = useProjectTaskQuickAdd({
    projectId,
    siteVisits,
  });

  const [editingTask, setEditingTask] = useState<TaskWithWorkstream | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Undo deletion pattern - track tasks pending deletion
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const deleteTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    const timeouts = deleteTimeouts.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  // Get workstreams for grouping
  const workstreams = useMemo(
    () => workstreamsData?.data ?? [],
    [workstreamsData?.data]
  );

  // Build task view model
  const allTasks = useMemo(() => {
    return buildProjectTaskViewModels({
      tasks: tasksData || [],
      workstreams,
      siteVisits,
      getUser,
    });
  }, [tasksData, workstreams, siteVisits, getUser]);

  // Calculate counts for filter UI
  const taskCounts = useMemo(() => getProjectTaskCounts(allTasks), [allTasks]);

  // Apply filters (including pending deletion exclusion)
  const filteredTasks = useMemo(() => {
    return filterProjectTasks({
      tasks: allTasks,
      filters,
      currentUserId,
      pendingDeletions,
    });
  }, [allTasks, filters, currentUserId, pendingDeletions]);

  // Apply sorting
  const tasks = useMemo(() => {
    return sortProjectTasks(filteredTasks, sortBy);
  }, [filteredTasks, sortBy]);

  // Group by workstream
  const groupedTasks = useMemo(() => {
    return groupProjectTasksByWorkstream({ tasks, workstreams });
  }, [tasks, workstreams]);

  const { handleToggleTask } = useProjectTaskStatusMutation({
    projectId,
    tasks,
    onCompleteProjectClick,
  });
  const { handleReorderTasks } = useProjectTaskReorderMutation({ tasks });

  const handleDeleteTask = useCallback(
    (task: TaskWithWorkstream) => {
      const taskId = task.id;
      const jobId = task.jobId;

      // Add to pending deletions immediately (optimistic)
      setPendingDeletions((prev) => new Set(prev).add(taskId));

      // Set timeout to actually delete after 5 seconds
      const timeoutId = setTimeout(async () => {
        try {
          await deleteTask.mutateAsync({ taskId, jobId });
          // Clean up after successful deletion
          deleteTimeouts.current.delete(taskId);
          setPendingDeletions((prev) => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          refetch();
        } catch (error) {
          // On error, restore the task
          setPendingDeletions((prev) => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          toast.error(formatProjectTaskMutationError(error, 'delete'));
        }
      }, 5000);

      deleteTimeouts.current.set(taskId, timeoutId);

      // Show toast with undo action
      toast.success(`Task "${task.title}" deleted`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            // Cancel the deletion
            const timeout = deleteTimeouts.current.get(taskId);
            if (timeout) {
              clearTimeout(timeout);
              deleteTimeouts.current.delete(taskId);
            }
            // Restore the task
            setPendingDeletions((prev) => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
            toast.info('Task restored');
          },
        },
      });
    },
    [deleteTask, refetch]
  );

  // Check if any filters are active (moved before early returns for proper scoping)
  const hasActiveFilters = hasProjectTaskActiveFilters(filters);
  const allTasksComplete = areAllProjectTasksComplete(allTasks);

  if (isLoading) {
    return <ProjectTasksLoadingState />;
  }

  if (error && tasksData === undefined) {
    return (
      <ProjectTasksUnavailableState
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  if (tasks.length === 0 && !hasActiveFilters) {
    return (
      <div className="space-y-4">
        {error ? (
          <ProjectTasksCachedWarning
            error={error}
            onRetry={() => refetch()}
          />
        ) : null}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Tasks</h3>
            <p className="text-sm text-muted-foreground">
              Track work across all site visits
            </p>
          </div>
        </div>
        <div className="max-w-md">
          <KanbanQuickAdd
            onAdd={handleQuickAdd}
            placeholder="Add a task..."
            showDescription={false}
            isLoading={isQuickAddPending}
          />
        </div>
        <ProjectTasksEmptyState onAdd={() => setCreateDialogOpen(true)} />
        <TaskCreateDialog
          key={createDialogOpen ? 'open' : 'closed'}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={projectId}
          onSuccess={() => refetch()}
        />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {error ? (
        <ProjectTasksCachedWarning
          error={error}
          onRetry={() => refetch()}
        />
      ) : null}
      {/* Quick Add */}
      <div className="max-w-md">
        <KanbanQuickAdd
          onAdd={handleQuickAdd}
          placeholder="Add a task..."
          showDescription={false}
          isLoading={isQuickAddPending}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Tasks</h3>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? `${tasks.length} of ${allTasks.length} tasks`
              : `${allTasks.length} tasks across ${groupedTasks.length} workstreams`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectTaskFilterPopover
            filters={filters}
            onFiltersChange={updateFilters}
            taskCounts={taskCounts}
          />
          <ProjectTaskSortDropdown sortBy={sortBy} onSortChange={updateSort} />
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Active Filter Chips */}
      <ProjectTaskActiveFilterChips filters={filters} onFiltersChange={updateFilters} />

      {/* Summary */}
      <ProjectTaskSummaryCards tasks={allTasks} />

      {/* All tasks complete CTA (Phase 5: Forward momentum) */}
      {allTasksComplete && onCompleteProjectClick && (
        <ProjectTaskCompletionCta onCompleteProjectClick={onCompleteProjectClick} />
      )}

      {/* Grouped Tasks or Filtered Empty State */}
      {groupedTasks.length === 0 && hasActiveFilters ? (
        <ProjectTasksFilteredEmptyState
          onClearFilters={() => updateFilters(DEFAULT_TASK_FILTERS)}
        />
      ) : (
        <div className="space-y-4">
          {groupedTasks.map(([workstreamName, workstreamTasks]) => (
            <ProjectTaskWorkstreamGroup
              key={workstreamName}
              name={workstreamName}
              tasks={workstreamTasks}
              projectId={projectId}
              onToggleTask={handleToggleTask}
              onEditTask={setEditingTask}
              onDeleteTask={handleDeleteTask}
              onReorderTasks={handleReorderTasks}
            />
          ))}
        </div>
      )}

      {/* Link to Cross-Project View */}
      <div className="pt-4 border-t text-center">
        <Link
          to="/my-tasks"
          search={{ projectId }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
        >
          View all my tasks across projects
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Create Dialog */}
      <TaskCreateDialog
        key={createDialogOpen ? 'open' : 'closed'}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSuccess={() => refetch()}
      />

      {/* Edit Dialog */}
      <TaskEditDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        projectId={projectId}
        task={editingTask}
        onSuccess={() => refetch()}
      />
    </div>
    </TooltipProvider>
  );
}
