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
 * @source mutations from project task mutation hooks
 *
 * SPRINT-03: Enhanced task tab maximizing schema potential
 */

import {
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { TooltipProvider } from '@/components/ui/tooltip';

import { DEFAULT_TASK_FILTERS } from './project-task-config';
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
import { useProjectTasksTabController } from './project-tasks-tab-controller';
import { ProjectTaskWorkstreamGroup } from './project-task-workstream-group';

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
  const {
    allTasks,
    allTasksComplete,
    error,
    filters,
    groupedTasks,
    handleDeleteTask,
    handleQuickAdd,
    handleReorderTasks,
    handleToggleTask,
    hasActiveFilters,
    hasUnavailableTasks,
    isLoading,
    isQuickAddPending,
    refetch,
    sortBy,
    taskCounts,
    taskDialogs,
    tasks,
    updateFilters,
    updateSort,
  } = useProjectTasksTabController({
    projectId,
    onCompleteProjectClick,
  });

  if (isLoading) {
    return <ProjectTasksLoadingState />;
  }

  if (hasUnavailableTasks) {
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
        <ProjectTasksEmptyState onAdd={taskDialogs.openCreateDialog} />
        <TaskCreateDialog
          key={taskDialogs.createDialogKey}
          open={taskDialogs.isCreateDialogOpen}
          onOpenChange={taskDialogs.setCreateDialogOpen}
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
          <Button onClick={taskDialogs.openCreateDialog}>
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
              onEditTask={taskDialogs.openEditTask}
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
        key={taskDialogs.createDialogKey}
        open={taskDialogs.isCreateDialogOpen}
        onOpenChange={taskDialogs.setCreateDialogOpen}
        projectId={projectId}
        onSuccess={() => refetch()}
      />

      {/* Edit Dialog */}
      <TaskEditDialog
        open={taskDialogs.isEditDialogOpen}
        onOpenChange={taskDialogs.handleEditDialogOpenChange}
        projectId={projectId}
        task={taskDialogs.editingTask}
        onSuccess={() => refetch()}
      />
    </div>
    </TooltipProvider>
  );
}
