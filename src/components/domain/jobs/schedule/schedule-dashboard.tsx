/**
 * Schedule Dashboard - Enhanced Calendar Management View
 *
 * Provides a serious dispatch/management overview of all site visits with:
 * - Weekly stats cards (visits, completed, pending, installer utilization)
 * - Status breakdown visualization
 * - Visit type filtering
 * - Installer filtering
 * - Enhanced visit cards with project info and installer assignments
 * - "Needs Attention" section for unassigned or problematic visits
 *
 * SPRINT-03: Enhanced schedule view for serious dispatch management
 * @see ui-ux-pro-max skill for design standards
 */

import { useState, useMemo, useCallback } from 'react';
import { format, isPast, isToday, isSameDay, addDays } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  BarChart3,
  X,
  User,
  Timer,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, CalendarWeekView, FilterChipOverflow } from '@/components/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DatePicker } from '@/components/ui/date-picker';

// Types
import type { ScheduleVisit } from '@/lib/schemas/jobs';
import { VISIT_TYPE_CONFIG } from '@/lib/constants/site-visits';

// ============================================================================
// TYPES
// ============================================================================

export type { ScheduleVisit };
export type ScheduleDay = ScheduleVisit[];

interface ScheduleDashboardProps {
  weekStart: Date;
  weekEnd: Date;
  visits: ScheduleVisit[];
  isLoading: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onGoToDate?: (date: Date) => void;
  onVisitClick: (projectId: string, visitId: string) => void;
  viewMode: 'calendar' | 'timeline' | 'week';
  onViewModeChange: (mode: 'calendar' | 'timeline' | 'week') => void;
  installers?: { id: string; name: string }[];
  /** Opens create visit dialog (for empty state CTA) */
  onCreateVisit?: () => void;
  /** Opens create visit dialog with date/time pre-filled (for empty slot click) */
  onEmptySlotClick?: (date: Date, time: string) => void;
  /** When filtering by project (e.g. from project detail "View in full schedule"), show badge with clear option */
  projectFilter?: { id: string; title: string };
  /** Called when user clicks clear on project filter badge */
  onClearProjectFilter?: () => void;
  /** Called when user drags a visit to a new day (reschedule). Args: visitId, projectId, newDate (YYYY-MM-DD), newTime? */
  onRescheduleVisit?: (visitId: string, projectId: string, newDate: string, newTime?: string) => void;
  /** Controlled filter values (from URL). */
  statusFilter?: StatusFilter;
  typeFilter?: TypeFilter;
  installerFilter?: InstallerFilter;
  /** Called when filter dropdowns change (updates URL). */
  onFilterChange?: (filters: { status?: string; visitType?: string; installerId?: string }) => void;
  /** Filter chips for display (from URL params). */
  filterChips?: { key: string; value: string }[];
  /** Called when user removes a filter chip. */
  onFilterRemove?: (key: string, value: string) => void;
  /** Total visit count before filtering (for "Showing X of Y" when URL-driven). */
  allVisitsCount?: number;
}

export type StatusFilter = 'all' | ScheduleVisit['status'];
export type TypeFilter = 'all' | ScheduleVisit['visitType'];
type InstallerFilter = 'all' | string;

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<ScheduleVisit['status'], {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}> = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    icon: Calendar,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: AlertCircle,
  },
  no_show: {
    label: 'No Show',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    icon: AlertTriangle,
  },
  rescheduled: {
    label: 'Rescheduled',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    icon: Calendar,
  },
};

// ============================================================================
// WEEKLY STATS
// ============================================================================

