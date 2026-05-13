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
import { Link, useSearch, useNavigate } from '@tanstack/react-router';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/lib/toast';
import { toastError } from '@/hooks';

// Hooks
import {
  formatProjectTaskMutationError,
  useProjectTasks,
  useUpdateProjectTaskStatus,
  useDeleteProjectTask,
  useCreateTask,
  useWorkstreams,
  useReorderTasks,
  useSiteVisitsByProject,
} from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  DEFAULT_TASK_FILTERS,
  getTaskPriority,
} from './project-task-config';
import { ProjectTaskCompletionCta } from './project-task-completion-cta';
import {
  ProjectTaskActiveFilterChips,
  ProjectTaskFilterPopover,
  ProjectTaskSortDropdown,
} from './project-task-filter-controls';
import { ProjectTaskSummaryCards } from './project-task-summary-cards';
import {
  ProjectTasksCachedWarning,
  ProjectTasksEmptyState,
  ProjectTasksFilteredEmptyState,
  ProjectTasksLoadingState,
  ProjectTasksUnavailableState,
} from './project-task-states';
import { ProjectTaskWorkstreamGroup } from './project-task-workstream-group';

// Types
import type {
  JobTaskStatus,
  JobTaskPriority,
  ProjectTaskResponse,
  TaskWithWorkstream,
  TaskFilters,
  TaskSortOption,
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
  const queryClient = useQueryClient();
  const { data: tasksData, error, isLoading, refetch } = useProjectTasks({ projectId });
  const { data: workstreamsData } = useWorkstreams(projectId);
  const { data: siteVisitsData } = useSiteVisitsByProject(projectId);
  const updateStatus = useUpdateProjectTaskStatus(projectId);
  const deleteTask = useDeleteProjectTask(projectId);
  const createTask = useCreateTask();
  const reorderTasks = useReorderTasks();
  const { getUser, currentUserId } = useUserLookup();
  const navigate = useNavigate();

  const siteVisits = useMemo(
    () => siteVisitsData?.items ?? [],
    [siteVisitsData?.items]
  );
  const defaultSiteVisitId = siteVisits.length === 1 ? siteVisits[0].id : siteVisits[0]?.id;

  const handleQuickAdd = useCallback(
    async (data: { title: string; description?: string }) => {
      if (!defaultSiteVisitId) {
        toastError('Add a site visit first to create tasks quickly, or use "Add Task" for full options.');
        return;
      }
      try {
        await createTask.mutateAsync({
          siteVisitId: defaultSiteVisitId,
          title: data.title,
          description: data.description,
          status: 'pending',
          priority: 'normal',
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectTasks.byProject(projectId),
        });
      } catch (error) {
        toastError(formatProjectTaskMutationError(error, 'create'));
      }
    },
    [createTask, defaultSiteVisitId, projectId, queryClient]
  );

  // Read filters from URL search params
  const search = useSearch({ from: '/_authenticated/projects/$projectId' });

  // Parse URL filters into component state
  const urlFilters: TaskFilters = useMemo(() => ({
    status: (search.taskStatus?.split(',').filter(Boolean) || []).filter((s): s is JobTaskStatus =>
      s === 'pending' || s === 'in_progress' || s === 'completed' || s === 'blocked'
    ),
    priority: (search.taskPriority?.split(',').filter(Boolean) || []).filter((p): p is JobTaskPriority =>
      p === 'urgent' || p === 'high' || p === 'normal' || p === 'low'
    ),
    assignee: search.taskAssignee || 'all',
  }), [search.taskStatus, search.taskPriority, search.taskAssignee]);

  const urlSortBy: TaskSortOption = search.taskSort || 'dueDate';

  const [editingTask, setEditingTask] = useState<TaskWithWorkstream | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Sync URL params to local state on mount
  const [filters, setFilters] = useState<TaskFilters>(urlFilters);
  const [sortBy, setSortBy] = useState<TaskSortOption>(urlSortBy);

  // Sync local state to URL when filters change
  const updateFilters = useCallback((newFilters: TaskFilters) => {
    setFilters(newFilters);
    navigate({
      to: '/projects/$projectId',
      params: { projectId },
      search: {
        tab: search.tab,
        taskStatus: newFilters.status.length > 0 ? newFilters.status.join(',') : undefined,
        taskPriority: newFilters.priority.length > 0 ? newFilters.priority.join(',') : undefined,
        taskAssignee: newFilters.assignee !== 'all' ? newFilters.assignee : undefined,
        taskSort: search.taskSort,
      },
    });
  }, [navigate, projectId, search.tab, search.taskSort]);

  // Sync local state to URL when sort changes
  const updateSort = useCallback((newSort: TaskSortOption) => {
    setSortBy(newSort);
    navigate({
      to: '/projects/$projectId',
      params: { projectId },
      search: {
        tab: search.tab,
        taskStatus: search.taskStatus,
        taskPriority: search.taskPriority,
        taskAssignee: search.taskAssignee,
        taskSort: newSort !== 'dueDate' ? newSort : undefined,
      },
    });
  }, [navigate, projectId, search.tab, search.taskStatus, search.taskPriority, search.taskAssignee]);

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

  // Transform tasks
  const allTasks = useMemo(() => {
    const rawTasks = tasksData || [];
    return rawTasks.map((task): TaskWithWorkstream => {
      const workstream = workstreams.find(w => w.id === task.workstreamId);
      const assignee = task.assigneeId ? getUser(task.assigneeId) : null;
      const visit = task.siteVisitId ? siteVisits.find(v => v.id === task.siteVisitId) : undefined;
      return {
        ...task,
        workstreamName: workstream?.name,
        assigneeName: assignee?.name ?? undefined,
        siteVisitNumber: visit?.visitNumber,
      };
    });
  }, [tasksData, workstreams, siteVisits, getUser]);

  // Calculate counts for filter UI
  const taskCounts = useMemo(() => {
    const byStatus: Record<JobTaskStatus, number> = { pending: 0, in_progress: 0, completed: 0, blocked: 0 };
    const byPriority: Record<JobTaskPriority, number> = { urgent: 0, high: 0, normal: 0, low: 0 };

    allTasks.forEach(task => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      const priority = getTaskPriority(task.priority);
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    return { byStatus, byPriority };
  }, [allTasks]);

  // Apply filters (including pending deletion exclusion)
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      // Exclude tasks pending deletion
      if (pendingDeletions.has(task.id)) {
        return false;
      }
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false;
      }
      // Priority filter
      const taskPriority = getTaskPriority(task.priority);
      if (filters.priority.length > 0 && !filters.priority.includes(taskPriority)) {
        return false;
      }
      // Assignee filter
      if (filters.assignee === 'me' && task.assigneeId !== currentUserId) {
        return false;
      }
      if (filters.assignee === 'unassigned' && task.assigneeId) {
        return false;
      }
      return true;
    });
  }, [allTasks, filters, currentUserId, pendingDeletions]);

  // Apply sorting
  const tasks = useMemo(() => {
    const sorted = [...filteredTasks];

    switch (sortBy) {
      case 'dueDate':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'priority': {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        sorted.sort((a, b) => {
          const aPri = priorityOrder[getTaskPriority(a.priority)];
          const bPri = priorityOrder[getTaskPriority(b.priority)];
          return aPri - bPri;
        });
        break;
      }
      case 'created': {
        sorted.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate; // Newest first
        });
        break;
      }
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return sorted;
  }, [filteredTasks, sortBy]);

  // Group by workstream
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, TaskWithWorkstream[]>();

    // Initialize with all workstreams (even empty ones)
    workstreams.forEach(ws => {
      groups.set(ws.name, []);
    });

    // Add "Unassigned" group
    groups.set('Unassigned', []);

    // Distribute tasks
    tasks.forEach(task => {
      const groupName = task.workstreamName || 'Unassigned';
      const existing = groups.get(groupName) || [];
      existing.push(task);
      groups.set(groupName, existing);
    });

    // Filter out empty groups and sort
    return Array.from(groups.entries())
      .filter(([_, tasks]) => tasks.length > 0)
      .sort(([a], [b]) => {
        // "Unassigned" always last
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      });
  }, [tasks, workstreams]);

  const handleToggleTask = async (task: TaskWithWorkstream) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    // Optimistically update project tasks cache
    const projectTasksKey = queryKeys.projectTasks.byProject(projectId);
    const previousProjectTasks = queryClient.getQueryData<{ tasks: ProjectTaskResponse[] }>(projectTasksKey);
    if (previousProjectTasks) {
      queryClient.setQueryData(projectTasksKey, {
        tasks: previousProjectTasks.tasks.map(t =>
          t.id === task.id ? { ...t, status: newStatus } : t
        ),
      });
    }

    try {
      await updateStatus.mutateAsync({
        taskId: task.id,
        jobId: task.jobId,
        status: newStatus,
      });
      if (newStatus === 'completed') {
        // Check if all tasks are now complete (this task + all others)
        const allComplete =
          tasks.length > 0 &&
          tasks.every(t => (t.id === task.id ? true : t.status === 'completed'));
        if (allComplete && onCompleteProjectClick) {
          toast.success('All tasks complete!', {
            action: {
              label: 'Complete project',
              onClick: onCompleteProjectClick,
            },
          });
        } else {
          toast.success('Task completed');
        }
      } else {
        toast.success('Task reopened');
      }
    } catch (error) {
      // Rollback on error
      if (previousProjectTasks) {
        queryClient.setQueryData(projectTasksKey, previousProjectTasks);
      }
      toast.error(formatProjectTaskMutationError(error, 'status'));
    }
  };

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

  // Handle task reordering within a workstream
  const handleReorderTasks = useCallback(
    async (_workstreamName: string, taskIds: string[]) => {
      // Find the first task to get the job assignment id.
      const firstTask = tasks.find(t => t.id === taskIds[0]);
      if (!firstTask?.jobId) return;

      try {
        await reorderTasks.mutateAsync({
          jobId: firstTask.jobId,
          taskIds,
        });
        toast.success('Task order updated');
      } catch (error) {
        toast.error(formatProjectTaskMutationError(error, 'reorder'));
      }
    },
    [reorderTasks, tasks]
  );

  // Check if any filters are active (moved before early returns for proper scoping)
  const hasActiveFilters = filters.status.length > 0 || filters.priority.length > 0 || filters.assignee !== 'all';

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
            isLoading={createTask.isPending}
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
          isLoading={createTask.isPending}
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
      {allTasks.length > 0 &&
        allTasks.every(t => t.status === 'completed') &&
        onCompleteProjectClick && (
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
              onReorderTasks={(taskIds) => handleReorderTasks(workstreamName, taskIds)}
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
