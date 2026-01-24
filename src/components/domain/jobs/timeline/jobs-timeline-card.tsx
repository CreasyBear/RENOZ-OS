'use client';

import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { TimelineJobItem } from '@/lib/schemas/jobs/job-timeline';

interface JobsTimelineCardProps {
  item: TimelineJobItem;
  columnWidth: number;
  rowHeight: number;
  weekDays: Date[];
  onSelectJob?: (jobId: string) => void;
}

const STATUS_COLORS = {
  scheduled:
    'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300',
  in_progress:
    'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300',
  completed:
    'bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600 text-green-700 dark:text-green-300',
  cancelled:
    'bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300',
  on_hold:
    'bg-amber-100 dark:bg-amber-900 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300',
};

const PRIORITY_COLORS = {
  low: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  medium: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  high: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
};

export const JobsTimelineCard = React.memo(function JobsTimelineCard({
  item,
  columnWidth,
  rowHeight,
  weekDays: _weekDays,
  onSelectJob,
}: JobsTimelineCardProps) {
  const { timelineSpan } = item;
  const colors = STATUS_COLORS[item.status];

  // Calculate position and width based on timeline span
  const left = timelineSpan.startIndex * columnWidth;
  const width = timelineSpan.spanDays * columnWidth;

  // Create gradient stripes for visual appeal (similar to Square UI projects-timeline)
  const stripeColors = [
    { bg: '#96e0ff', stripe: '#1abcfe' },
    { bg: '#ffdeac', stripe: '#ffb74a' },
    { bg: '#e1bee7', stripe: '#ab47bc' },
    { bg: '#ef9a9a', stripe: '#ef5350' },
    { bg: '#a5d6a7', stripe: '#66bb6a' },
  ];

  // Use a consistent color based on job type or a simple hash
  const colorIndex = item.jobType.length % stripeColors.length;
  const stripeColor = stripeColors[colorIndex];

  return (
    <div
      className="absolute cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md"
      style={{
        left: `${left + 8}px`, // Add padding
        width: `${width - 16}px`, // Account for padding
        height: `${rowHeight - 8}px`,
        top: '4px',
      }}
      onClick={() => onSelectJob?.(item.id)}
    >
      {/* Background stripes */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: stripeColor.bg,
            backgroundImage: `repeating-linear-gradient(294.886deg, ${stripeColor.stripe} 0px, ${stripeColor.stripe} 2.108px, transparent 2.108px, transparent 4.216px)`,
            backgroundSize: '8.917px 18.955px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between bg-white/90 p-3 backdrop-blur-sm dark:bg-gray-900/90">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h4 className="text-foreground flex-1 truncate text-sm font-semibold">{item.title}</h4>
            <Badge
              variant="outline"
              className={`px-1 py-0 text-[10px] ${PRIORITY_COLORS[item.priority]}`}
            >
              {item.priority}
            </Badge>
          </div>

          <div className="mb-2 flex items-center gap-1">
            <MapPin className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground truncate text-xs">{item.customer.name}</span>
          </div>

          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{Math.floor(item.duration / 60)}h</span>
            </div>
            <span className="text-foreground font-medium">{item.jobNumber}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${item.installer.email}`}
              />
              <AvatarFallback className="text-[8px]">
                {item.installer.name?.[0] || item.installer.email[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground max-w-[60px] truncate text-[10px]">
              {item.installer.name || item.installer.email}
            </span>
          </div>

          <div className={`rounded px-2 py-1 text-[10px] font-medium ${colors}`}>
            {item.status.replace('_', ' ')}
          </div>
        </div>

        {/* Show partial indicators */}
        {timelineSpan.isPartial && (
          <div className="absolute top-1 right-1">
            <div
              className="h-2 w-2 rounded-full bg-amber-400"
              title="Extends beyond current week"
            />
          </div>
        )}
      </div>
    </div>
  );
});
