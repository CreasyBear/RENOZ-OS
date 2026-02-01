/**
 * Status Timeline Component
 *
 * Linear vertical timeline for entity status history.
 * Used for order status, invoice status, warranty status, etc.
 * Based on Midday invoice activity pattern.
 */
import { memo } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface StatusTimelineEvent {
  id: string;
  label: string;
  timestamp: Date | string | null;
  completed: boolean;
  user?: { name: string } | null;
  note?: string;
}

export interface StatusTimelineProps {
  events: StatusTimelineEvent[];
  timeFormat?: "12h" | "24h";
  className?: string;
}

export const StatusTimeline = memo(function StatusTimeline({
  events,
  timeFormat = "12h",
  className,
}: StatusTimelineProps) {
  return (
    <ul className={cn("space-y-0", className)}>
      {events.map((event, index) => (
        <li key={event.id} className="relative pb-6 last:pb-0">
          {/* Vertical line */}
          {index !== events.length - 1 && (
            <div className="absolute left-[3px] top-[20px] bottom-0 border-l border-border" />
          )}

          <div className="flex items-center gap-3">
            {/* Dot indicator */}
            <div
              className={cn(
                "relative z-10 flex h-[7px] w-[7px] items-center justify-center rounded-full border",
                event.completed
                  ? "bg-foreground border-foreground"
                  : "bg-background border-muted-foreground"
              )}
            />

            {/* Content */}
            <div className="flex flex-1 items-center justify-between">
              <span
                className={cn(
                  "text-sm",
                  event.completed ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {event.label}
              </span>

              {event.timestamp && (
                <span className="text-sm text-muted-foreground">
                  {format(
                    typeof event.timestamp === "string" ? new Date(event.timestamp) : event.timestamp,
                    timeFormat === "24h" ? "MMM d, HH:mm" : "MMM d, h:mm a"
                  )}
                </span>
              )}
            </div>
          </div>

          {/* User attribution */}
          {event.user && event.completed && (
            <p className="ml-[19px] mt-1 text-xs text-muted-foreground">
              by {event.user.name}
            </p>
          )}

          {/* Note */}
          {event.note && (
            <p className="ml-[19px] mt-1 text-sm text-muted-foreground">
              {event.note}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
});
