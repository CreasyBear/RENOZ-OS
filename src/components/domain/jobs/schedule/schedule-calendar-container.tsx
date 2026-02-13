/**
 * Schedule Calendar Container
 *
 * Returns content only; route owns PageLayout per STANDARDS.md.
 * Accepts Layout component as prop so domain layer does not import layout.
 *
 * @source visits from useSchedule hook
 * @source pastDueVisits from usePastDueSiteVisits hook (when week view)
 * @source installers from useUsers hook (type: installer)
 * @source URL state from /schedule/calendar?view=week&weekStart=YYYY-MM-DD&projectId=xxx
 */
import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { addDays, startOfWeek, format } from 'date-fns';
import { useSchedule, useRescheduleSiteVisit, usePastDueSiteVisits, useProject } from '@/hooks/jobs';
import { useUsers } from '@/hooks/users';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { paramsToChips } from '@/lib/url/filter-params';
import type { ScheduleSearch } from '@/lib/schemas/jobs/schedule-search';
import type { StatusFilter, TypeFilter } from './schedule-dashboard';
import { ScheduleDashboard } from './schedule-dashboard';
import { ScheduleVisitCreateDialog } from './schedule-visit-create-dialog';
import { VisitPreviewSheet } from './visit-preview-sheet';
import { PastDueSidebar } from './past-due-sidebar';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { SiteVisitItem, ScheduleVisit } from '@/lib/schemas/jobs';
import type {
  PageLayoutProps,
  PageHeaderProps,
  PageContentProps,
  PageLeftSidebarProps,
} from '@/components/layout';

const defaultWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

const CHIP_KEY_TO_PARAM: Record<string, string> = {
  Status: 'status',
  Installer: 'installerId',
  'Visit Type': 'visitType',
  Project: 'projectId',
};

/** Layout component type - route passes PageLayout so domain does not import it */
type LayoutComponent = React.ComponentType<PageLayoutProps> & {
  Header: React.ComponentType<PageHeaderProps>;
  Content: React.ComponentType<PageContentProps>;
  LeftSidebar: React.ComponentType<PageLeftSidebarProps>;
};

export interface ScheduleCalendarContainerProps {
  /** Layout component from route - PageLayout. Domain does not import layout. */
  Layout: LayoutComponent;
}

