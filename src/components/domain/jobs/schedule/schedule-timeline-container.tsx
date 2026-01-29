/**
 * Schedule Timeline Container
 *
 * @source visits from useSchedule hook
 */
import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { addDays, startOfWeek, format } from 'date-fns';
import { useSchedule } from '@/hooks/jobs';
import { ScheduleDashboard } from './schedule-dashboard';
import type { SiteVisit } from 'drizzle/schema';

interface ScheduleVisitWithProject extends SiteVisit {
  projectTitle: string;
  projectNumber: string;
}

export function ScheduleTimelineContainer() {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('timeline');

  const weekStart = currentWeek;
  const weekEnd = addDays(weekStart, 6);
  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  const { data, isLoading } = useSchedule(dateFrom, dateTo);
  // Type assertion needed because useSchedule returns unknown
  const response = data as { items: ScheduleVisitWithProject[]; pagination?: unknown } | undefined;
  const visits = response?.items ?? [];

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
    />
  );
}
