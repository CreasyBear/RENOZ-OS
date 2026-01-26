/**
 * Jobs Kanban Route
 *
 * Kanban board showing all job tasks across all job assignments.
 * Provides high-level visibility into task workflows and team capacity.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005c
 * @see _development/_audit/prd_reference/plans/plan-jobs-domain-integration.md
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  Profiler,
  type ProfilerOnRenderCallback,
} from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { JobsKanbanSkeleton } from '@/components/skeletons/jobs';
import {
  JobsBoard,
  JobsFilters,
  JobsBulkActions,
  JobsTaskCreateDialog,
  JobsBulkCreateDialog,
  KanbanErrorBoundary,
  type JobsFiltersState,
} from '@/components/domain/jobs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useJobTasksKanban,
  useUpdateJobTaskStatus,
  useJobTaskKanbanConfig,
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
  useJobAssignmentsForKanban,
  type KanbanTask,
} from '@/hooks/jobs';
import { toast } from '@/lib/toast';
import { useConfirmation } from '@/hooks';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/jobs/kanban')({
  component: JobsKanbanPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout>
      <PageLayout.Header
        title="Jobs Kanban"
        description="Task board for job management"
      />
      <PageLayout.Content>
        <JobsKanbanSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// SOTA SaaS: Performance monitoring for kanban operations
const onRenderCallback: ProfilerOnRenderCallback = (
  id: string,
  phase,
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  // Log performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Kanban ${id} ${phase}:`, {
      actualDuration: `${actualDuration.toFixed(2)}ms`,
      baseDuration: `${baseDuration.toFixed(2)}ms`,
      startTime,
      commitTime,
    });
  }

  // TODO: Send to performance monitoring service (DataDog, New Relic, etc.)
  // Track slow renders (>16ms) for optimization opportunities
  if (actualDuration > 16) {
    console.warn(`Slow render detected in ${id}: ${actualDuration.toFixed(2)}ms`);
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function JobsKanbanPage() {
  const confirm = useConfirmation();
  const navigate = useNavigate();
  const kanbanConfig = useJobTaskKanbanConfig();

  // Get available jobs for proper task creation context
  const { data: availableJobsResponse } = useJobAssignmentsForKanban();
  const availableJobs = availableJobsResponse?.jobs ?? [];

  // Job context for task creation - user must select a job
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Dialog state
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [createTaskColumnId, setCreateTaskColumnId] = useState<string>('');
  const [bulkCreateDialogOpen, setBulkCreateDialogOpen] = useState(false);
  const [bulkCreateColumnId, setBulkCreateColumnId] = useState<string>('');

  // Bulk operations state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Filter state with localStorage persistence
  const [filters, setFilters] = useState<JobsFiltersState>(() => {
    try {
      const saved = localStorage.getItem('jobs-kanban-filters');
      if (saved) {
        const parsedFilters = JSON.parse(saved);
        // Validate the saved filters have the correct structure
        return {
          priority: parsedFilters.priority || 'all',
          assigneeId: parsedFilters.assigneeId || 'all',
          status: parsedFilters.status || 'all',
          jobType: parsedFilters.jobType || 'all',
          jobId: parsedFilters.jobId || 'all',
          dueDateRange: parsedFilters.dueDateRange || 'all',
          searchQuery: parsedFilters.searchQuery || '',
        };
      }
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }

    // Default filters
    return {
      priority: 'all',
      assigneeId: 'all',
      status: 'all',
      jobType: 'all',
      jobId: 'all',
      dueDateRange: 'all',
      searchQuery: '',
    };
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('jobs-kanban-filters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters:', error);
    }
  }, [filters]);

  // Data fetching for jobs kanban
  const { data: rawTasksData, isLoading: loadingTasks, error: tasksError } = useJobTasksKanban();

  // Task management hooks
  const updateTaskStatus = useUpdateJobTaskStatus();
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: createTask } = useCreateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();

  // Apply filters to the data
  const tasksData = useMemo(() => {
    if (!rawTasksData) return rawTasksData;

    let filteredTasks = rawTasksData.allTasks;

    // Apply priority filter
    if (filters.priority !== 'all') {
      filteredTasks = filteredTasks.filter((task) => task.priority === filters.priority);
    }

    // Apply assignee filter
    if (filters.assigneeId !== 'all') {
      filteredTasks = filteredTasks.filter((task) => task.assignee?.id === filters.assigneeId);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filteredTasks = filteredTasks.filter((task) => task.status === filters.status);
    }

    // Apply job type filter
    if (filters.jobType !== 'all') {
      filteredTasks = filteredTasks.filter((task) => task.jobAssignment.type === filters.jobType);
    }

    // Apply job assignment filter
    if (filters.jobId !== 'all') {
      filteredTasks = filteredTasks.filter((task) => task.jobAssignment.id === filters.jobId);
    }

    // Apply due date filter
    if (filters.dueDateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today);
      weekFromNow.setDate(today.getDate() + 7);

      filteredTasks = filteredTasks.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);

        switch (filters.dueDateRange) {
          case 'today':
            return dueDate.toDateString() === today.toDateString();
          case 'this_week':
            return dueDate >= today && dueDate <= weekFromNow;
          case 'overdue':
            return dueDate < today;
          case 'upcoming':
            return dueDate > today;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.jobAssignment.jobNumber.toLowerCase().includes(query) ||
          task.customer?.name.toLowerCase().includes(query)
      );
    }

    // Regroup tasks by status for kanban columns
    const tasksByStatus: Record<string, typeof filteredTasks> = {
      pending: [],
      in_progress: [],
      completed: [],
      blocked: [],
    };

    filteredTasks.forEach((task) => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
      }
    });

    return {
      ...rawTasksData,
      tasksByStatus,
      allTasks: filteredTasks,
      total: filteredTasks.length,
    };
  }, [rawTasksData, filters]);

  // Get available assignees for filter dropdown
  const availableAssignees = useMemo(() => {
    if (!rawTasksData) return [];

    const assignees = new Map<string, { id: string; name: string }>();
    rawTasksData.allTasks.forEach((task) => {
      if (task.assignee) {
        assignees.set(task.assignee.id, task.assignee);
      }
    });

    return Array.from(assignees.values());
  }, [rawTasksData]);

  // Handlers
  const handleViewTask = useCallback(
    (taskId: string) => {
      // Find the task to get job assignment details
      const task = rawTasksData?.allTasks.find((t) => t.id === taskId);
      if (task?.jobAssignment?.id) {
        navigate({
          to: '/jobs/assignments/$assignmentId' as unknown as never,
          params: { assignmentId: task.jobAssignment.id } as never,
        });
      } else {
        navigate({
          to: '/jobs/calendar',
        });
      }
    },
    [navigate, rawTasksData]
  );

  const handleAddTask = useCallback((columnId: string, bulk = false) => {
    if (bulk) {
      setBulkCreateColumnId(columnId);
      setBulkCreateDialogOpen(true);
    } else {
      setCreateTaskColumnId(columnId);
      setCreateTaskDialogOpen(true);
    }
  }, []);

  const handleColumnAction = useCallback((columnId: string, action: string) => {
    // Column actions (filter, sort, etc.) - future enhancement
    console.log('Column action:', columnId, action);
  }, []);

  const handleTaskMove = useCallback(
    async (taskId: string, _fromColumn: string, toColumn: string) => {
      try {
        const targetStatus = toColumn as KanbanTask['status'];
        await updateTaskStatus.mutateAsync({
          taskId,
          status: targetStatus,
        });
        toast.success(`Task moved to ${toColumn}`);
      } catch (error) {
        toast.error('Failed to move task');
        console.error('Failed to move task:', error);
      }
    },
    [updateTaskStatus]
  );

  // Bulk operations handlers
  const handleBulkStatusUpdate = useCallback(
    async (status: string) => {
      const taskIds = Array.from(selectedTaskIds);
      if (taskIds.length === 0) return;

      try {
        const nextStatus = status as KanbanTask['status'];
        // Update all selected tasks to the new status
        await Promise.all(
          taskIds.map((taskId) =>
            updateTaskStatus.mutateAsync({
              taskId,
              status: nextStatus,
            })
          )
        );

        toast.success(
          `Updated ${taskIds.length} task${taskIds.length !== 1 ? 's' : ''} to ${status}`
        );
        setSelectedTaskIds(new Set()); // Clear selection after successful bulk update
      } catch (error) {
        toast.error('Failed to update tasks');
        console.error('Bulk status update failed:', error);
      }
    },
    [selectedTaskIds, updateTaskStatus]
  );

  const handleBulkAssign = useCallback(
    async (assigneeId: string) => {
      const taskIds = Array.from(selectedTaskIds);
      if (taskIds.length === 0) return;

      try {
        // SOTA SaaS: Implement proper bulk assignment using existing mutation
        await Promise.all(
          taskIds.map((taskId) =>
            updateTask({
              taskId,
              assigneeId: assigneeId === 'unassign' ? null : assigneeId,
            })
          )
        );

        const assigneeName =
          availableAssignees.find((a) => a.id === assigneeId)?.name || assigneeId;
        const action = assigneeId === 'unassign' ? 'unassigned' : `assigned to ${assigneeName}`;

        toast.success(
          `Successfully ${action} ${taskIds.length} task${taskIds.length !== 1 ? 's' : ''}`
        );
        setSelectedTaskIds(new Set()); // Clear selection after successful bulk operation
      } catch (error) {
        toast.error('Failed to update task assignments');
        console.error('Bulk assignment failed:', error);
      }
    },
    [selectedTaskIds, availableAssignees, updateTask]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  // Inline editing handlers
  const handleEditTask = useCallback(
    async (taskId: string, data: { title: string; description?: string; priority: string }) => {
      try {
        await updateTask({
          taskId,
          title: data.title,
          description: data.description,
          priority: data.priority as KanbanTask['priority'],
        });
        toast.success('Task updated successfully');
      } catch (error) {
        toast.error('Failed to update task');
        console.error('Failed to update task:', error);
        throw error; // Re-throw to let the inline edit component handle the error
      }
    },
    [updateTask]
  );

  // Context menu handlers
  const handleDuplicateTask = useCallback(
    async (taskId: string) => {
      try {
        // Find the task to duplicate
        const taskToDuplicate = rawTasksData?.allTasks.find((task) => task.id === taskId);
        if (!taskToDuplicate) {
          toast.error('Task not found');
          return;
        }

        // Create a new task with the same properties
        await createTask({
          jobId: taskToDuplicate.jobAssignment.id, // Use the job assignment ID
          title: `${taskToDuplicate.title} (Copy)`,
          description: taskToDuplicate.description ?? undefined,
          status: taskToDuplicate.status,
          priority: taskToDuplicate.priority,
          estimatedHours: taskToDuplicate.estimatedHours,
        });

        toast.success('Task duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate task');
        console.error('Failed to duplicate task:', error);
      }
    },
    [rawTasksData, createTask]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      const confirmed = await confirm.confirm({
        title: 'Delete Task',
        description: 'Are you sure you want to delete this task? This action cannot be undone.',
        confirmLabel: 'Delete Task',
        variant: 'destructive',
      });

      if (confirmed.confirmed) {
        try {
          const taskToDelete = rawTasksData?.allTasks.find((task) => task.id === taskId);
          if (!taskToDelete) {
            toast.error('Task not found');
            return;
          }
          await deleteTask({ taskId, jobId: taskToDelete.jobAssignment.id });
          toast.success('Task deleted successfully');
        } catch (error) {
          toast.error('Failed to delete task');
          console.error('Failed to delete task:', error);
        }
      }
    },
    [confirm, deleteTask, rawTasksData]
  );

  const handleChangeTaskPriority = useCallback(
    async (taskId: string, priority: string) => {
      try {
        await updateTask({
          taskId,
          priority: priority as KanbanTask['priority'],
        });
        toast.success(`Priority changed to ${priority}`);
      } catch (error) {
        toast.error('Failed to change priority');
        console.error('Failed to change priority:', error);
      }
    },
    [updateTask]
  );

  const handleAssignTask = useCallback((_taskId: string, assigneeId: string) => {
    const action = assigneeId === 'unassign' ? 'unassigned' : 'assigned';
    toast.success(`Task ${action} - feature coming soon`);
  }, []);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Jobs Kanban"
        description="Task workflow overview across all job assignments"
        actions={
          <div className="flex items-center gap-4">
            {/* Job Context Selector - Critical for proper task creation */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Working on:</span>
              <Select value={selectedJobId || ''} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a job to create tasks..." />
                </SelectTrigger>
                <SelectContent>
                  {availableJobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {job.jobNumber}
                        </Badge>
                        <span className="truncate">{job.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <JobsFilters
              filters={filters}
              onChange={setFilters}
              availableAssignees={availableAssignees}
            />
          </div>
        }
      />
      <PageLayout.Content>
        {/* Performance monitoring for SOTA SaaS */}
        <Profiler id="kanban-bulk-actions" onRender={onRenderCallback}>
          <JobsBulkActions
            selectedTaskIds={selectedTaskIds}
            onClearSelection={handleClearSelection}
            onBulkStatusUpdate={handleBulkStatusUpdate}
            onBulkAssign={handleBulkAssign}
            availableAssignees={availableAssignees}
            isLoading={updateTaskStatus.isPending}
          />
        </Profiler>

        <KanbanErrorBoundary>
          <Profiler id="kanban-board" onRender={onRenderCallback}>
            <JobsBoard
              tasksData={tasksData}
              kanbanConfig={kanbanConfig}
              isLoading={loadingTasks}
              error={tasksError}
              onViewTask={handleViewTask}
              onAddTask={handleAddTask}
              onColumnAction={handleColumnAction}
              onTaskMove={handleTaskMove}
              selectedTaskIds={selectedTaskIds}
              onTaskSelect={(taskId, selected) => {
                setSelectedTaskIds((prev) => {
                  const newSet = new Set(prev);
                  if (selected) {
                    newSet.add(taskId);
                  } else {
                    newSet.delete(taskId);
                  }
                  return newSet;
                });
              }}
              onBulkAddTask={(columnId) => handleAddTask(columnId, true)}
              onSaveTaskEdit={handleEditTask}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onChangeTaskPriority={handleChangeTaskPriority}
              onAssignTask={handleAssignTask}
              availableAssignees={availableAssignees}
              selectedJobId={selectedJobId}
            />
          </Profiler>
        </KanbanErrorBoundary>
      </PageLayout.Content>

      {/* Task Creation Dialogs */}
      <JobsTaskCreateDialog
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        columnId={createTaskColumnId}
        jobId={selectedJobId || undefined}
      />

      <JobsBulkCreateDialog
        open={bulkCreateDialogOpen}
        onOpenChange={setBulkCreateDialogOpen}
        columnId={bulkCreateColumnId}
        jobId={selectedJobId || undefined}
      />
    </PageLayout>
  );
}
