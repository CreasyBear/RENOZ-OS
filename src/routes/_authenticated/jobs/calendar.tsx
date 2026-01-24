/**
 * Jobs Calendar Route
 *
 * Calendar visualization for job scheduling with month/week/day views.
 * Includes technician filters, unscheduled jobs sidebar, and drag-drop reschedule.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-005a/b
 */

import * as React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { JobCalendarView } from '@/components/domain/jobs/calendar';
import { JobsTimelineView } from '@/components/domain/jobs/timeline';
import { UnifiedJobsProvider, useUnifiedJobs } from '@/components/domain/jobs/jobs-unified-context';
import { JobsErrorBoundary } from '@/components/domain/jobs/jobs-error-boundary';
import { CalendarSkeleton } from '@/components/domain/jobs/calendar-skeleton';
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import withDragAndDrop, {
  type EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { enAU } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Filter,
  Clock,
  GripVertical,
  PanelRightOpen,
  PanelRightClose,
  Kanban,
  Grid3X3,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useCalendarJobs,
  useCalendarInstallers,
  useJobCalendarKanban,
  useUnscheduledJobs,
  useRescheduleJob,
  useExportCalendarData,
  useCalendarOAuthStatus,
  useRealtimeJobUpdates,
  useJobsTimeline,
} from '@/hooks';
import { useCurrentOrg } from '@/hooks/auth';
import type { CalendarJobEvent, UnscheduledJob } from '@/lib/schemas';
import {
  toCalendarEventFromJobViewModel,
  toCalendarTaskFromJobViewModel,
  toJobViewModelFromCalendarEvent,
  toJobViewModelFromCalendarTask,
} from '@/lib/jobs/job-view-model-mappers';
import { cn } from '@/lib/utils';

// Import react-big-calendar styles
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/jobs/calendar')({
  component: () => (
    <UnifiedJobsProvider initialView="weekly">
      <JobsCalendarPage />
    </UnifiedJobsProvider>
  ),
});

// ============================================================================
// LOCALIZER & DND CALENDAR
// ============================================================================

const locales = {
  'en-AU': enAU,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop<CalendarJobEvent>(BigCalendar);
type JobStatus = CalendarJobEvent['status'];

// ============================================================================
// STATUS COLORS
// ============================================================================

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-700 dark:text-slate-300',
  },
  in_progress: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-700 dark:text-blue-300',
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900',
    border: 'border-green-400 dark:border-green-600',
    text: 'text-green-700 dark:text-green-300',
  },
  cancelled: {
    bg: 'bg-red-100 dark:bg-red-900',
    border: 'border-red-400 dark:border-red-600',
    text: 'text-red-700 dark:text-red-300',
  },
  on_hold: {
    bg: 'bg-amber-100 dark:bg-amber-900',
    border: 'border-amber-400 dark:border-amber-600',
    text: 'text-amber-700 dark:text-amber-300',
  },
};

// ============================================================================
// CUSTOM EVENT COMPONENT
// ============================================================================

interface EventProps {
  event: CalendarJobEvent;
}

function EventComponent({ event }: EventProps) {
  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.scheduled;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'block cursor-move truncate rounded border-l-2 px-2 py-1 text-xs',
              colors.bg,
              colors.border,
              colors.text,
              'transition-opacity hover:opacity-80'
            )}
          >
            <span className="font-medium">{event.title}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{event.title}</p>
            <p className="text-muted-foreground text-xs">
              {event.jobNumber} • {event.customer.name}
            </p>
            <p className="text-xs">
              {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
            </p>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {event.status.replace('_', ' ')}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {event.installer.name || event.installer.email}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// CUSTOM TOOLBAR
// ============================================================================

interface ToolbarProps {
  date: Date;
  view: View;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onView: (view: View) => void;
}

function CustomToolbar({ date, view, onNavigate, onView }: ToolbarProps) {
  return (
    <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate('PREV')}
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => onNavigate('NEXT')} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => onNavigate('TODAY')}>
          Today
        </Button>
        <h2 className="ml-2 text-lg font-semibold">
          {format(
            date,
            view === 'month'
              ? 'MMMM yyyy'
              : view === 'week'
                ? "'Week of' MMM d, yyyy"
                : 'EEEE, MMMM d, yyyy'
          )}
        </h2>
      </div>

      <div className="flex items-center gap-1 rounded-lg border p-1">
        <Button
          variant={view === 'month' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onView('month')}
        >
          Month
        </Button>
        <Button
          variant={view === 'week' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onView('week')}
        >
          Week
        </Button>
        <Button
          variant={view === 'day' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onView('day')}
        >
          Day
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// TECHNICIAN FILTER
// ============================================================================

