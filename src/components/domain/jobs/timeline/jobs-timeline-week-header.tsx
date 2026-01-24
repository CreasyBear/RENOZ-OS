'use client';

import { format } from 'date-fns';

interface JobsTimelineWeekHeaderProps {
  weekDays: Date[];
}

export function JobsTimelineWeekHeader({ weekDays }: JobsTimelineWeekHeaderProps) {
  return (
    <div className="border-border bg-muted/30 border-b px-4 py-3">
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

          return (
            <div
              key={day.toISOString()}
              className={`text-center ${isToday ? 'bg-primary/10 rounded-lg p-2' : ''}`}
            >
              <div
                className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}
              >
                {format(day, 'EEE')}
              </div>
              <div className={`text-sm ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
