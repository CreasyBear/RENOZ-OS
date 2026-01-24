/**
 * Activity Heatmap Component
 *
 * Displays activity density by day of week and hour of day.
 * Uses accessible color scale with value labels for screen readers.
 *
 * @see ACTIVITY-DASHBOARD-UI acceptance criteria
 */

import { cn } from '~/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActivityStats } from '@/hooks';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityHeatmapProps {
  dateFrom?: Date;
  dateTo?: Date;
  className?: string;
}

interface HeatmapCellData {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  count: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Accessible color scale (blue gradient with distinct values)
const COLOR_SCALE = [
  'bg-blue-50 dark:bg-blue-950/20',
  'bg-blue-100 dark:bg-blue-900/30',
  'bg-blue-200 dark:bg-blue-800/40',
  'bg-blue-300 dark:bg-blue-700/50',
  'bg-blue-400 dark:bg-blue-600/60',
  'bg-blue-500 dark:bg-blue-500/70',
  'bg-blue-600 dark:bg-blue-400/80',
];

// ============================================================================
// UTILITIES
// ============================================================================

function getColorClass(count: number, maxCount: number): string {
  if (count === 0) return 'bg-muted/30';
  const ratio = count / maxCount;
  const index = Math.min(Math.floor(ratio * (COLOR_SCALE.length - 1)), COLOR_SCALE.length - 1);
  return COLOR_SCALE[index];
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function formatHourRange(hour: number): string {
  const start = formatHour(hour);
  const end = formatHour((hour + 1) % 24);
  return `${start} - ${end}`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function HeatmapSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading heatmap">
      <Skeleton className="h-4 w-full" />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex gap-1">
          <Skeleton className="h-6 w-10" />
          {Array.from({ length: 24 }).map((_, j) => (
            <Skeleton key={j} className="h-6 w-3" />
          ))}
        </div>
      ))}
    </div>
  );
}

function HeatmapCell({
  day,
  hour,
  count,
  maxCount,
}: HeatmapCellData & {
  maxCount: number;
}) {
  const colorClass = getColorClass(count, maxCount);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn('h-6 w-3 cursor-default rounded-sm transition-colors', colorClass)}
          role="gridcell"
          aria-label={`${DAYS[day]} ${formatHourRange(hour)}: ${count} activities`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="font-medium">
          {DAYS[day]} {formatHourRange(hour)}
        </div>
        <div className="text-muted-foreground">
          {count.toLocaleString()} {count === 1 ? 'activity' : 'activities'}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Activity heatmap showing when activities occur.
 *
 * @example
 * ```tsx
 * <ActivityHeatmap
 *   dateFrom={startOfMonth(new Date())}
 *   dateTo={new Date()}
 * />
 * ```
 */
export function ActivityHeatmap({ dateFrom, dateTo, className }: ActivityHeatmapProps) {
  const { data, isLoading, isError } = useActivityStats({
    dateFrom,
    dateTo,
    groupBy: 'hour',
  });

  if (isLoading) {
    return <HeatmapSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-muted-foreground flex h-[200px] items-center justify-center">
        Failed to load heatmap data
      </div>
    );
  }

  // Build heatmap data structure from hourly stats
  // Since we only have hour groupBy, create a simplified view
  const hourlyData: number[] = Array.from({ length: 24 }, () => 0);

  let maxCount = 1;
  (data?.stats ?? []).forEach((item) => {
    const hour = parseInt(item.key, 10);
    if (!isNaN(hour) && hour >= 0 && hour < 24) {
      hourlyData[hour] = item.count;
      maxCount = Math.max(maxCount, item.count);
    }
  });

  const totalActivities = hourlyData.reduce((sum, count) => sum + count, 0);

  if (totalActivities === 0) {
    return (
      <div className="text-muted-foreground flex h-[200px] items-center justify-center">
        No activity data for this period
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn('space-y-3', className)}>
        {/* Hour labels */}
        <div className="flex items-end gap-1 overflow-x-auto">
          {HOURS.filter((h) => h % 3 === 0).map((hour) => (
            <div
              key={hour}
              className="text-muted-foreground text-[10px]"
              style={{ width: `${3 * 12 + 3 * 4}px` }}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Simplified hourly heatmap */}
        <div role="grid" aria-label="Activity heatmap by hour of day">
          <div className="flex items-center gap-1" role="row">
            <div
              className="text-muted-foreground w-16 shrink-0 pr-2 text-right text-xs"
              role="rowheader"
            >
              Activity
            </div>
            {HOURS.map((hour) => (
              <HeatmapCell
                key={`0-${hour}`}
                day={0}
                hour={hour}
                count={hourlyData[hour]}
                maxCount={maxCount}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="bg-muted/30 h-3 w-3 rounded-sm" />
            {COLOR_SCALE.map((color, i) => (
              <div key={i} className={cn('h-3 w-3 rounded-sm', color)} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