function WeeklyStats({ visits }: {
  visits: ScheduleVisit[];
}) {
  const stats = useMemo(() => {
    const total = visits.length;
    const completed = visits.filter(v => v.status === 'completed').length;
    const inProgress = visits.filter(v => v.status === 'in_progress').length;
    const scheduled = visits.filter(v => v.status === 'scheduled').length;
    const unassigned = visits.filter(v => !v.installerId && v.status === 'scheduled').length;
    const issues = visits.filter(v => ['cancelled', 'no_show'].includes(v.status)).length;

    // Completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Utilization (visits with installers assigned)
    const withInstaller = visits.filter(v => v.installerId).length;
    const utilization = total > 0 ? Math.round((withInstaller / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      scheduled,
      unassigned,
      issues,
      completionRate,
      utilization,
    };
  }, [visits]);

  const statCards = [
    {
      title: 'Total Visits',
      value: stats.total,
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Completed',
      value: stats.completed,
      subtext: `${stats.completionRate}% rate`,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
    },
    {
      title: 'Scheduled',
      value: stats.scheduled,
      subtext: stats.unassigned > 0 ? `${stats.unassigned} unassigned` : undefined,
      alert: stats.unassigned > 0,
      icon: Briefcase,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <Card key={card.title} className={cn(card.alert && 'border-orange-300')}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold mt-1">{card.value}</p>
                {card.subtext && (
                  <p className={cn('text-xs mt-1', card.alert ? 'text-orange-600' : 'text-muted-foreground')}>
                    {card.subtext}
                  </p>
                )}
              </div>
              <div className={cn('p-2 rounded-lg', card.bg)}>
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// NEEDS ATTENTION BANNER
// ============================================================================

function NeedsAttentionBanner({
  visits,
  onVisitClick
}: {
  visits: ScheduleVisit[];
  onVisitClick: (projectId: string, visitId: string) => void;
}) {
  const attentionVisits = useMemo(() => {
    return visits.filter(v => {
      // Unassigned scheduled visits
      if (v.status === 'scheduled' && !v.installerId) return true;
      // No-shows
      if (v.status === 'no_show') return true;
      // Cancelled
      if (v.status === 'cancelled') return true;
      // Overdue scheduled visits
      if (v.status === 'scheduled' && isPast(new Date(v.scheduledDate)) && !isToday(new Date(v.scheduledDate))) {
        return true;
      }
      return false;
    }).slice(0, 5);
  }, [visits]);

  if (attentionVisits.length === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-orange-900">
          Needs Attention ({attentionVisits.length})
        </h3>
      </div>
      <div className="space-y-2">
        {attentionVisits.map(visit => {
          const statusCfg = STATUS_CONFIG[visit.status];
          const issue = !visit.installerId
            ? 'Unassigned'
            : visit.status === 'no_show'
            ? 'No Show'
            : visit.status === 'cancelled'
            ? 'Cancelled'
            : 'Overdue';

          return (
            <button
              key={visit.id}
              onClick={() => onVisitClick(visit.projectId, visit.id)}
              className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100 hover:border-orange-300 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-1 h-8 rounded-full', statusCfg.color.replace('text-', 'bg-'))} />
                <div>
                  <p className="font-medium text-sm">{visit.visitNumber}</p>
                  <p className="text-xs text-muted-foreground">{visit.projectTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={issue}
                  variant={issue === 'Cancelled' ? 'error' : issue === 'No Show' ? 'warning' : 'error'}
                  className="text-[10px] h-5"
                />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(visit.scheduledDate), 'MMM d')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/** Compute end time from start + estimatedDuration (minutes). Default +60 min if no duration. */
function getVisitEndTime(visit: ScheduleVisit): string {
  const start = visit.scheduledTime ?? '09:00';
  const [h, m] = start.split(':').map(Number);
  const dur = visit.estimatedDuration ?? 60;
  const endM = h * 60 + m + dur;
  const eh = Math.floor(endM / 60) % 24;
  const em = endM % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

// ============================================================================
// ENHANCED VISIT CARD
// ============================================================================

function VisitCard({
  visit,
  onClick,
  viewMode,
}: {
  visit: ScheduleVisit;
  onClick: () => void;
  viewMode: 'calendar' | 'timeline';
}) {
  const status = STATUS_CONFIG[visit.status];
  const visitType = VISIT_TYPE_CONFIG[visit.visitType];
  const StatusIcon = status.icon;

  const isUnassigned = !visit.installerId && visit.status === 'scheduled';
  const isOverdue = visit.status === 'scheduled' &&
    isPast(new Date(visit.scheduledDate)) &&
    !isToday(new Date(visit.scheduledDate));

  if (viewMode === 'timeline') {
    return (
      <Card
        onClick={onClick}
        className={cn(
          'group cursor-pointer hover:shadow-md transition-all border-l-4',
          status.bg.replace('100', '50'),
          status.color.replace('text-', 'border-'),
          isUnassigned && 'ring-1 ring-orange-200',
          isOverdue && 'ring-1 ring-red-200'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{visit.visitNumber}</span>
                <Badge variant="outline" className={cn('text-[10px] h-5', visitType.color)}>
                  {visitType.label}
                </Badge>
                {isUnassigned && (
                  <StatusBadge status="Unassigned" variant="error" className="text-[10px] h-5" />
                )}
              </div>
              <p className="text-sm font-semibold truncate mb-1">{visit.projectTitle}</p>
              <p className="text-xs text-muted-foreground">{visit.projectNumber}</p>

              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className={cn('flex items-center gap-1', status.color)}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </span>
                {visit.estimatedDuration && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {visit.estimatedDuration} min
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {visit.scheduledTime ?? 'Time TBD'}
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <Avatar className="h-6 w-6 border">
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    <User className="h-3 w-3 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calendar view - compact
  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer hover:shadow-md transition-all border-l-4',
        status.bg.replace('100', '50'),
        status.color.replace('text-', 'border-'),
        isUnassigned && 'ring-1 ring-orange-200'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <StatusIcon className={cn('h-4 w-4 shrink-0 mt-0.5', status.color)} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{visit.visitNumber}</p>
            <p className="text-xs text-muted-foreground truncate">{visit.projectTitle}</p>

            {visit.scheduledTime && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {visit.scheduledTime}
              </div>
            )}

            {isUnassigned && (
              <StatusBadge status="Unassigned" variant="error" className="text-[10px] h-4 mt-1" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Draggable wrapper for WeekVisitCard when onRescheduleVisit is provided. */
function DraggableVisitCard({
  visit,
  style,
  onClick,
}: {
  visit: ScheduleVisit;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: visit.id,
    data: {
      type: 'visit',
      visitId: visit.id,
      projectId: visit.projectId,
      scheduledTime: visit.scheduledTime ?? '09:00',
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && 'opacity-50')}
    >
      <WeekVisitCard visit={visit} style={style} onClick={onClick} />
    </div>
  );
}

/** Compact visit card for week time-slot view. Uses absolute positioning. */
function WeekVisitCard({
  visit,
  style,
  onClick,
}: {
  visit: ScheduleVisit;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  const status = STATUS_CONFIG[visit.status];
  const visitType = VISIT_TYPE_CONFIG[visit.visitType];
  const StatusIcon = status.icon;
  const isUnassigned = !visit.installerId && visit.status === 'scheduled';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute left-2 right-2 bg-card border border-border rounded-lg px-2.5 py-2 z-10 cursor-pointer hover:bg-muted hover:shadow-sm transition-all duration-200 overflow-hidden text-left min-h-[44px] touch-manipulation',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        status.bg.replace('100', '50'),
        isUnassigned && 'ring-1 ring-orange-200'
      )}
      style={{ ...style, position: 'absolute' }}
      aria-label={`${visit.visitNumber} – ${visit.projectTitle}, ${visitType.label}`}
    >
      <div className="flex items-center gap-1.5">
        <StatusIcon className={cn('size-3.5 shrink-0', status.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground truncate">
            {visit.visitNumber}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {visit.projectTitle}
          </p>
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground uppercase mt-1">
        {visit.scheduledTime ?? 'TBD'} · {visitType.label}
      </p>
    </button>
  );
}

// ============================================================================
// FILTER BAR
// ============================================================================

function FilterBar({
  status,
  onStatusChange,
  visitType,
  onTypeChange,
  installer,
  onInstallerChange,
  installers,
}: {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  visitType: TypeFilter;
  onTypeChange: (type: TypeFilter) => void;
  installer: InstallerFilter;
  onInstallerChange: (installer: InstallerFilter) => void;
  installers?: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="no_show">No Show</SelectItem>
          <SelectItem value="rescheduled">Rescheduled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={visitType} onValueChange={(v) => onTypeChange(v as TypeFilter)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="assessment">Assessment</SelectItem>
          <SelectItem value="installation">Installation</SelectItem>
          <SelectItem value="commissioning">Commissioning</SelectItem>
          <SelectItem value="service">Service</SelectItem>
          <SelectItem value="warranty">Warranty</SelectItem>
          <SelectItem value="inspection">Inspection</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
        </SelectContent>
      </Select>

      {installers && installers.length > 0 && (
        <Select value={installer} onValueChange={(v) => onInstallerChange(v as InstallerFilter)}>
          <SelectTrigger className="w-[160px]">
            <Users className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Installers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Installers</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {installers.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScheduleDashboard({
  weekStart,
  weekEnd,
  visits,
  isLoading,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onGoToDate,
  onVisitClick,
  viewMode,
  onViewModeChange,
  installers,
  onCreateVisit,
  onEmptySlotClick,
  projectFilter,
  onClearProjectFilter,
  onRescheduleVisit,
  statusFilter: statusFilterProp,
  typeFilter: typeFilterProp,
  installerFilter: installerFilterProp,
  onFilterChange,
  filterChips = [],
  onFilterRemove,
  allVisitsCount,
}: ScheduleDashboardProps) {
  const [statusFilterLocal, setStatusFilterLocal] = useState<StatusFilter>('all');
  const [typeFilterLocal, setTypeFilterLocal] = useState<TypeFilter>('all');
  const [installerFilterLocal, setInstallerFilterLocal] = useState<InstallerFilter>('all');

  const statusFilter = statusFilterProp ?? statusFilterLocal;
  const typeFilter = typeFilterProp ?? typeFilterLocal;
  const installerFilter = installerFilterProp ?? installerFilterLocal;

  const setStatusFilter = useCallback(
    (v: StatusFilter) => {
      if (onFilterChange) onFilterChange({ status: v === 'all' ? undefined : v });
      else setStatusFilterLocal(v);
    },
    [onFilterChange]
  );
  const setTypeFilter = useCallback(
    (v: TypeFilter) => {
      if (onFilterChange) onFilterChange({ visitType: v === 'all' ? undefined : v });
      else setTypeFilterLocal(v);
    },
    [onFilterChange]
  );
  const setInstallerFilter = useCallback(
    (v: InstallerFilter) => {
      if (onFilterChange) onFilterChange({ installerId: v === 'all' ? undefined : v });
      else setInstallerFilterLocal(v);
    },
    [onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    if (onFilterChange) onFilterChange({ status: undefined, visitType: undefined, installerId: undefined });
    else {
      setStatusFilterLocal('all');
      setTypeFilterLocal('all');
      setInstallerFilterLocal('all');
    }
  }, [onFilterChange]);

  // Filter visits (when using local state; container passes pre-filtered visits when URL-driven)
  const filteredVisits = useMemo(() => {
    if (statusFilterProp !== undefined || typeFilterProp !== undefined || installerFilterProp !== undefined) {
      return visits;
    }
    return visits.filter((visit) => {
      const statusMatch = statusFilter === 'all' || visit.status === statusFilter;
      const typeMatch = typeFilter === 'all' || visit.visitType === typeFilter;

      let installerMatch = true;
      if (installerFilter === 'unassigned') {
        installerMatch = !visit.installerId;
      } else if (installerFilter !== 'all') {
        installerMatch = visit.installerId === installerFilter;
      }

      return statusMatch && typeMatch && installerMatch;
    });
  }, [visits, statusFilter, typeFilter, installerFilter, statusFilterProp, typeFilterProp, installerFilterProp]);

  // Group by day for calendar view
  const days = useMemo(() => {
    const result: { date: Date; visits: ScheduleVisit[]; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayVisits = filteredVisits.filter(v =>
        isSameDay(new Date(v.scheduledDate), day)
      );
      result.push({
        date: day,
        visits: dayVisits,
        isToday: isToday(day),
      });
    }
    return result;
  }, [filteredVisits, weekStart]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Stats */}
      <WeeklyStats visits={visits} />

      {/* Needs Attention */}
      <NeedsAttentionBanner visits={visits} onVisitClick={onVisitClick} />

      {/* Project filter badge (when opened from project detail) */}
      {projectFilter && onClearProjectFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 py-1.5 pr-1 pl-2.5">
            <span className="text-muted-foreground text-xs">Showing:</span>
            <span className="font-medium">{projectFilter.title}</span>
            <button
              type="button"
              onClick={onClearProjectFilter}
              className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              aria-label="Clear project filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Badge>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday} className="min-h-11 touch-manipulation">
            Today
          </Button>
          <div className="flex items-center bg-muted rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 size-11 touch-manipulation"
              onClick={onPreviousWeek}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium min-w-[200px] text-center">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 size-11 touch-manipulation"
              onClick={onNextWeek}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {onGoToDate && (
            <DatePicker
              date={weekStart}
              onDateChange={(date) => date && onGoToDate(date)}
              placeholder="Go to date"
              className="w-[140px] min-h-11 shrink-0"
            />
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {filterChips.length > 0 && onFilterRemove && (
              <FilterChipOverflow
                chips={filterChips}
                onRemove={onFilterRemove}
                maxVisible={4}
                className="shrink-0"
              />
            )}
            <FilterBar
              status={statusFilter}
              onStatusChange={setStatusFilter}
              visitType={typeFilter}
              onTypeChange={setTypeFilter}
              installer={installerFilter}
              onInstallerChange={setInstallerFilter}
              installers={installers}
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center border rounded-md p-0.5">
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => onViewModeChange('calendar')}
            >
              <LayoutGrid className="h-4 w-4" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => onViewModeChange('week')}
            >
              <Calendar className="h-4 w-4" />
              Week
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => onViewModeChange('timeline')}
            >
              <BarChart3 className="h-4 w-4" />
              Timeline
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredVisits.length} of {allVisitsCount ?? visits.length} visits
        </p>
        {(statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'week' ? (
        <div className="space-y-2">
          {onEmptySlotClick && (
            <p className="text-xs text-muted-foreground">
              Tip: Click any time slot to add a visit
              {onRescheduleVisit && ' • Drag visits to reschedule'}
            </p>
          )}
          <div className="h-[calc(100vh-340px)] min-h-[500px] border rounded-lg overflow-hidden">
          {onRescheduleVisit ? (
              <CalendarWeekView<ScheduleVisit>
                items={filteredVisits}
                weekDays={Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))}
                getItemKey={(v) => v.id}
                getDate={(v) => v.scheduledDate}
                getStartTime={(v) => v.scheduledTime ?? '09:00'}
                getEndTime={getVisitEndTime}
                renderItem={(visit, style) => (
                  <DraggableVisitCard
                    visit={visit}
                    style={style}
                    onClick={() => onVisitClick(visit.projectId, visit.id)}
                  />
                )}
                onPreviousWeek={onPreviousWeek}
                onNextWeek={onNextWeek}
                droppableDays
                emptyMessage={
                  filteredVisits.length === 0 ? (
                    <>
                      <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <h3 className="text-sm font-medium text-foreground">
                        {projectFilter && onClearProjectFilter
                          ? 'No visits for this project in this week'
                          : statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all'
                            ? 'No visits match your filters'
                            : 'No visits scheduled for this week'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {projectFilter && onClearProjectFilter
                          ? 'Clear the project filter to view all visits'
                          : statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all'
                            ? 'Try adjusting your filters to see more visits'
                            : 'Use the date picker or prev/next to navigate to another week'}
                      </p>
                      <div className="flex items-center justify-center gap-3 mt-4">
                        {onCreateVisit && !projectFilter && (
                          <Button onClick={onCreateVisit}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Visit
                          </Button>
                        )}
                        {projectFilter && onClearProjectFilter ? (
                          <Button variant="outline" onClick={onClearProjectFilter}>
                            Clear project filter
                          </Button>
                        ) : statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all' ? (
                          <Button variant="outline" onClick={handleClearFilters}>
                            Clear filters
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : undefined
                }
                onEmptySlotClick={onEmptySlotClick}
              />
          ) : (
            <CalendarWeekView<ScheduleVisit>
              items={filteredVisits}
              weekDays={Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))}
              getItemKey={(v) => v.id}
              getDate={(v) => v.scheduledDate}
              getStartTime={(v) => v.scheduledTime ?? '09:00'}
              getEndTime={getVisitEndTime}
              renderItem={(visit, style) => (
                <WeekVisitCard
                  visit={visit}
                  style={style}
                  onClick={() => onVisitClick(visit.projectId, visit.id)}
                />
              )}
              onPreviousWeek={onPreviousWeek}
              onNextWeek={onNextWeek}
              emptyMessage={
              filteredVisits.length === 0 ? (
                <>
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <h3 className="text-sm font-medium text-foreground">
                    {projectFilter && onClearProjectFilter
                      ? 'No visits for this project in this week'
                      : statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all'
                        ? 'No visits match your filters'
                        : 'No visits scheduled for this week'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {projectFilter && onClearProjectFilter
                      ? 'Clear the project filter to view all visits'
                      : statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all'
                        ? 'Try adjusting your filters to see more visits'
                        : 'Use the date picker or prev/next to navigate to another week'}
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4">
                    {onCreateVisit && !projectFilter && (
                      <Button onClick={onCreateVisit}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Visit
                      </Button>
                    )}
                    {projectFilter && onClearProjectFilter ? (
                      <Button variant="outline" onClick={onClearProjectFilter}>
                        Clear project filter
                      </Button>
                    ) : statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all' ? (
                      <Button variant="outline" onClick={handleClearFilters}>
                        Clear filters
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : undefined
            }
            onEmptySlotClick={onEmptySlotClick}
          />
        )}
          </div>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No visits found</h3>
          <p className="text-muted-foreground">
            {projectFilter && onClearProjectFilter
              ? 'No visits for this project in this week. Clear filter to view all visits?'
              : statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No visits scheduled for this week'}
          </p>
          {projectFilter && onClearProjectFilter && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={onClearProjectFilter}
            >
              Clear project filter
            </Button>
          )}
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="grid grid-cols-7 gap-4">
          {days.map(({ date, visits: dayVisits, isToday: today }) => (
            <div key={date.toISOString()} className="min-h-[400px]">
              <div className="text-center mb-4 pb-2 border-b">
                <p className="text-sm text-muted-foreground">{format(date, 'EEE')}</p>
                <p className={cn('text-lg font-semibold', today && 'text-primary')}>
                  {format(date, 'd')}
                </p>
                <Badge variant="secondary" className="mt-1">
                  {dayVisits.length} visits
                </Badge>
              </div>

              <div className="space-y-2">
                {dayVisits.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    onClick={() => onVisitClick(visit.projectId, visit.id)}
                    viewMode="calendar"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {days.map(({ date, visits: dayVisits, isToday: today }) => (
            <div key={date.toISOString()} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="text-sm text-muted-foreground">{format(date, 'EEEE')}</p>
                  <p className={cn('text-lg font-semibold', today && 'text-primary')}>
                    {format(date, 'MMMM d')}
                  </p>
                </div>
                <Badge variant="secondary">{dayVisits.length} visits</Badge>
              </div>

              {dayVisits.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No visits scheduled.</div>
              ) : (
                <div className="space-y-2">
                  {dayVisits.map(visit => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      onClick={() => onVisitClick(visit.projectId, visit.id)}
                      viewMode="timeline"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScheduleDashboard;