interface TechnicianFilterProps {
  installers: { id: string; name: string | null; email: string }[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function TechnicianFilter({ installers, selectedIds, onSelectionChange }: TechnicianFilterProps) {
  const toggleInstaller = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const allSelected = selectedIds.length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="mr-2 h-4 w-4" />
          Technicians
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedIds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filter by technician</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="h-8 text-xs"
            >
              Show all
            </Button>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {installers.map((installer) => (
                <div
                  key={installer.id}
                  className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded p-2"
                  onClick={() => toggleInstaller(installer.id)}
                >
                  <Checkbox
                    checked={allSelected || selectedIds.includes(installer.id)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm">{installer.name || installer.email}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// UNSCHEDULED JOB CARD
// ============================================================================

interface UnscheduledJobCardProps {
  job: UnscheduledJob;
  onSchedule: (jobId: string, date: string) => void;
}

function UnscheduledJobCard({ job }: UnscheduledJobCardProps) {
  return (
    <div
      className="bg-card hover:border-primary cursor-grab rounded-lg border p-3 transition-colors"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('unscheduledJobId', job.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{job.title}</p>
          <p className="text-muted-foreground truncate text-xs">{job.customer.name}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {job.jobType.replace('_', ' ')}
            </Badge>
            {job.estimatedDuration && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {Math.floor(job.estimatedDuration / 60)}h
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UNSCHEDULED SIDEBAR
// ============================================================================

interface UnscheduledSidebarProps {
  jobs: UnscheduledJob[];
  isLoading: boolean;
  onSchedule: (jobId: string, date: string) => void;
}

function UnscheduledSidebar({ jobs, isLoading, onSchedule }: UnscheduledSidebarProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        <CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">No unscheduled jobs</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-350px)]">
      <div className="space-y-3 pr-4">
        {jobs.map((job) => (
          <UnscheduledJobCard key={job.id} job={job} onSchedule={onSchedule} />
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function JobsCalendarPage() {
  const navigate = useNavigate();
  const { state, actions } = useUnifiedJobs();
  const [currentView, setCurrentView] = React.useState<View>('month');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [timelineZoomLevel, setTimelineZoomLevel] = React.useState<'day' | 'week' | 'month'>(
    'week'
  );
  useRealtimeJobUpdates();

  // Calculate date range for traditional calendar
  const dateRange = React.useMemo(() => {
    if (currentView === 'month') {
      const start = startOfMonth(subMonths(state.currentWeekStart, 1));
      const end = endOfMonth(addMonths(state.currentWeekStart, 1));
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    const start = subMonths(state.currentWeekStart, 1);
    const end = addMonths(state.currentWeekStart, 1);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [state.currentWeekStart, currentView]);

  // Fetch data
  const statusFilters =
    state.filters.statuses.length > 0 ? (state.filters.statuses as JobStatus[]) : undefined;
  const {
    data: calendarData,
    isLoading,
    isError,
    error,
    refetch,
  } = useCalendarJobs({
    ...dateRange,
    installerIds: state.filters.installerIds.length > 0 ? state.filters.installerIds : undefined,
    statuses: statusFilters,
  });

  const { data: installersData } = useCalendarInstallers();
  const { data: unscheduledData, isLoading: unscheduledLoading } = useUnscheduledJobs({
    limit: 50,
    offset: 0,
  });

  const rescheduleJob = useRescheduleJob();
  const exportCalendar = useExportCalendarData();

  const weeklyStartDate = format(state.currentWeekStart, 'yyyy-MM-dd');
  const weeklyEndDate = format(
    new Date(state.currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd'
  );

  const {
    tasks: weeklyTasks,
    isLoading: weeklyLoading,
    error: weeklyError,
  } = useJobCalendarKanban({
    startDate: weeklyStartDate,
    endDate: weeklyEndDate,
    installerIds: state.filters.installerIds.length > 0 ? state.filters.installerIds : undefined,
  });

  const {
    timelineItems,
    totalItems,
    stats: timelineStats,
    isLoading: timelineLoading,
    error: timelineError,
  } = useJobsTimeline({
    startDate: weeklyStartDate,
    endDate: weeklyEndDate,
    installerIds: state.filters.installerIds.length > 0 ? state.filters.installerIds : undefined,
    statuses: statusFilters,
  });

  const { currentOrg } = useCurrentOrg();
  const {
    isConfigured: isOAuthConfigured,
    provider: oauthProvider,
    isLoading: oauthLoading,
  } = useCalendarOAuthStatus(currentOrg?.id ?? '');

  const events = React.useMemo(() => calendarData?.events ?? [], [calendarData]);
  const installers = installersData?.installers ?? [];
  const unscheduledJobs = unscheduledData?.jobs ?? [];

  const calendarViewModels = React.useMemo(
    () => events.map(toJobViewModelFromCalendarEvent),
    [events]
  );
  const normalizedEvents = React.useMemo(
    () => calendarViewModels.map(toCalendarEventFromJobViewModel),
    [calendarViewModels]
  );

  const weeklyTaskViewModels = React.useMemo(
    () => weeklyTasks.map(toJobViewModelFromCalendarTask),
    [weeklyTasks]
  );
  const normalizedWeeklyTasks = React.useMemo(
    () => weeklyTaskViewModels.map(toCalendarTaskFromJobViewModel),
    [weeklyTaskViewModels]
  );

  // Navigation handlers
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    if (action === 'TODAY') {
      actions.setWeekStart(new Date());
    } else if (action === 'PREV') {
      if (currentView === 'month') {
        actions.setWeekStart(subMonths(state.currentWeekStart, 1));
      } else if (currentView === 'week') {
        actions.setWeekStart(new Date(state.currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000));
      } else {
        actions.setWeekStart(new Date(state.currentWeekStart.getTime() - 24 * 60 * 60 * 1000));
      }
    } else {
      if (currentView === 'month') {
        actions.setWeekStart(addMonths(state.currentWeekStart, 1));
      } else if (currentView === 'week') {
        actions.setWeekStart(new Date(state.currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000));
      } else {
        actions.setWeekStart(new Date(state.currentWeekStart.getTime() + 24 * 60 * 60 * 1000));
      }
    }
  };

  // Drag-drop handler
  const handleEventDrop = async (args: EventInteractionArgs<CalendarJobEvent>) => {
    const { event, start } = args;
    const newDate = format(start as Date, 'yyyy-MM-dd');
    const newTime = format(start as Date, 'HH:mm');

    try {
      await rescheduleJob.mutateAsync({
        jobId: event.id,
        newDate,
        newTime: event.allDay ? null : newTime,
      });
    } catch (err) {
      console.error('Failed to reschedule job:', err);
    }
  };

  // Handle drop from unscheduled sidebar
  const handleScheduleFromSidebar = (jobId: string, date: string) => {
    rescheduleJob.mutate({
      jobId,
      newDate: date,
      newTime: '09:00',
    });
  };

  const handleWeeklyReschedule = async (jobId: string, newDate: string, newTime: string) => {
    try {
      await rescheduleJob.mutateAsync({
        jobId,
        newDate,
        newTime,
      });
    } catch (err) {
      console.error('Failed to reschedule job:', err);
    }
  };

  const handleWeeklyExport = (formatType: 'ics' | 'csv' | 'json') => {
    exportCalendar.mutate({
      format: formatType,
      startDate: weeklyStartDate,
      endDate: weeklyEndDate,
      installerIds: state.filters.installerIds.length > 0 ? state.filters.installerIds : undefined,
      statuses: statusFilters,
      includeCustomerInfo: true,
      includePrivateNotes: false,
    });
  };

  const handleTimelineExport = (formatType: 'ics' | 'csv' | 'json') => {
    let exportEndDate: Date;
    if (timelineZoomLevel === 'day') {
      exportEndDate = new Date(state.currentWeekStart);
      exportEndDate.setDate(state.currentWeekStart.getDate() + 1);
    } else if (timelineZoomLevel === 'month') {
      exportEndDate = new Date(state.currentWeekStart);
      exportEndDate.setMonth(state.currentWeekStart.getMonth() + 1);
    } else {
      exportEndDate = new Date(state.currentWeekStart);
      exportEndDate.setDate(state.currentWeekStart.getDate() + 6);
    }

    exportCalendar.mutate({
      format: formatType,
      startDate: format(state.currentWeekStart, 'yyyy-MM-dd'),
      endDate: format(exportEndDate, 'yyyy-MM-dd'),
      installerIds: state.filters.installerIds.length > 0 ? state.filters.installerIds : undefined,
      statuses: statusFilters,
      includeCustomerInfo: true,
      includePrivateNotes: false,
    });
  };

  const handleManageIntegrations = () => {
    navigate({ to: '/integrations/oauth' });
  };

  const handleCreateTemplate = () => {
    console.log('Create template - to be implemented');
  };

  // Handle calendar slot selection (for scheduling from sidebar)
  const handleSelectSlot = ({ start }: { start: Date }) => {
    actions.setWeekStart(start);
    if (currentView === 'month') {
      setCurrentView('day');
    }
  };

  const handleSelectEvent = (event: CalendarJobEvent) => {
    navigate({
      to: '/jobs/assignments/$assignmentId' as unknown as never,
      params: { assignmentId: event.id } as never,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="mb-6 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Job Calendar</h1>
        </div>
        <CalendarSkeleton />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container py-6">
        <div className="mb-6 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Job Calendar</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading calendar</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error?.message || 'Failed to load calendar data'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <JobsErrorBoundary
      component="Job Calendar"
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <div className="container py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Job Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={state.activeView === 'traditional' ? 'default' : 'outline'}
              size="sm"
              onClick={() => actions.setActiveView('traditional')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Month View
            </Button>
            <Button
              variant={state.activeView === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => actions.setActiveView('weekly')}
            >
              <Grid3X3 className="mr-2 h-4 w-4" />
              Week View
            </Button>
            <Button
              variant={state.activeView === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => actions.setActiveView('timeline')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Timeline
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/jobs/kanban' })}>
              <Kanban className="mr-2 h-4 w-4" />
              Kanban View
            </Button>
            <TechnicianFilter
              installers={installers}
              selectedIds={state.filters.installerIds}
              onSelectionChange={(ids) => actions.updateFilters({ installerIds: ids })}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex"
            >
              {sidebarOpen ? (
                <PanelRightClose className="mr-2 h-4 w-4" />
              ) : (
                <PanelRightOpen className="mr-2 h-4 w-4" />
              )}
              Unscheduled
              {unscheduledJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unscheduledJobs.length}
                </Badge>
              )}
            </Button>
            {/* Mobile unscheduled sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  Unscheduled
                  {unscheduledJobs.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {unscheduledJobs.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Unscheduled Jobs</SheetTitle>
                  <SheetDescription>Drag jobs to the calendar to schedule them.</SheetDescription>
                </SheetHeader>
                <div className="mt-4">
                  <UnscheduledSidebar
                    jobs={unscheduledJobs}
                    isLoading={unscheduledLoading}
                    onSchedule={handleScheduleFromSidebar}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Weekly Calendar View */}
        {state.activeView === 'weekly' && (
          <div className="h-[calc(100vh-200px)]">
            <JobCalendarView
              currentWeekStart={state.currentWeekStart}
              onWeekChange={actions.setWeekStart}
              installerIds={state.filters.installerIds}
              onInstallerFilterChange={(ids) => actions.updateFilters({ installerIds: ids })}
              filters={{
                installerIds: state.filters.installerIds,
                statuses: state.filters.statuses,
              }}
              installers={installers}
              onFiltersChange={(nextFilters) => actions.updateFilters(nextFilters)}
              onExport={handleWeeklyExport}
              isOAuthConfigured={isOAuthConfigured}
              oauthProvider={oauthProvider}
              oauthLoading={oauthLoading}
              onManageIntegrations={handleManageIntegrations}
              onCreateTemplate={handleCreateTemplate}
              tasks={normalizedWeeklyTasks}
              isLoading={weeklyLoading}
              error={weeklyError}
              onReschedule={handleWeeklyReschedule}
            />
          </div>
        )}

        {/* Traditional Calendar View */}
        {state.activeView === 'traditional' && (
          <>
            {/* Main content with optional sidebar */}
            <div className="flex gap-6">
              {/* Calendar */}
              <div
                className={cn(
                  'bg-card flex-1 rounded-lg border p-4 transition-all',
                  sidebarOpen ? 'lg:mr-0' : ''
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const jobId = e.dataTransfer.getData('unscheduledJobId');
                  if (jobId) {
                    // Get the date from the drop target if possible
                    const newDate = format(state.currentWeekStart, 'yyyy-MM-dd');
                    handleScheduleFromSidebar(jobId, newDate);
                  }
                }}
              >
                <DnDCalendar
                  localizer={localizer}
                  events={normalizedEvents}
                  startAccessor="start"
                  endAccessor="end"
                  date={state.currentWeekStart}
                  view={currentView}
                  onNavigate={(date) => actions.setWeekStart(date)}
                  onView={(view) => setCurrentView(view)}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent}
                  onEventDrop={handleEventDrop}
                  draggableAccessor={() => true}
                  resizable={false}
                  selectable
                  style={{ height: 'calc(100vh - 300px)', minHeight: 500 }}
                  components={{
                    toolbar: (props) => (
                      <CustomToolbar
                        date={props.date}
                        view={props.view as View}
                        onNavigate={handleNavigate}
                        onView={(view) => setCurrentView(view)}
                      />
                    ),
                    event: EventComponent,
                  }}
                  eventPropGetter={(event) => {
                    const colors = STATUS_COLORS[event.status] || STATUS_COLORS.scheduled;
                    return {
                      className: cn(colors.bg, colors.text, 'rounded border-0'),
                    };
                  }}
                  dayPropGetter={(date) => {
                    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    return {
                      className: isToday ? 'bg-primary/5' : '',
                    };
                  }}
                  formats={{
                    timeGutterFormat: 'h a',
                    eventTimeRangeFormat: ({ start, end }) =>
                      `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
                  }}
                  messages={{
                    noEventsInRange: 'No jobs scheduled in this range.',
                  }}
                />
              </div>

              {/* Desktop sidebar */}
              {sidebarOpen && (
                <div className="hidden w-72 shrink-0 lg:block">
                  <div className="bg-card sticky top-6 rounded-lg border p-4">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <Clock className="h-4 w-4" />
                      Unscheduled Jobs
                    </h3>
                    <UnscheduledSidebar
                      jobs={unscheduledJobs}
                      isLoading={unscheduledLoading}
                      onSchedule={handleScheduleFromSidebar}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-muted-foreground">Status:</span>
              {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={cn('h-3 w-3 rounded', colors.bg, 'border', colors.border)} />
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>

            {/* Reschedule toast notification */}
            {rescheduleJob.isPending && (
              <div className="bg-primary text-primary-foreground fixed right-4 bottom-4 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Rescheduling...
              </div>
            )}
          </>
        )}

        {/* Timeline View */}
        {state.activeView === 'timeline' && (
          <div className="h-[calc(100vh-200px)]">
            <JobsTimelineView
              currentWeekStart={state.currentWeekStart}
              onWeekChange={actions.setWeekStart}
              installerIds={state.filters.installerIds}
              onInstallerFilterChange={(ids) => actions.updateFilters({ installerIds: ids })}
              filters={{
                installerIds: state.filters.installerIds,
                statuses: state.filters.statuses,
              }}
              installers={installers}
              onFiltersChange={(nextFilters) => actions.updateFilters(nextFilters)}
              onExport={handleTimelineExport}
              zoomLevel={timelineZoomLevel}
              onZoomChange={setTimelineZoomLevel}
              timelineItems={timelineItems}
              totalItems={totalItems}
              stats={timelineStats}
              isLoading={timelineLoading}
              error={timelineError}
            />
          </div>
        )}
      </div>
    </JobsErrorBoundary>
  );
}
