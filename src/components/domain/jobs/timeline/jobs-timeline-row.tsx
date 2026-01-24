'use client';

import { JobsTimelineCard } from './jobs-timeline-card';
import type { TimelineJobItem } from '@/lib/schemas/jobs/job-timeline';

interface JobsTimelineRowProps {
  items: TimelineJobItem[];
  weekDays: Date[];
  rowIndex: number;
  onSelectJob?: (jobId: string) => void;
}

export function JobsTimelineRow({
  items,
  weekDays,
  rowIndex: _rowIndex,
  onSelectJob,
}: JobsTimelineRowProps) {
  const columnWidth = 160; // Match the day column width from calendar
  const rowHeight = 80; // Height for each timeline row

  return (
    <div className="relative" style={{ height: `${rowHeight}px` }}>
      {/* Render each timeline item in this row */}
      {items.map((item) => (
        <JobsTimelineCard
          key={item.id}
          item={item}
          columnWidth={columnWidth}
          rowHeight={rowHeight}
          weekDays={weekDays}
          onSelectJob={onSelectJob}
        />
      ))}
    </div>
  );
}
