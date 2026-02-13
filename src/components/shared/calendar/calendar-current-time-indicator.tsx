"use client";

import { useEffect, useState, startTransition } from "react";
import { isSameDay } from "date-fns";
import { getCurrentTimePosition } from "./calendar-utils";

interface CalendarCurrentTimeIndicatorProps {
  day: Date;
  today: Date;
  isTodayInWeek: boolean;
  currentTime: Date;
}

export function CalendarCurrentTimeIndicator({
  day,
  today,
  isTodayInWeek,
  currentTime,
}: CalendarCurrentTimeIndicatorProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    startTransition(() => setPrefersReducedMotion(mq.matches));
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!isTodayInWeek || !isSameDay(day, today)) {
    return null;
  }

  if (prefersReducedMotion) {
    return null;
  }

  const currentTimePosition = getCurrentTimePosition(currentTime);

  return (
    <div
      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
      style={{
        top: `${currentTimePosition}px`,
        transform: "translateY(-50%)",
      }}
      aria-hidden
    >
      <div className="size-2 rounded-full bg-destructive shrink-0 -ml-1" />
      <div className="h-0.5 bg-destructive flex-1" />
    </div>
  );
}
