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

import { useState, useMemo } from 'react';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/lib/toast';

// Hooks
import {
  useProjectTasks,
  useUpdateJobTaskStatus,
  useDeleteProjectTask,
  useWorkstreams,
} from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';

// Types
import type { JobTask, JobTaskStatus } from 'drizzle/schema';

// Dialogs
import { TaskEditDialog } from './task-dialogs';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectTasksTabProps {
  projectId: string;
}

interface TaskWithWorkstream extends JobTask {
  workstreamName?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
}

// Local type since not exported from schema
type JobTaskPriority = 'urgent' | 'high' | 'normal' | 'low';

// ============================================================================
// CONFIG
// ============================================================================

const PRIORITY_CONFIG: Record<JobTaskPriority, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: AlertCircle,
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    icon: AlertCircle,
  },
  normal: {
    label: 'Normal',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: Clock,
  },
  low: {
    label: 'Low',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: Clock,
  },
};

const STATUS_CONFIG: Record<JobTaskStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: {
    label: 'To Do',
    color: 'text-gray-500',
    icon: Circle,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-500',
    icon: Clock,
  },
  completed: {
    label: 'Done',
    color: 'text-green-500',
    icon: CheckCircle2,
  },
  blocked: {
    label: 'Blocked',
    color: 'text-red-500',
    icon: AlertCircle,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function formatDueDate(date: string | null | undefined): { text: string; isOverdue: boolean; isSoon: boolean } {
  if (!date) return { text: 'No due date', isOverdue: false, isSoon: false };
  
  const dueDate = new Date(date);
  const today = new Date();
  
  if (isToday(dueDate)) return { text: 'Due today', isOverdue: false, isSoon: true };
  if (isTomorrow(dueDate)) return { text: 'Due tomorrow', isOverdue: false, isSoon: true };
  if (isPast(dueDate) && !isToday(dueDate)) return { text: `Overdue by ${formatDistanceToNow(dueDate)}`, isOverdue: true, isSoon: false };
  
  // Within 3 days
  if (dueDate <= addDays(today, 3)) return { text: format(dueDate, 'MMM d'), isOverdue: false, isSoon: true };
  
  return { text: format(dueDate, 'MMM d, yyyy'), isOverdue: false, isSoon: false };
}

function formatDistanceToNow(date: Date): string {
  const days = Math.ceil((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return `${days} day${days > 1 ? 's' : ''}`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================================================
// TASK CARD
// ============================================================================

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: TaskWithWorkstream;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const priority = PRIORITY_CONFIG[task.priority || 'normal'];
  const status = STATUS_CONFIG[task.status];
  const dueInfo = formatDueDate(task.dueDate);
  const isCompleted = task.status === 'completed';
  const PriorityIcon = priority.icon;
  const StatusIcon = status.icon;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-all',
        isCompleted && 'opacity-70 bg-muted/30'
      )}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={onToggle}
          className={cn(
            'h-5 w-5 rounded-full border-2',
            isCompleted 
              ? 'border-green-500 bg-green-500 text-white' 
              : 'border-gray-300 hover:border-gray-400'
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title Row */}
        <div className="flex items-start gap-2">
          <h4 className={cn(
            'font-medium text-foreground',
            isCompleted && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </h4>
          
          {/* Priority Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="secondary" 
                  className={cn('shrink-0 px-1.5 py-0.5', priority.bg, priority.color)}
                >
                  <PriorityIcon className="h-3 w-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{priority.label} Priority</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Description */}
        {task.description && (
          <p className={cn(
            'text-sm text-muted-foreground mt-1 line-clamp-2',
            isCompleted && 'line-through'
          )}>
            {task.description}
          </p>
        )}

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {/* Workstream */}
          {task.workstreamName && (
            <Badge variant="outline" className="text-xs font-normal">
              {task.workstreamName}
            </Badge>
          )}

          {/* Status */}
          <div className={cn('flex items-center gap-1 text-xs', status.color)}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{status.label}</span>
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              dueInfo.isOverdue ? 'text-red-500 font-medium' : 
              dueInfo.isSoon ? 'text-amber-600' : 'text-muted-foreground'
            )}>
              <Calendar className="h-3.5 w-3.5" />
              <span>{dueInfo.text}</span>
              {dueInfo.isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
            </div>
          )}

          {/* Estimated Hours */}
          {task.estimatedHours && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}

          {/* Assignee */}
          {task.assigneeId && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assigneeAvatar} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(task.assigneeName)}
                      </AvatarFallback>
                    </Avatar>
                    {task.assigneeName && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {task.assigneeName.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assigned to {task.assigneeName || 'Unknown'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================================
// WORKSTREAM GROUP
// ============================================================================

function WorkstreamGroup({
  name,
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}: {
  name: string;
  tasks: TaskWithWorkstream[];
  onToggleTask: (task: TaskWithWorkstream) => void;
  onEditTask: (task: TaskWithWorkstream) => void;
  onDeleteTask: (task: TaskWithWorkstream) => void;
}) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Total estimated hours
    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    
    return { total, completed, inProgress, blocked, progress, totalHours };
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background border">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{name}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{stats.completed}/{stats.total} done</span>
                {stats.totalHours > 0 && (
                  <>
                    <span>•</span>
                    <span>{stats.totalHours}h estimated</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mini status breakdown */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              {stats.inProgress > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {stats.inProgress} active
                </Badge>
              )}
              {stats.blocked > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {stats.blocked} blocked
                </Badge>
              )}
            </div>
            
            {/* Progress */}
            <div className="flex items-center gap-2 w-24">
              <Progress value={stats.progress} className="h-1.5" />
              <span className="text-xs font-medium w-8 text-right">{stats.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <CardContent className="p-4 space-y-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={() => onToggleTask(task)}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUMMARY CARDS
// ============================================================================

function TaskSummaryCards({ tasks }: { tasks: TaskWithWorkstream[] }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    
    const overdue = tasks.filter(t => {
      if (t.status === 'completed' || !t.dueDate) return false;
      return isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate));
    }).length;
    
    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total, completed, inProgress, blocked, pending, overdue, totalHours, progress
    };
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <CheckSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">{stats.completed} done</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-blue-600">{stats.inProgress} active</span>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-xl font-semibold">{stats.progress}%</p>
            </div>
          </div>
          <Progress value={stats.progress} className="mt-2 h-1.5" />
        </CardContent>
      </Card>

      {/* Estimated Hours */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Timer className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Hours</p>
              <p className="text-xl font-semibold">{stats.totalHours}h</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Across {tasks.filter(t => t.estimatedHours).length} tasks
          </p>
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              stats.overdue > 0 ? 'bg-red-100' : 'bg-green-100'
            )}>
              <AlertCircle className={cn(
                'h-4 w-4',
                stats.overdue > 0 ? 'text-red-600' : 'text-green-600'
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className={cn(
                'text-xl font-semibold',
                stats.overdue > 0 ? 'text-red-600' : ''
              )}>
                {stats.overdue}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.overdue > 0 ? 'Tasks need attention' : 'All on track'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyTasksState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="p-12 text-center">
      <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
        <CheckSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Tasks are created within site visits. Create a site visit from the Schedule 
        to start tracking work.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Go to Schedule
      </Button>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { data: tasksData, isLoading, refetch } = useProjectTasks({ projectId });
  const { data: workstreamsData } = useWorkstreams(projectId);
  const updateStatus = useUpdateJobTaskStatus();
  const deleteTask = useDeleteProjectTask(projectId);
  const { getUser } = useUserLookup();

  const [editingTask, setEditingTask] = useState<TaskWithWorkstream | null>(null);

  // Get workstreams for grouping
  const workstreams = workstreamsData?.data || [];

  // Transform and group tasks
  const tasks = useMemo(() => {
    const rawTasks = tasksData || [];
    return rawTasks.map((task: JobTask): TaskWithWorkstream => {
      const workstream = workstreams.find(w => w.id === task.workstreamId);
      const assignee = task.assigneeId ? getUser(task.assigneeId) : null;
      return {
        ...task,
        workstreamName: workstream?.name,
        assigneeName: assignee?.name ?? undefined,
      };
    });
  }, [tasksData, workstreams, getUser]);

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
    try {
      await updateStatus.mutateAsync({
        taskId: task.id,
        status: newStatus,
      });
      toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened');
      refetch();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (task: TaskWithWorkstream) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      try {
        await deleteTask.mutateAsync({ taskId: task.id, jobId: task.siteVisitId || '' });
        toast.success('Task deleted');
        refetch();
      } catch (err) {
        toast.error('Failed to delete task');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Tasks</h3>
            <p className="text-sm text-muted-foreground">
              Track work across all site visits
            </p>
          </div>
        </div>
        <EmptyTasksState onAdd={() => {}} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Tasks</h3>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tasks across {groupedTasks.length} workstreams
          </p>
        </div>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create in Schedule
        </Button>
      </div>

      {/* Summary */}
      <TaskSummaryCards tasks={tasks} />

      {/* Grouped Tasks */}
      <div className="space-y-4">
        {groupedTasks.map(([workstreamName, workstreamTasks]) => (
          <WorkstreamGroup
            key={workstreamName}
            name={workstreamName}
            tasks={workstreamTasks}
            onToggleTask={handleToggleTask}
            onEditTask={setEditingTask}
            onDeleteTask={handleDeleteTask}
          />
        ))}
      </div>

      {/* Edit Dialog */}
      <TaskEditDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        projectId={projectId}
        task={editingTask}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
