"use client";

import { Fragment } from "react";
import {
  HOURS_24,
  HOUR_HEIGHT,
  getEventTop,
  getEventHeight,
  hourIndexToTime,
} from "./calendar-utils";
import { cn } from "~/lib/utils";
import { CalendarCurrentTimeIndicator } from "./calendar-current-time-indicator";
import type { CalendarDayColumnProps } from "./types";
import { useDroppable } from "@dnd-kit/core";

function CalendarDayColumnInner<T>({
  day,
  dayIndex,
  items,
  today,
  isTodayInWeek,
  currentTime,
  onScroll,
  scrollRef,
  renderItem,
  getItemKey,
  getStartTime,
  getEndTime,
  onEmptySlotClick,
  isOver,
}: CalendarDayColumnProps<T> & { isOver?: boolean }) {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll(dayIndex)}
      className={cn(
        "flex-1 border-r border-border last:border-r-0 relative min-w-44 overflow-y-auto",
        isOver && "bg-primary/5"
      )}
    >
      {HOURS_24.map((hour, hourIndex) => {
        const timeStr = hourIndexToTime(hourIndex);
        const hasClick = !!onEmptySlotClick;
        return (
          <div
            key={hour}
            role={hasClick ? "button" : undefined}
            tabIndex={hasClick ? -1 : undefined}
            title={hasClick ? "Click to add visit" : undefined}
            onClick={
              hasClick
                ? () => onEmptySlotClick?.(new Date(day), timeStr)
                : undefined
            }
            onKeyDown={
              hasClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEmptySlotClick?.(new Date(day), timeStr);
                    }
                  }
                : undefined
            }
            className={cn(
              "border-b border-border",
              hasClick &&
                "cursor-pointer hover:bg-muted/30 transition-colors min-h-[44px] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            )}
            style={{ height: `${HOUR_HEIGHT}px` }}
            aria-label={hasClick ? `Add visit at ${timeStr} on ${day.toLocaleDateString()}` : undefined}
          >
            {" "}
          </div>
        );
      })}

      <CalendarCurrentTimeIndicator
        day={day}
        today={today}
        isTodayInWeek={isTodayInWeek}
        currentTime={currentTime}
      />

      {items.map((item) => {
        const startTime = getStartTime(item);
        const endTime = getEndTime(item);
        const top = getEventTop(startTime);
        const height = getEventHeight(startTime, endTime);

        return (
          <Fragment key={getItemKey(item)}>
            {renderItem(item, {
              top: `${top + 4}px`,
              height: `${height - 8}px`,
            })}
          </Fragment>
        );
      })}
    </div>
  );
}

export function CalendarDayColumn<T>(props: CalendarDayColumnProps<T>) {
  const { droppableId, ...rest } = props;

  if (!droppableId) {
    return <CalendarDayColumnInner {...rest} />;
  }

  return (
    <CalendarDayColumnDroppable droppableId={droppableId} {...rest} />
  );
}

function CalendarDayColumnDroppable<T>(
  props: CalendarDayColumnProps<T> & { droppableId: string }
) {
  const { droppableId, scrollRef, ...rest } = props;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { dayKey: droppableId },
  });

  const combinedRef = (el: HTMLDivElement | null) => {
    scrollRef?.(el);
    setNodeRef(el);
  };

  return (
    <CalendarDayColumnInner
      {...rest}
      scrollRef={combinedRef}
      isOver={isOver}
    />
  );
}
