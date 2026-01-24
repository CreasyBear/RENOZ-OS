'use client';

import { format } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { JobEventCard } from './job-event-card';
import type { CalendarKanbanTask } from '@/lib/schemas';

interface JobCalendarDayColumnProps {
  day: Date;
  dayIndex: number;
  tasks: (CalendarKanbanTask & {
    position: { top: number; height: number; slots: number };
    timeSlot: { start: Date; end: Date; duration: number };
  })[];
  isToday: boolean;
  isTodayInWeek: boolean;
  currentTime: Date;
  currentTimePosition: number | null;
  activeId?: string | null;
  onCreateEvent?: (date: Date, timeSlot: string) => void;
  onEditEvent?: (taskId: string) => void;
  onScroll: (index: number) => (e: React.UIEvent<HTMLDivElement>) => void;
  scrollRef: (el: HTMLDivElement | null) => void;
}

export function JobCalendarDayColumn({
  day,
  dayIndex,
  tasks,
  isToday,
  isTodayInWeek: _isTodayInWeek,
  currentTime: _currentTime,
  currentTimePosition,
  activeId,
  onCreateEvent,
  onEditEvent,
  onScroll,
  scrollRef,
}: JobCalendarDayColumnProps) {
  // Generate hours from 6 AM to 10 PM
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  return (
    <div className="border-border bg-background min-w-[140px] flex-1 border-r">
      {/* Day header */}
      <div className="border-border flex h-[72px] items-center justify-center border-b">
        <div className={`text-center ${isToday ? 'bg-primary/10 rounded-lg p-2' : ''}`}>
          <div className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
            {format(day, 'EEE')}
          </div>
          <div className={`text-sm ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
            {format(day, 'd')}
          </div>
        </div>
      </div>

      {/* Day content */}
      <div
        ref={(el) => scrollRef(el)}
        className="relative overflow-y-auto"
        style={{ height: 'calc(100vh - 200px)' }}
        onScroll={onScroll(dayIndex)}
      >
        {/* Hour slots */}
        {hours.flatMap((hour) => {
          // Create droppable zones for each 15-minute interval
          const timeSlots = [];
          for (let minute = 0; minute < 60; minute += 15) {
            const slotId = `timeslot-${dayIndex}-${hour}-${minute}`;
            const { setNodeRef, isOver } = useDroppable({
              id: slotId,
            });

            timeSlots.push(
              <div
                key={`${hour}-${minute}`}
                ref={setNodeRef}
                className={`border-border/20 h-[30px] cursor-pointer border-b transition-colors ${
                  isOver ? 'bg-primary/20 border-primary/50' : 'hover:bg-muted/30'
                }`}
                role="button"
                tabIndex={0}
                aria-label={`Create job at ${format(day, 'EEEE, MMMM d')} ${hour}:${minute.toString().padStart(2, '0')}`}
                onClick={() => {
                  if (onCreateEvent) {
                    const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    onCreateEvent(day, timeSlot);
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onCreateEvent) {
                    e.preventDefault();
                    const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    onCreateEvent(day, timeSlot);
                  }
                }}
                title={`Click to create event at ${hour}:${minute.toString().padStart(2, '0')}`}
              />
            );
          }

          return timeSlots;
        })}

        {/* Current time indicator */}
        {currentTimePosition !== null && (
          <div
            className="pointer-events-none absolute right-0 left-0 z-10"
            style={{ top: `${currentTimePosition}px` }}
          >
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div className="h-px flex-1 bg-red-500" />
            </div>
          </div>
        )}

        {/* Tasks */}
        {tasks.map((task) => {
          // Calculate position based on time
          const hoursFrom6AM = task.startTime.getHours() - 6 + task.startTime.getMinutes() / 60;
          const top = hoursFrom6AM * 120; // 120px per hour
          const height = Math.max(24, (task.duration / 60) * 120); // Minimum 24px height

          return (
            <div
              key={task.id}
              className="absolute right-1 left-1 z-20"
              style={{
                top: `${top}px`,
                height: `${height}px`,
              }}
              onDoubleClick={() => {
                if (onEditEvent) {
                  onEditEvent(task.id);
                }
              }}
            >
              <JobEventCard task={task} isDragging={activeId === task.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
