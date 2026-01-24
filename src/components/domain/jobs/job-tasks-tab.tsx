/**
 * Job Tasks Tab
 *
 * Main container for task management on job detail page.
 * Includes task list, add/edit dialogs, and progress tracking.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-001c
 */

import * as React from 'react';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SortableTaskList } from './sortable-task-list';
import { TaskListSkeleton } from './task-list-skeleton';
import { TaskFormDialog } from './task-form-dialog';
import type { TaskResponse, JobTaskStatus } from '@/lib/schemas';
import { useConfirmation } from '@/hooks/use-confirmation';

// ============================================================================
// TYPES
// ============================================================================

export interface JobTasksTabProps {
  /** Source: Jobs tasks container query. */
  tasks: TaskResponse[];
  /** Source: Jobs tasks container query. */
  isLoading: boolean;
  /** Source: Jobs tasks container query. */
  isError: boolean;
  /** Source: Jobs tasks container query. */
  error?: Error | null;
  /** Source: Jobs tasks container query. */
  onRetry: () => void;
  /** Source: Jobs tasks container create mutation. */
  onCreateTask: (values: {
    title: string;
    description?: string;
    status: JobTaskStatus;
    dueDate?: string | null;
  }) => Promise<void>;
  /** Source: Jobs tasks container update mutation. */
  onUpdateTask: (
    taskId: string,
    values: {
      title: string;
      description?: string;
      status: JobTaskStatus;
      dueDate?: string | null;
    }
  ) => Promise<void>;
  /** Source: Jobs tasks container delete mutation. */
  onDeleteTask: (taskId: string) => Promise<void>;
  /** Source: Jobs tasks container reorder mutation. */
  onReorderTasks: (taskIds: string[]) => void;
  /** Source: Jobs tasks container toggle mutation. */
  onToggleStatus: (taskId: string, currentStatus: JobTaskStatus) => void;
  /** Source: Jobs tasks container mutations. */
  isSubmitting: boolean;
  /** Source: Jobs tasks container mutations. */
  isReordering: boolean;
  /** Source: Jobs tasks container mutations. */
  isTogglingStatus: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JobTasksTab({
  tasks,
  isLoading,
  isError,
  error,
  onRetry,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onToggleStatus,
  isSubmitting,
  isReordering,
  isTogglingStatus,
}: JobTasksTabProps) {
  const confirm = useConfirmation();

  // State for dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskResponse | undefined>();

  // Calculate progress
  const progress = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingTask(undefined);
    setFormOpen(true);
  };

  const handleOpenEdit = (task: TaskResponse) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingTask(undefined);
  };

  const handleSubmitForm = async (values: {
    title: string;
    description?: string;
    status: JobTaskStatus;
    dueDate?: string | null;
  }) => {
    try {
      if (editingTask) {
        await onUpdateTask(editingTask.id, values);
      } else {
        await onCreateTask(values);
      }
      handleCloseForm();
    } catch (err) {
      // Error handled by mutation
      console.error('Failed to save task:', err);
    }
  };

  const handleToggleStatus = (taskId: string, currentStatus: JobTaskStatus) => {
    onToggleStatus(taskId, currentStatus);
  };

  const handleReorder = (taskIds: string[]) => {
    onReorderTasks(taskIds);
  };

  const handleDeleteClick = async (taskId: string) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Task',
      description: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmLabel: 'Delete Task',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      await onDeleteTask(taskId);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="bg-muted h-5 w-24 animate-pulse rounded" />
          <div className="bg-muted h-9 w-24 animate-pulse rounded" />
        </div>
        <TaskListSkeleton count={3} />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading tasks</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          {error?.message || 'Failed to load tasks. Please try again.'}
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (!tasks || tasks.length === 0) {
    return (
      <>
        <Empty className="border-2">
          <EmptyHeader>
            <EmptyTitle>No tasks yet</EmptyTitle>
            <EmptyDescription>Add tasks to track work items for this job.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Task
            </Button>
          </EmptyContent>
        </Empty>

        <TaskFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          task={editingTask}
          onSubmit={handleSubmitForm}
          isSubmitting={isSubmitting}
        />
      </>
    );
  }

  // Task list
  return (
    <div className="space-y-4">
      {/* Header with progress and add button */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {progress}% complete ({tasks.filter((t) => t.status === 'completed').length}/
          {tasks.length} tasks)
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="gap-2" aria-label="Add new task">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Progress bar */}
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Task completion progress"
        />
      </div>

      {/* Task list */}
      <SortableTaskList
        tasks={tasks}
        onReorder={handleReorder}
        onToggleStatus={handleToggleStatus}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteClick}
        disabled={isReordering || isTogglingStatus}
      />

      {/* Add/Edit dialog */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        onSubmit={handleSubmitForm}
        isSubmitting={isSubmitting}
      />

      {/* Delete confirmation dialog */}
    </div>
  );
}
