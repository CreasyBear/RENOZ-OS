import { useCallback, useState } from 'react';
import { addDays, differenceInCalendarDays } from 'date-fns';

import { cn } from '@/lib/utils';
import {
  TIMELINE_STATUS_CONFIG,
  type TimelineTask,
} from './project-timeline-gantt-config';

export interface ProjectTimelineGanttTaskBarProps {
  task: TimelineTask;
  viewStart: Date;
  viewEnd: Date;
  cellWidth: number;
  onClick?: (e: React.MouseEvent) => void;
  onDateChange?: (startDate: Date, endDate: Date) => void;
}

export function ProjectTimelineGanttTaskBar({
  task,
  viewStart,
  viewEnd,
  cellWidth,
  onClick,
  onDateChange,
}: ProjectTimelineGanttTaskBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragKind, setDragKind] = useState<'move' | 'resize-left' | 'resize-right' | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!onDateChange) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const kind: 'move' | 'resize-left' | 'resize-right' =
        task.visitId
          ? 'move'
          : offsetX < 8
            ? 'resize-left'
            : offsetX > rect.width - 8
              ? 'resize-right'
              : 'move';
      setDragKind(kind);
      setIsDragging(true);
      const startX = e.clientX;
      document.body.style.cursor = kind === 'move' ? 'grabbing' : 'col-resize';

      const handleMove = (moveEv: globalThis.PointerEvent) => {
        setDragOffset(moveEv.clientX - startX);
      };

      const handleUp = (upEv: globalThis.PointerEvent) => {
        const deltaX = upEv.clientX - startX;
        const daysMoved = Math.round(deltaX / cellWidth);
        if (daysMoved !== 0) {
          if (kind === 'move') {
            onDateChange(addDays(task.startDate, daysMoved), addDays(task.endDate, daysMoved));
          } else if (kind === 'resize-left') {
            const newStart = addDays(task.startDate, daysMoved);
            if (newStart < task.endDate) onDateChange(newStart, task.endDate);
          } else if (kind === 'resize-right') {
            const newEnd = addDays(task.endDate, daysMoved);
            if (newEnd > task.startDate) onDateChange(task.startDate, newEnd);
          }
        }
        setIsDragging(false);
        setDragOffset(0);
        setDragKind(null);
        document.body.style.cursor = '';
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [onDateChange, task, cellWidth]
  );

  const isVisible = task.startDate <= viewEnd && task.endDate >= viewStart;
  if (!isVisible) return null;

  const daysFromStart = Math.max(0, differenceInCalendarDays(task.startDate, viewStart));
  const visibleStart = task.startDate < viewStart ? viewStart : task.startDate;
  const visibleEnd = task.endDate > viewEnd ? viewEnd : task.endDate;
  const durationDays = differenceInCalendarDays(visibleEnd, visibleStart) + 1;
  const baseLeft = daysFromStart * cellWidth;
  const baseWidth = Math.max(cellWidth * 0.7, durationDays * cellWidth - 6);

  let visualLeft = baseLeft + 4;
  let visualWidth = baseWidth;
  if (isDragging && dragKind) {
    if (dragKind === 'move') {
      visualLeft = baseLeft + 4 + dragOffset;
    } else if (dragKind === 'resize-left') {
      visualLeft = baseLeft + 4 + dragOffset;
      visualWidth = Math.max(cellWidth * 0.7, baseWidth - dragOffset);
    } else if (dragKind === 'resize-right') {
      visualWidth = Math.max(cellWidth * 0.7, baseWidth + dragOffset);
    }
  }

  const status = TIMELINE_STATUS_CONFIG[task.status];
  const isDraggable = !!onDateChange;

  return (
    <div
      className={cn(
        'absolute h-8 rounded-md border select-none overflow-hidden',
        isDraggable ? 'cursor-grab active:cursor-grabbing group' : 'cursor-pointer',
        'hover:shadow-md hover:scale-[1.01]',
        isDragging && 'z-30 shadow-lg opacity-90',
        !isDragging && 'transition-all',
        status.bg,
        status.border
      )}
      style={{
        left: `${visualLeft}px`,
        width: `${visualWidth}px`,
        top: '8px',
        transition: isDragging ? 'none' : 'left 0.2s ease, width 0.2s ease',
      }}
      onClick={onClick}
      onPointerDown={isDraggable ? handlePointerDown : undefined}
    >
      {isDraggable && !task.visitId && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-l-md" />
          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-r-md" />
        </>
      )}
      <div className={cn('absolute inset-y-0 left-0 rounded-l-md opacity-30', status.bar)} style={{ width: `${task.progress}%` }} />
      <div className="relative flex items-center h-full px-2 gap-2 min-w-0">
        <span className={cn('text-xs font-medium truncate flex-1', status.text)}>{task.title}</span>
        {task.progress > 0 && <span className={cn('text-[10px] tabular-nums', status.text)}>{task.progress}%</span>}
      </div>
    </div>
  );
}
