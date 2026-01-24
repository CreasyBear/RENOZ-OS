'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JobCalendarWeekHeaderProps {
  weekDays: Date[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function JobCalendarWeekHeader({
  weekDays,
  onPreviousWeek,
  onNextWeek,
}: JobCalendarWeekHeaderProps) {
  const weekStartDate = weekDays[0];
  const weekEndDate = weekDays[weekDays.length - 1];

  const formatWeekRange = () => {
    const startMonth = format(weekStartDate, 'MMM');
    const endMonth = format(weekEndDate, 'MMM');
    const startDay = format(weekStartDate, 'd');
    const endDay = format(weekEndDate, 'd');
    const year = format(weekStartDate, 'yyyy');

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };

  return (
    <div className="border-border bg-muted/30 flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onPreviousWeek} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onNextWeek} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h3 className="text-foreground text-lg font-semibold">{formatWeekRange()}</h3>
      </div>

      <div className="flex items-center gap-1">
        {weekDays.map((day, _index) => (
          <div key={day.toISOString()} className="min-w-[140px] flex-1 text-center">
            <div className="text-foreground text-sm font-medium">{format(day, 'EEE')}</div>
            <div className="text-muted-foreground text-sm">{format(day, 'd')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
