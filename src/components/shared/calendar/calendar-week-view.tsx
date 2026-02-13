"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarWeekHeader } from "./calendar-week-header";
import { CalendarHoursColumn } from "./calendar-hours-column";
import { CalendarDayColumn } from "./calendar-day-column";
import { INITIAL_SCROLL_OFFSET } from "./calendar-utils";
import type { CalendarWeekViewProps } from "./types";

export function CalendarWeekView<T>({
  items,
  weekDays,
  getItemKey,
  getDate,
  getStartTime,
  getEndTime,
  renderItem,
  onPreviousWeek,
  onNextWeek,
  emptyMessage,
  onEmptySlotClick,
  droppableDays,
}: CalendarWeekViewProps<T>) {
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const daysScrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasScrolledRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const today = new Date();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const itemsByDay = useMemo(() => {
    const byDay: Record<string, T[]> = {};
    weekDays.forEach((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      byDay[dayStr] = items.filter((item) => getDate(item) === dayStr);
    });
    return byDay;
  }, [items, weekDays, getDate]);

  const isTodayInWeek = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return weekDays.some((day) => format(day, "yyyy-MM-dd") === todayStr);
  }, [weekDays]);

  useEffect(() => {
    const scrollToInitial = () => {
      if (!hasScrolledRef.current && hoursScrollRef.current) {
        hoursScrollRef.current.scrollTop = INITIAL_SCROLL_OFFSET;
        daysScrollRefs.current.forEach((ref) => {
          if (ref) {
            ref.scrollTop = INITIAL_SCROLL_OFFSET;
          }
        });
        hasScrolledRef.current = true;
      }
    };

    scrollToInitial();
    const timeoutId = setTimeout(scrollToInitial, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleHoursScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    daysScrollRefs.current.forEach((ref) => {
      if (ref) {
        ref.scrollTop = scrollTop;
      }
    });
  };

  const handleDayScroll =
    (index: number) => (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      if (hoursScrollRef.current) {
        hoursScrollRef.current.scrollTop = scrollTop;
      }
      daysScrollRefs.current.forEach((ref, idx) => {
        if (ref && idx !== index) {
          ref.scrollTop = scrollTop;
        }
      });
    };

  return (
    <div className="flex flex-col h-full overflow-x-auto w-full relative">
      <CalendarWeekHeader
        weekDays={weekDays}
        today={today}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
      />

      <div className="flex min-w-full w-max flex-1 relative">
        <CalendarHoursColumn
          onScroll={handleHoursScroll}
          scrollRef={hoursScrollRef}
        />

        {weekDays.map((day, dayIndex) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayItems = itemsByDay[dayStr] || [];

          return (
            <CalendarDayColumn
              key={day.toISOString()}
              day={day}
              dayIndex={dayIndex}
              items={dayItems}
              today={today}
              isTodayInWeek={isTodayInWeek}
              currentTime={currentTime}
              onScroll={handleDayScroll}
              scrollRef={(el) => {
                daysScrollRefs.current[dayIndex] = el;
              }}
              renderItem={renderItem}
              getItemKey={getItemKey}
              getDate={getDate}
              getStartTime={getStartTime}
              getEndTime={getEndTime}
              onEmptySlotClick={onEmptySlotClick}
              droppableId={droppableDays ? `day-${dayStr}` : undefined}
            />
          );
        })}
      </div>
      {items.length === 0 && emptyMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-4 py-6 bg-background/80 backdrop-blur-sm rounded-lg pointer-events-auto">
            {emptyMessage}
          </div>
        </div>
      )}
    </div>
  );
}
