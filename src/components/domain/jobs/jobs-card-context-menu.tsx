/**
 * JobsCardContextMenu Component
 *
 * Context menu for task actions on kanban cards.
 * Provides quick access to common task operations.
 */

import { MoreHorizontal, Copy, Trash2, Eye, User, Flag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { KanbanTask } from '@/hooks/jobs/use-job-tasks-kanban';

export interface JobsCardContextMenuProps {
  task: KanbanTask;
  onView: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDuplicate?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onChangePriority?: (taskId: string, priority: string) => void;
  onAssign?: (taskId: string, assigneeId: string) => void;
  availableAssignees?: Array<{ id: string; name: string }>;
}

export function JobsCardContextMenu({
  task,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onChangePriority,
  onAssign,
  availableAssignees = [],
}: JobsCardContextMenuProps) {
  const priorityOptions = [
    { id: 'low', name: 'Low Priority', icon: Flag, color: 'text-green-600' },
    { id: 'normal', name: 'Normal Priority', icon: Flag, color: 'text-blue-600' },
    { id: 'high', name: 'High Priority', icon: Flag, color: 'text-yellow-600' },
    { id: 'urgent', name: 'Urgent Priority', icon: Flag, color: 'text-red-600' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 min-h-[44px] w-6 min-w-[44px] md:h-6 md:min-h-0 md:w-6 md:min-w-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(task.id)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onEdit(task.id)}>
          <MoreHorizontal className="mr-2 h-4 w-4" />
          Quick Edit
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Priority Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Flag className="mr-2 h-4 w-4" />
            Change Priority
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {priorityOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => onChangePriority?.(task.id, option.id)}
                  className={task.priority === option.id ? 'bg-muted' : ''}
                >
                  <IconComponent className={`mr-2 h-4 w-4 ${option.color}`} />
                  {option.name}
                  {task.priority === option.id && ' ✓'}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Assignee Submenu */}
        {availableAssignees.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <User className="mr-2 h-4 w-4" />
              Assign To
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onAssign?.(task.id, 'unassign')}>
                Unassign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableAssignees.map((assignee) => (
                <DropdownMenuItem
                  key={assignee.id}
                  onClick={() => onAssign?.(task.id, assignee.id)}
                  className={task.assignee?.id === assignee.id ? 'bg-muted' : ''}
                >
                  {assignee.name}
                  {task.assignee?.id === assignee.id && ' ✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />

        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(task.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Task
          </DropdownMenuItem>
        )}

        {onDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(task.id)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Task
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
