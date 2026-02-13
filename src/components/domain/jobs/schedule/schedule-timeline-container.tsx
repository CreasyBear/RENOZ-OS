/**
 * Schedule Timeline Container
 *
 * @source visits from useSchedule hook
 * @source projectId from URL search (?projectId= for "View in full schedule" deep link)
 */
import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { addDays, startOfWeek, format } from 'date-fns';
import { useSchedule, useProject } from '@/hooks/jobs';
import type { ScheduleSearch } from '@/lib/schemas/jobs/schedule-search';
import { ScheduleDashboard } from './schedule-dashboard';
import type { SiteVisitItem } from '@/lib/schemas/jobs';

export function ScheduleTimelineContainer() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/_authenticated/schedule/timeline' });
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'week'>('timeline');

  const weekStart = currentWeek;
  const weekEnd = addDays(weekStart, 6);
  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  const projectIdFromUrl = search.projectId ?? undefined;
  const { data, isLoading } = useSchedule(dateFrom, dateTo, { projectId: projectIdFromUrl });
  const visits: SiteVisitItem[] = data?.items ?? [];

  const { data: projectData } = useProject({
    projectId: projectIdFromUrl ?? '',
    enabled: !!projectIdFromUrl,
  });
  const projectFilter = useMemo(() => {
    if (!projectIdFromUrl || !projectData) return undefined;
    const p = projectData as { id: string; title?: string | null; projectNumber?: string | null };
    return {
      id: p.id,
      title: p.title ?? p.projectNumber ?? 'Project',
    };
  }, [projectIdFromUrl, projectData]);

  const handleClearProjectFilter = useCallback(() => {
    navigate({
      to: '/schedule/timeline',
      search: (prev) => {
        const view = ['calendar', 'week', 'timeline'].includes(prev?.view as string) ? prev?.view : undefined;
        return { view, weekStart: prev?.weekStart, projectId: undefined, status: prev?.status, installerId: prev?.installerId, visitType: prev?.visitType } as ScheduleSearch;
      },
      replace: true,
    });
  }, [navigate]);

  const handlePreviousWeek = useCallback(() => {
    setCurrentWeek((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentWeek((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

  const handleToday = useCallback(() => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const handleVisitClick = useCallback(
    (projectId: string, visitId: string) => {
      navigate({
        to: '/projects/$projectId/visits/$visitId',
        params: { projectId, visitId },
      });
    },
    [navigate]
  );

  return (
    <ScheduleDashboard
      weekStart={weekStart}
      weekEnd={weekEnd}
      visits={visits}
      isLoading={isLoading}
      onPreviousWeek={handlePreviousWeek}
      onNextWeek={handleNextWeek}
      onToday={handleToday}
      onVisitClick={handleVisitClick}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      projectFilter={projectFilter}
      onClearProjectFilter={handleClearProjectFilter}
    />
  );
}
