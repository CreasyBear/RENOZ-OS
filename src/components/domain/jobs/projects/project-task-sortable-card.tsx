import { format, isPast, isToday, isTomorrow, addDays, formatDistanceToNow as formatDistanceToNowDateFns } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  Edit3,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Timer,
  Trash2,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@tanstack/react-router';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TaskWithWorkstream } from '@/lib/schemas/jobs';
import {
  PROJECT_TASK_PRIORITY_CONFIG,
  PROJECT_TASK_STATUS_CONFIG,
} from './project-task-config';

function formatDueDate(date: Date | string | null | undefined): { text: string; isOverdue: boolean; isSoon: boolean } {
  if (!date) return { text: 'No due date', isOverdue: false, isSoon: false };

  const dueDate = date instanceof Date ? date : new Date(date);
  const today = new Date();

  if (isToday(dueDate)) return { text: 'Due today', isOverdue: false, isSoon: true };
  if (isTomorrow(dueDate)) return { text: 'Due tomorrow', isOverdue: false, isSoon: true };
  if (isPast(dueDate) && !isToday(dueDate)) return { text: `Overdue by ${formatDistanceToNowDateFns(dueDate)}`, isOverdue: true, isSoon: false };

  if (dueDate <= addDays(today, 3)) return { text: format(dueDate, 'MMM d'), isOverdue: false, isSoon: true };

  return { text: format(dueDate, 'MMM d, yyyy'), isOverdue: false, isSoon: false };
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export interface ProjectTaskSortableCardProps {
  task: TaskWithWorkstream;
  projectId: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectTaskSortableCard({
  task,
  projectId,
  onToggle,
  onEdit,
  onDelete,
}: ProjectTaskSortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        task.status === 'completed' && 'opacity-70 bg-muted/30'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="pt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <ProjectTaskCardContent
        task={task}
        projectId={projectId}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

interface ProjectTaskCardContentProps {
  task: TaskWithWorkstream;
  projectId: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjectTaskCardContent({
  task,
  projectId,
  onToggle,
  onEdit,
  onDelete,
}: ProjectTaskCardContentProps) {
  const priority = PROJECT_TASK_PRIORITY_CONFIG[task.priority || 'normal'];
  const status = PROJECT_TASK_STATUS_CONFIG[task.status];
  const dueInfo = formatDueDate(task.dueDate);
  const isCompleted = task.status === 'completed';
  const PriorityIcon = priority.icon;
  const StatusIcon = status.icon;

  return (
    <>
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

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h4 className={cn(
            'font-medium text-foreground',
            isCompleted && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </h4>

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
        </div>

        {task.description && (
          <p className={cn(
            'text-sm text-muted-foreground mt-1 line-clamp-2',
            isCompleted && 'line-through'
          )}>
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <div className={cn('flex items-center gap-1 text-xs', status.color)}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{status.label}</span>
          </div>

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

          {task.estimatedHours && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}

          {task.assigneeId && (
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
          )}

          {task.siteVisitId && task.siteVisitNumber && (
            <Link
              to="/projects/$projectId/visits/$visitId"
              params={{ projectId, visitId: task.siteVisitId }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              Visit {task.siteVisitNumber}
            </Link>
          )}
        </div>
      </div>

      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Task actions">
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
    </>
  );
}
