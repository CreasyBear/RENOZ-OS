/**
 * Reports Landing Content
 *
 * DOMAIN-LANDING compliant: Favorites section + Scheduled reports list
 * with filter chips (Failed / Upcoming / All). No nav grid.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 * @see reports_domain_remediation plan Phase 3
 */
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Mail,
  Star,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow, format, isFuture } from 'date-fns';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useReportFavorites, useScheduledReports } from '@/hooks/reports';
import type { PrebuiltReportType } from '@/lib/schemas/reports/report-favorites';
import type { ScheduledReport } from '@/lib/schemas/reports/scheduled-reports';
import type { ReportFavoriteWithDetails } from '@/lib/schemas/reports/report-favorites';

// ============================================================================
// CONSTANTS
// ============================================================================

const PREBUILT_REPORT_LINKS: Record<PrebuiltReportType, { label: string; href: string }> = {
  customer: { label: 'Customer Reports', href: '/reports/customers' },
  'pipeline-forecast': { label: 'Pipeline Forecast', href: '/reports/pipeline-forecast' },
  'job-costing': { label: 'Job Costing', href: '/reports/job-costing' },
  procurement: { label: 'Procurement Reports', href: '/reports/procurement' },
  warranty: { label: 'Warranty Analytics', href: '/reports/warranties' },
  'expiring-warranties': { label: 'Expiring Warranties', href: '/reports/expiring-warranties' },
  'win-loss': { label: 'Win/Loss Analysis', href: '/reports/win-loss' },
  financial: { label: 'Financial Summary', href: '/reports/financial' },
};

const REPORT_LINKS_FOR_MORE_DROPDOWN = [
  { label: 'Customer Reports', href: '/reports/customers' },
  { label: 'Pipeline Forecast', href: '/reports/pipeline-forecast' },
  { label: 'Job Costing', href: '/reports/job-costing' },
  { label: 'Procurement Reports', href: '/reports/procurement' },
  { label: 'Warranty Analytics', href: '/reports/warranties' },
  { label: 'Expiring Warranties', href: '/reports/expiring-warranties' },
  { label: 'Win/Loss Analysis', href: '/reports/win-loss' },
  { label: 'Financial Summary', href: '/reports/financial' },
] as const;

type ScheduleFilter = 'all' | 'failed' | 'upcoming';

function getFavoriteLabel(fav: ReportFavoriteWithDetails): string {
  if (fav.reportName) return fav.reportName;
  const link = PREBUILT_REPORT_LINKS[fav.reportType as PrebuiltReportType];
  return link?.label ?? fav.reportType;
}

function getFavoriteHref(fav: ReportFavoriteWithDetails): string {
  const link = PREBUILT_REPORT_LINKS[fav.reportType as PrebuiltReportType];
  if (link) return link.href;
  if (fav.reportId && fav.reportType === 'scheduled') {
    return '/settings/scheduled-reports';
  }
  return '/reports';
}

function isReportFailed(report: ScheduledReport): boolean {
  const failures = report.consecutiveFailures;
  if (!failures) return false;
  const n = parseInt(failures, 10);
  return !Number.isNaN(n) && n > 0;
}

function isReportUpcoming(report: ScheduledReport): boolean {
  if (!report.nextRunAt) return false;
  return isFuture(new Date(report.nextRunAt));
}

// ============================================================================
// COMPONENTS
// ============================================================================

export interface ReportsLandingContentProps {
  /** Primary CTA (e.g. Schedule Report button) - rendered by route */
  className?: string;
}

/**
 * Reports landing content: Favorites + Scheduled list with filter chips.
 */
