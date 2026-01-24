'use client';

interface JobCalendarHoursColumnProps {
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function JobCalendarHoursColumn({ onScroll, scrollRef }: JobCalendarHoursColumnProps) {
  // Generate hours from 6 AM to 10 PM (typical work day)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  return (
    <div className="border-border bg-muted/20 w-16 flex-shrink-0 border-r">
      {/* Header space for week header alignment */}
      <div className="border-border h-[72px] border-b" />

      {/* Hours column */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ height: 'calc(100vh - 200px)' }}
        onScroll={onScroll}
      >
        {hours.map((hour) => (
          <div
            key={hour}
            className="border-border/50 flex h-[120px] items-start justify-end border-b pt-1 pr-2"
          >
            <span className="text-muted-foreground text-xs font-medium">
              {hour === 0
                ? '12 AM'
                : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                    ? '12 PM'
                    : `${hour - 12} PM`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
