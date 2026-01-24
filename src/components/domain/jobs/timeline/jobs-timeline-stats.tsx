'use client';

import { BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface JobsTimelineStatsProps {
  stats: Array<{
    status: string;
    count: number;
    totalHours: number;
  }>;
}

const STATUS_COLORS = {
  scheduled: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  in_progress: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  completed: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  cancelled: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  on_hold: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
};

export function JobsTimelineStats({ stats }: JobsTimelineStatsProps) {
  const totalJobs = stats.reduce((sum, stat) => sum + stat.count, 0);
  const totalHours = stats.reduce((sum, stat) => sum + stat.totalHours, 0);

  if (totalJobs === 0) return null;

  return (
    <div className="border-border bg-muted/20 border-t px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground text-sm font-medium">Week Summary</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-muted-foreground text-sm">
            {totalJobs} job{totalJobs !== 1 ? 's' : ''} • {totalHours}h total
          </div>

          <div className="flex items-center gap-1">
            {stats.map((stat) => (
              <Badge
                key={stat.status}
                variant="outline"
                className={`px-2 py-0 text-[10px] ${STATUS_COLORS[stat.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.scheduled}`}
              >
                {stat.count} {stat.status.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
