/**
 * My Tasks Kanban Board
 *
 * Cross-project task kanban view for the current user.
 * Shows tasks grouped by status with project context.
 *
 * Features:
 * - Tasks across all projects assigned to current user
 * - Status-based kanban columns (pending, in_progress, completed, blocked)
 * - Project badges on cards for cross-project context
 * - Optional project filter for focused view
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 8.2
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  FolderKanban,
  Circle,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import {
  KanbanBoard,
  SortableKanbanCard,
  KanbanBoardSkeleton,
  type KanbanColumnDef,
  type KanbanMoveEvent,
  type KanbanCardStatus,
  type KanbanPriority,
} from '@/components/shared/kanban';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { normalizeError, getUserFriendlyMessage, isRetryableError } from '@/lib/error-handling';

import { useMyTasksKanban, useUpdateTask, type MyTaskKanban } from '@/hooks/jobs';

// ============================================================================
// TYPES
// ============================================================================

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

interface MyTasksKanbanProps {
  /** Optional project filter */
  projectId?: string;
  /** Optional className */
  className?: string;
}

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

const COLUMNS: KanbanColumnDef<TaskStatus>[] = [
  {
    key: 'pending',
    title: 'To Do',
    color: 'bg-muted',
    icon: Circle,
  },
  {
    key: 'in_progress',
    title: 'In Progress',
    color: 'bg-info/10',
    icon: Loader2,
  },
  {
    key: 'completed',
    title: 'Done',
    color: 'bg-success/10',
    icon: CheckCircle2,
  },
  {
    key: 'blocked',
    title: 'Blocked',
    color: 'bg-destructive/10',
    icon: XCircle,
  },
];

// ============================================================================
// STATUS & PRIORITY MAPPING
// ============================================================================

const STATUS_MAP: Record<TaskStatus, KanbanCardStatus> = {
  pending: { key: 'pending', name: 'To Do', icon: Circle },
  in_progress: { key: 'in_progress', name: 'In Progress', icon: Loader2 },
  completed: { key: 'completed', name: 'Done', icon: CheckCircle2 },
  blocked: { key: 'blocked', name: 'Blocked', icon: XCircle },
};

const PRIORITY_MAP: Record<string, KanbanPriority> = {
  urgent: 'urgent',
  high: 'high',
  normal: 'medium',
  low: 'low',
};

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================

interface TaskCardProps {
  task: MyTaskKanban;
  onClick: () => void;
  isUpdating?: boolean;
}

const TaskCard = memo(function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <SortableKanbanCard
      id={task.id}
      title={task.title}
      description={task.description ?? undefined}
      status={STATUS_MAP[task.status]}
      priority={PRIORITY_MAP[task.priority]}
      dueDate={task.dueDate ?? undefined}
      onClick={onClick}
      tags={[
        // Project badge
        {
          label: task.project.projectNumber,
          color: 'bg-primary/10 text-primary border-primary/20',
        },
        // Workstream badge if present
        ...(task.workstreamName
          ? [
              {
                label: task.workstreamName,
                color: 'bg-secondary text-secondary-foreground',
              },
            ]
          : []),
      ]}
    />
  );
});

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState = memo(function EmptyState({ projectId }: { projectId?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 bg-muted rounded-full mb-4">
        <FolderKanban className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No tasks assigned to you</h3>
      <p className="text-muted-foreground max-w-sm">
        {projectId
          ? 'You have no tasks assigned in this project. Tasks are created within site visits.'
          : 'You have no tasks assigned across any projects. Tasks will appear here when assigned to you.'}
      </p>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MyTasksKanban = memo(function MyTasksKanban({
  projectId,
  className,
}: MyTasksKanbanProps) {
  const navigate = useNavigate();

  // Track which task is currently being updated for loading state
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Fetch tasks
  const { data, isLoading, refetch } = useMyTasksKanban({ projectId });
  const updateTask = useUpdateTask();

  // Flatten tasks for kanban
  const tasks = useMemo(() => data?.allTasks ?? [], [data]);

  // Handle card click - navigate to project detail
  const handleCardClick = useCallback(
    (task: MyTaskKanban) => {
      navigate({
        to: '/projects/$projectId',
        params: { projectId: task.project.id },
        search: { tab: 'tasks' },
      });
    },
    [navigate]
  );

  // Handle move (status change) - optimistic updates handled in hook
  const handleMove = useCallback(
    async (event: KanbanMoveEvent<TaskStatus>, retries = 3) => {
      const { itemId, toColumn } = event;

      // Set loading state for this task
      setUpdatingTaskId(itemId);

      try {
        await updateTask.mutateAsync({
          taskId: itemId,
          status: toColumn,
        });
        // Optimistic updates and cache invalidation handled in hook
      } catch (error) {
        // Error handling - hook already rolled back optimistic update
        const normalizedError = normalizeError(error, {
          component: 'MyTasksKanban',
          action: 'update task status',
          metadata: { taskId: itemId, status: toColumn },
        });
        logger.error('Failed to update task status', normalizedError, {
          domain: 'jobs',
          taskId: itemId,
          status: toColumn,
        });

        // Retry logic with exponential backoff
        if (retries > 0 && isRetryableError(normalizedError)) {
          const delayMs = Math.pow(2, 4 - retries) * 1000; // 1s, 2s, 4s
          setTimeout(() => {
            handleMove(event, retries - 1);
          }, delayMs);
          setUpdatingTaskId(null); // Clear loading state before retry
          return;
        }

        const userMessage = getUserFriendlyMessage(normalizedError);
        toast.error(userMessage, {
          action: {
            label: 'Retry',
            onClick: () => handleMove(event, 3),
          },
        });
      } finally {
        // Clear loading state
        setUpdatingTaskId(null);
      }
    },
    [updateTask]
  );

  // Loading state
  if (isLoading) {
    return <KanbanBoardSkeleton columnCount={4} cardsPerColumn={3} />;
  }

  // Empty state
  if (tasks.length === 0) {
    return <EmptyState projectId={projectId} />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">My Tasks</h2>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks across projects</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Kanban Board */}
      <KanbanBoard<MyTaskKanban, TaskStatus>
        columns={COLUMNS}
        items={tasks}
        getColumnKey={(task) => task.status}
        getItemKey={(task) => task.id}
        onMove={handleMove}
        renderCard={(task) => (
          <TaskCard
            task={task}
            onClick={() => handleCardClick(task)}
            isUpdating={updatingTaskId === task.id}
          />
        )}
        emptyMessage="No tasks in this column"
        height="calc(100vh - 280px)"
      />
    </div>
  );
});

export default MyTasksKanban;
