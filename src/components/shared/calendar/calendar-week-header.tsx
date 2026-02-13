"use client";

import { format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarWeekHeaderProps {
  weekDays: Date[];
  today: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function CalendarWeekHeader({
  weekDays,
  today,
  onPreviousWeek,
  onNextWeek,
}: CalendarWeekHeaderProps) {
  return (
    <div className="flex border-b border-border sticky top-0 z-30 bg-background w-max min-w-full">
      <div className="w-[80px] md:w-[104px] flex items-center gap-1 md:gap-2 p-1.5 md:p-2 border-r border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 size-11 touch-manipulation focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={onPreviousWeek}
          aria-label="Previous week"
        >
          <ChevronLeft className="size-4 md:size-5" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 size-11 touch-manipulation focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={onNextWeek}
          aria-label="Next week"
        >
          <ChevronRight className="size-4 md:size-5" aria-hidden />
        </Button>
      </div>
      {weekDays.map((day) => {
        const isToday = isSameDay(day, today);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex-1 border-r border-border last:border-r-0 p-1.5 md:p-2 min-w-44 flex items-center",
              isToday && "bg-primary/5"
            )}
          >
            <div
              className={cn(
                "text-xs md:text-sm font-medium",
                isToday ? "text-primary font-semibold" : "text-foreground"
              )}
            >
              {format(day, "dd EEE").toUpperCase()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
