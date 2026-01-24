'use client';

import React from 'react';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { CalendarKanbanTask } from '@/lib/schemas';

interface JobEventCardProps {
  task: CalendarKanbanTask;
  isDragging?: boolean;
}

const STATUS_COLORS = {
  scheduled:
    'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300',
  in_progress:
    'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300',
  completed:
    'bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600 text-green-700 dark:text-green-300',
  cancelled:
    'bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300',
  on_hold:
    'bg-amber-100 dark:bg-amber-900 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300',
};

const PRIORITY_COLORS = {
  low: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  medium: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  high: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
};

export const JobEventCard = React.memo(function JobEventCard({
  task,
  isDragging = false,
}: JobEventCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  const colors = STATUS_COLORS[task.status];
  const priorityColor = PRIORITY_COLORS[task.priority];

  const duration = task.duration;
  const isVeryShort = duration < 30;
  const isMedium = duration >= 30 && duration < 60;
  const timeStr = `${format(task.startTime, 'h:mm a')} - ${format(task.endTime, 'h:mm a')}`;

  if (isVeryShort) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`h-full w-full cursor-grab rounded-lg border px-2 py-1 transition-opacity hover:opacity-80 active:cursor-grabbing ${colors} ${
          isDragging || isCurrentlyDragging ? 'rotate-2 opacity-50 shadow-lg' : ''
        }`}
        aria-label={`Drag job "${task.title}" from ${format(task.startTime, 'h:mm a')}`}
        {...listeners}
        {...attributes}
      >
        <div className="flex h-full items-center gap-1">
          <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
          <span className="flex-1 truncate text-[10px] font-medium">{task.title}</span>
          <span className="flex-shrink-0 text-[9px] opacity-75">
            {format(task.startTime, 'h:mm a')}
          </span>
        </div>
      </div>
    );
  }

  if (isMedium) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`h-full w-full cursor-grab rounded-lg border px-2.5 py-2 transition-opacity hover:opacity-80 active:cursor-grabbing ${colors} ${
          isDragging || isCurrentlyDragging ? 'rotate-2 opacity-50 shadow-lg' : ''
        }`}
        aria-label={`Drag job "${task.title}" from ${timeStr}`}
        {...listeners}
        {...attributes}
      >
        <div className="flex h-full flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
            <span className="flex-1 truncate text-[10px] font-medium">{task.title}</span>
          </div>
          <span className="text-[9px] opacity-75">{timeStr}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full w-full cursor-grab rounded-lg border p-3 transition-opacity hover:opacity-80 active:cursor-grabbing ${colors} ${
        isDragging || isCurrentlyDragging ? 'rotate-2 opacity-50 shadow-lg' : ''
      }`}
      aria-label={`Drag job "${task.title}" for ${task.installer.name || task.installer.email} from ${timeStr}`}
      {...listeners}
      {...attributes}
    >
      <div className="flex h-full flex-col gap-1.5">
        <div className="min-h-0 flex-1">
          <h4 className="mb-1 truncate text-xs font-semibold">{task.title}</h4>
          <p className="mb-2 text-[10px] opacity-75">{timeStr}</p>

          <div className="mb-2 flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${task.installer.email}`}
              />
              <AvatarFallback className="text-[8px]">
                {task.installer.name?.[0] || task.installer.email[0]}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[9px] opacity-75">
              {task.installer.name || task.installer.email}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className={`px-1 py-0 text-[8px] ${priorityColor}`}>
              {task.priority}
            </Badge>
            <span className="text-[8px] opacity-75">{task.jobNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