export function ReportsLandingContent({ className }: ReportsLandingContentProps) {
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('all');

  const { data: favoritesData, isLoading: favoritesLoading } = useReportFavorites({
    pageSize: 20,
  });
  const { data: scheduledData, isLoading: scheduledLoading } = useScheduledReports({
    isActive: true,
    pageSize: 50,
  });

  const favorites = useMemo(() => favoritesData?.items ?? [], [favoritesData]);
  const allScheduled = useMemo(() => scheduledData?.items ?? [], [scheduledData]);

  const filteredScheduled = useMemo(() => {
    if (scheduleFilter === 'all') return allScheduled;
    if (scheduleFilter === 'failed') return allScheduled.filter(isReportFailed);
    if (scheduleFilter === 'upcoming') return allScheduled.filter(isReportUpcoming);
    return allScheduled;
  }, [allScheduled, scheduleFilter]);

  const failedCount = useMemo(
    () => allScheduled.filter(isReportFailed).length,
    [allScheduled]
  );
  const upcomingCount = useMemo(
    () => allScheduled.filter(isReportUpcoming).length,
    [allScheduled]
  );

  return (
    <div className={cn('space-y-8', className)}>
      {/* Favorites Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-amber-500" aria-hidden />
              Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            {favoritesLoading ? (
              <FavoritesSkeleton />
            ) : favorites.length === 0 ? (
              <EmptyFavorites />
            ) : (
              <ul className="space-y-2">
                {favorites.map((fav) => (
                  <li key={fav.id}>
                    <Link
                      to={getFavoriteHref(fav)}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label={`Open ${getFavoriteLabel(fav)}`}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="flex-1 truncate">{getFavoriteLabel(fav)}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Scheduled Reports Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" aria-hidden />
              Scheduled Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={scheduleFilter === 'failed' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setScheduleFilter('failed')}
                className="min-h-[44px] min-w-[44px] md:min-w-0"
                aria-pressed={scheduleFilter === 'failed'}
              >
                <AlertCircle className="mr-2 h-4 w-4" aria-hidden />
                Failed
                {failedCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {failedCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={scheduleFilter === 'upcoming' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setScheduleFilter('upcoming')}
                className="min-h-[44px] min-w-[44px] md:min-w-0"
                aria-pressed={scheduleFilter === 'upcoming'}
              >
                <Clock className="mr-2 h-4 w-4" aria-hidden />
                Upcoming
                {upcomingCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {upcomingCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={scheduleFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setScheduleFilter('all')}
                className="min-h-[44px] min-w-[44px] md:min-w-0"
                aria-pressed={scheduleFilter === 'all'}
              >
                All
              </Button>
            </div>

            {scheduledLoading ? (
              <ScheduledSkeleton />
            ) : filteredScheduled.length === 0 ? (
              <EmptyScheduled filter={scheduleFilter} />
            ) : (
              <ul className="space-y-2">
                {filteredScheduled.map((report) => (
                  <ScheduledReportRow key={report.id} report={report} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function EmptyFavorites() {
  return (
    <p className="text-sm text-muted-foreground py-4">
      Star your favorite reports from their pages to add them here.
    </p>
  );
}

function ScheduledSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function EmptyScheduled({ filter }: { filter: ScheduleFilter }) {
  const message =
    filter === 'failed'
      ? 'No failed schedules.'
      : filter === 'upcoming'
        ? 'No upcoming runs.'
        : 'No scheduled reports. Schedule a report to have it delivered automatically.';
  return (
    <p className="text-sm text-muted-foreground py-4">
      {message}
    </p>
  );
}

function ScheduledReportRow({ report }: { report: ScheduledReport }) {
  const failed = isReportFailed(report);
  const nextRun = report.nextRunAt
    ? format(new Date(report.nextRunAt), 'MMM d, yyyy h:mm a')
    : null;
  const lastRun = report.lastRunAt
    ? formatDistanceToNow(new Date(report.lastRunAt), { addSuffix: true })
    : null;

  return (
    <li>
      <Link
        to="/settings/scheduled-reports"
        search={{ id: report.id }}
        className="flex flex-col gap-1 rounded-md border p-3 transition-colors hover:bg-muted min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label={`View ${report.name} schedule`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate font-medium">{report.name}</span>
            {failed && (
              <Badge variant="destructive" className="shrink-0">
                Failed
              </Badge>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {nextRun && (
            <span>
              Next: {nextRun}
            </span>
          )}
          {lastRun && (
            <span>Last run {lastRun}</span>
          )}
        </div>
      </Link>
    </li>
  );
}

// ============================================================================
// HEADER ACTIONS (for use by route)
// ============================================================================

export interface ReportsLandingHeaderActionsProps {
  className?: string;
}

/**
 * Header actions for Reports landing: Schedule Report CTA + More dropdown.
 */
export function ReportsLandingHeaderActions({ className }: ReportsLandingHeaderActionsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Link
        to="/settings/scheduled-reports"
        aria-label="Schedule a report"
        className={cn(buttonVariants())}
      >
        <Mail className="mr-2 h-4 w-4" aria-hidden />
        Schedule Report
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label="More report options">
            More
            <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {REPORT_LINKS_FOR_MORE_DROPDOWN.map(({ label, href }) => (
            <DropdownMenuItem key={href}>
              <Link to={href} className="flex w-full items-center">
                {label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem>
            <Link to="/settings/scheduled-reports" className="flex w-full items-center">
              Manage Schedules
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