export function ScheduleCalendarContainer({ Layout }: ScheduleCalendarContainerProps) {
  if (!Layout) {
    throw new Error(
      'ScheduleCalendarContainer requires Layout prop. Pass Layout={PageLayout} from the route.'
    );
  }
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = useSearch({ from: '/_authenticated/schedule/calendar' });

  const weekStartFromUrl = useMemo(() => {
    if (!search.weekStart) return null;
    const d = new Date(search.weekStart);
    return Number.isNaN(d.getTime()) ? null : startOfWeek(d, { weekStartsOn: 1 });
  }, [search.weekStart]);

  const [currentWeek, setCurrentWeek] = useState(
    () => weekStartFromUrl ?? defaultWeekStart
  );

  useEffect(() => {
    if (weekStartFromUrl) {
      startTransition(() => setCurrentWeek(weekStartFromUrl));
    }
  }, [weekStartFromUrl]);

  const viewMode = search.view ?? 'calendar';

  const weekStart = currentWeek;
  const weekEnd = addDays(weekStart, 6);
  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  const projectIdFromSearch = search.projectId ?? undefined;
  const { data, isLoading } = useSchedule(dateFrom, dateTo, { projectId: projectIdFromSearch });
  const visits = useMemo(() => (data?.items ?? []) as SiteVisitItem[], [data?.items]);

  const { data: usersData } = useUsers({
    page: 1,
    pageSize: 100,
    sortOrder: 'asc',
    type: 'installer',
  });
  const installers = useMemo(
    () =>
      usersData?.items?.map((u) => ({ id: u.id, name: u.name ?? 'Unknown' })) ?? [],
    [usersData]
  );

  const updateSearch = useCallback(
    (updates: {
      view?: 'calendar' | 'timeline' | 'week';
      weekStart?: string;
      projectId?: string;
      status?: string;
      installerId?: string;
      visitType?: string;
    }) => {
      navigate({
        to: '/schedule/calendar',
        search: (prev) => {
          const view = updates.view ?? (prev && ['calendar', 'week', 'timeline'].includes(prev.view ?? '') ? prev.view : undefined);
          return { view, weekStart: prev?.weekStart, projectId: prev?.projectId, status: prev?.status, installerId: prev?.installerId, visitType: prev?.visitType, ...updates } as ScheduleSearch;
        },
        replace: true,
      });
    },
    [navigate]
  );

  const projectIdFromUrl = projectIdFromSearch;
  const statusFromUrl = search.status ?? undefined;
  const installerIdFromUrl = search.installerId ?? undefined;
  const visitTypeFromUrl = search.visitType ?? undefined;

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (projectIdFromUrl && v.projectId !== projectIdFromUrl) return false;
      if (statusFromUrl && v.status !== statusFromUrl) return false;
      if (visitTypeFromUrl && v.visitType !== visitTypeFromUrl) return false;
      if (installerIdFromUrl === 'unassigned') {
        if (v.installerId) return false;
      } else if (installerIdFromUrl && v.installerId !== installerIdFromUrl) {
        return false;
      }
      return true;
    });
  }, [visits, projectIdFromUrl, statusFromUrl, installerIdFromUrl, visitTypeFromUrl]);

  const filterChips = useMemo(() => {
    const params = new URLSearchParams();
    if (search.status) params.set('status', search.status);
    if (search.installerId) params.set('installerId', search.installerId);
    if (search.visitType) params.set('visitType', search.visitType);
    if (search.projectId) params.set('projectId', search.projectId);
    const chips = paramsToChips(params);

    return chips.map((c) => {
      if (c.key === 'Installer' && c.value !== 'unassigned') {
        const installer = installers.find((i) => i.id === c.value);
        return { ...c, value: installer?.name ?? c.value };
      }
      if (c.key === 'Status') {
        const labels: Record<string, string> = {
          scheduled: 'Scheduled',
          in_progress: 'In Progress',
          completed: 'Completed',
          cancelled: 'Cancelled',
          no_show: 'No Show',
          rescheduled: 'Rescheduled',
        };
        return { ...c, value: labels[c.value] ?? c.value };
      }
      if (c.key === 'Visit Type') {
        const labels: Record<string, string> = {
          assessment: 'Assessment',
          installation: 'Installation',
          commissioning: 'Commissioning',
          service: 'Service',
          warranty: 'Warranty',
          inspection: 'Inspection',
          maintenance: 'Maintenance',
        };
        return { ...c, value: labels[c.value] ?? c.value };
      }
      if (c.key === 'Project' && search.projectId) {
        const projectVisit = visits.find((v) => v.projectId === search.projectId);
        return { ...c, value: projectVisit?.projectTitle ?? c.value };
      }
      return c;
    });
  }, [search.status, search.installerId, search.visitType, search.projectId, installers, visits]);

  const handleFilterRemove = useCallback(
    (chipKey: string, _value: string) => {
      const paramKey = CHIP_KEY_TO_PARAM[chipKey];
      if (!paramKey) return;
      navigate({
        to: '/schedule/calendar',
        search: (prev) => {
          const next = { ...prev } as Record<string, unknown>;
          delete next[paramKey];
          const view = ['calendar', 'week', 'timeline'].includes(next.view as string) ? next.view : undefined;
          return { view, weekStart: next.weekStart, projectId: next.projectId, status: next.status, installerId: next.installerId, visitType: next.visitType } as ScheduleSearch;
        },
        replace: true,
      });
    },
    [navigate]
  );

  const handleFilterChange = useCallback(
    (filters: { status?: string; visitType?: string; installerId?: string }) => {
      navigate({
        to: '/schedule/calendar',
        search: (prev) => {
          const next = { ...prev } as Record<string, unknown>;
          if (filters.status !== undefined) {
            if (filters.status) next.status = filters.status;
            else delete next.status;
          }
          if (filters.visitType !== undefined) {
            if (filters.visitType) next.visitType = filters.visitType;
            else delete next.visitType;
          }
          if (filters.installerId !== undefined) {
            if (filters.installerId) next.installerId = filters.installerId;
            else delete next.installerId;
          }
          const view = ['calendar', 'week', 'timeline'].includes(next.view as string) ? next.view : undefined;
          return { view, weekStart: next.weekStart, projectId: next.projectId, status: next.status, installerId: next.installerId, visitType: next.visitType } as ScheduleSearch;
        },
        replace: true,
      });
    },
    [navigate]
  );

  // Only validate project when we have no visits - skip extra request when visits exist
  const shouldValidateProject = !!projectIdFromUrl && filteredVisits.length === 0;
  const {
    isError: isProjectError,
    isLoading: isProjectLoading,
  } = useProject({
    projectId: projectIdFromUrl ?? '',
    enabled: shouldValidateProject,
  });
  const isProjectInvalid = shouldValidateProject && !isProjectLoading && isProjectError;

  const projectFilter = useMemo(() => {
    if (!projectIdFromUrl) return undefined;
    const first = filteredVisits[0];
    return {
      id: projectIdFromUrl,
      title: first?.projectTitle ?? 'Project',
    };
  }, [projectIdFromUrl, filteredVisits]);

  const handleClearProjectFilter = useCallback(() => {
    const { projectId: _, ...rest } = search;
    navigate({
      to: '/schedule/calendar',
      search: rest,
      replace: true,
    });
  }, [navigate, search]);

  const handlePreviousWeek = useCallback(() => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
    updateSearch({ weekStart: format(newDate, 'yyyy-MM-dd') });
  }, [weekStart, updateSearch]);

  const handleNextWeek = useCallback(() => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
    updateSearch({ weekStart: format(newDate, 'yyyy-MM-dd') });
  }, [weekStart, updateSearch]);

  const handleToday = useCallback(() => {
    const today = startOfWeek(new Date(), { weekStartsOn: 1 });
    setCurrentWeek(today);
    updateSearch({ weekStart: format(today, 'yyyy-MM-dd') });
  }, [updateSearch]);

  const handleGoToDate = useCallback(
    (date: Date) => {
      const week = startOfWeek(date, { weekStartsOn: 1 });
      setCurrentWeek(week);
      updateSearch({ weekStart: format(week, 'yyyy-MM-dd') });
    },
    [updateSearch]
  );

  const handleViewModeChange = useCallback(
    (mode: 'calendar' | 'timeline' | 'week') => {
      updateSearch({ view: mode });
    },
    [updateSearch]
  );


  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<{ date?: Date; time?: string }>({});
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<ScheduleVisit | null>(null);

  const handleVisitClick = useCallback(
    (projectId: string, visitId: string) => {
      const visit = filteredVisits.find((v) => v.id === visitId);
      if (visit) {
        setSelectedVisit(visit);
        setPreviewSheetOpen(true);
      } else {
        navigate({
          to: '/projects/$projectId/visits/$visitId',
          params: { projectId, visitId },
        });
      }
    },
    [navigate, filteredVisits]
  );

  const handleViewFullDetails = useCallback(
    (projectId: string, visitId: string) => {
      setPreviewSheetOpen(false);
      setSelectedVisit(null);
      navigate({
        to: '/projects/$projectId/visits/$visitId',
        params: { projectId, visitId },
      });
    },
    [navigate]
  );

  const handleCreateVisit = useCallback(() => {
    setCreatePrefill({ date: weekStart });
    setCreateDialogOpen(true);
  }, [weekStart]);

  const handleEmptySlotClick = useCallback((date: Date, time: string) => {
    setCreatePrefill({ date, time });
    setCreateDialogOpen(true);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.schedule(dateFrom, dateTo) });
    queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.all });
  }, [queryClient, dateFrom, dateTo]);

  const rescheduleMutation = useRescheduleSiteVisit();
  const { data: pastDueData } = usePastDueSiteVisits(viewMode === 'week');
  const pastDueVisits = useMemo(
    () => (pastDueData?.items ?? []) as SiteVisitItem[],
    [pastDueData?.items]
  );
  const [activeVisit, setActiveVisit] = useState<ScheduleVisit | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleRescheduleVisit = useCallback(
    async (visitId: string, _projectId: string, newDate: string, newTime?: string) => {
      try {
        await rescheduleMutation.mutateAsync({
          siteVisitId: visitId,
          scheduledDate: newDate,
          scheduledTime: newTime,
        });
        toast.success('Visit rescheduled');
        queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.schedule(dateFrom, dateTo) });
        queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.pastDue() });
      } catch {
        toast.error('Failed to reschedule visit');
      }
    },
    [rescheduleMutation, queryClient, dateFrom, dateTo]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveVisit(null);
      if (!over) return;

      const overId = String(over.id);
      if (!overId.startsWith('day-')) return;

      const newDate = overId.replace('day-', '');
      const activeData = active.data.current as
        | { type: string; visitId: string; projectId: string; scheduledTime?: string }
        | undefined;
      if (!activeData || activeData.type !== 'visit') return;

      handleRescheduleVisit(
        activeData.visitId,
        activeData.projectId,
        newDate,
        activeData.scheduledTime
      );
    },
    [handleRescheduleVisit]
  );

  const handleVisitClickForSidebar = useCallback(
    (projectId: string, visitId: string) => {
      const visit =
        filteredVisits.find((v) => v.id === visitId) ??
        pastDueVisits.find((v) => v.id === visitId);
      if (visit) {
        setSelectedVisit(visit);
        setPreviewSheetOpen(true);
      } else {
        navigate({
          to: '/projects/$projectId/visits/$visitId',
          params: { projectId, visitId },
        });
      }
    },
    [navigate, filteredVisits, pastDueVisits]
  );

  const dashboardInner = (
    <ScheduleDashboard
      weekStart={weekStart}
      weekEnd={weekEnd}
      visits={filteredVisits}
      isLoading={isLoading}
      onPreviousWeek={handlePreviousWeek}
      onNextWeek={handleNextWeek}
      onToday={handleToday}
      onGoToDate={handleGoToDate}
      onVisitClick={handleVisitClick}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      onCreateVisit={handleCreateVisit}
      onEmptySlotClick={handleEmptySlotClick}
      installers={installers}
      projectFilter={projectFilter}
      onClearProjectFilter={handleClearProjectFilter}
      onRescheduleVisit={viewMode === 'week' ? handleRescheduleVisit : undefined}
      allVisitsCount={visits.length}
      statusFilter={(statusFromUrl ?? 'all') as StatusFilter}
      typeFilter={(visitTypeFromUrl ?? 'all') as TypeFilter}
      installerFilter={installerIdFromUrl ?? 'all'}
      onFilterChange={handleFilterChange}
      filterChips={filterChips}
      onFilterRemove={handleFilterRemove}
    />
  );

  const layoutVariant = viewMode === 'week' ? 'with-left-sidebar' : 'full-width';

  const weekViewContent = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => {
        const visit =
          filteredVisits.find((v) => v.id === active.id) ??
          pastDueVisits.find((v) => v.id === active.id);
        if (visit) setActiveVisit(visit);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 min-w-0">{dashboardInner}</div>
      <DragOverlay>
        {activeVisit ? (
          <div className="bg-card border rounded-lg p-3 shadow-lg max-w-48">
            <p className="font-medium text-sm truncate">{activeVisit.visitNumber}</p>
            <p className="text-xs text-muted-foreground truncate">{activeVisit.projectTitle}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  const content =
    viewMode === 'week' ? weekViewContent : dashboardInner;

  return (
    <Layout variant={layoutVariant}>
      {viewMode === 'week' && (
        <Layout.LeftSidebar>
          <PastDueSidebar onVisitClick={handleVisitClickForSidebar} />
        </Layout.LeftSidebar>
      )}

      <Layout.Header
        title="Schedule"
        description="View and manage site visits across projects"
      />

      <Layout.Content>
        {isProjectInvalid && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Project not found</AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              The project may have been deleted or the link is invalid.
              <Button
                variant="link"
                className="p-0 h-auto underline"
                onClick={handleClearProjectFilter}
              >
                Clear filter
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {content}
      </Layout.Content>

      <ScheduleVisitCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectIdFromUrl}
        prefillDate={createPrefill.date}
        prefillTime={createPrefill.time}
        onSuccess={handleCreateSuccess}
      />

      <VisitPreviewSheet
        visit={selectedVisit}
        open={previewSheetOpen}
        onOpenChange={setPreviewSheetOpen}
        onViewFullDetails={handleViewFullDetails}
      />
    </Layout>
  );
}
