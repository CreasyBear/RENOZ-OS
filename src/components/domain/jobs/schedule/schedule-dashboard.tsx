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

import { useState, useMemo } from 'react';
import { format, isPast, isToday, isSameDay, addDays } from 'date-fns';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Types
import type { SiteVisit } from 'drizzle/schema';

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduleVisit extends SiteVisit {
  projectTitle: string;
  projectNumber: string;
}

export type ScheduleDay = ScheduleVisit[];

interface ScheduleDashboardProps {
  weekStart: Date;
  weekEnd: Date;
  visits: ScheduleVisit[];
  isLoading: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onVisitClick: (projectId: string, visitId: string) => void;
  viewMode: 'calendar' | 'timeline';
  onViewModeChange: (mode: 'calendar' | 'timeline') => void;
  installers?: { id: string; name: string }[];
}

type StatusFilter = 'all' | ScheduleVisit['status'];
type TypeFilter = 'all' | ScheduleVisit['visitType'];
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

const VISIT_TYPE_CONFIG: Record<ScheduleVisit['visitType'], {
  label: string;
  color: string;
}> = {
  assessment: { label: 'Assessment', color: 'text-blue-600' },
  installation: { label: 'Installation', color: 'text-teal-600' },
  commissioning: { label: 'Commissioning', color: 'text-purple-600' },
  service: { label: 'Service', color: 'text-orange-600' },
  warranty: { label: 'Warranty', color: 'text-red-600' },
  inspection: { label: 'Inspection', color: 'text-yellow-600' },
  maintenance: { label: 'Maintenance', color: 'text-green-600' },
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
  onVisitClick,
  viewMode,
  onViewModeChange,
  installers,
}: ScheduleDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [installerFilter, setInstallerFilter] = useState<InstallerFilter>('all');

  // Filter visits
  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
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
  }, [visits, statusFilter, typeFilter, installerFilter]);

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

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <div className="flex items-center bg-muted rounded-lg">
            <Button variant="ghost" size="icon" onClick={onPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium min-w-[200px] text-center">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={onNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <FilterBar
            status={statusFilter}
            onStatusChange={setStatusFilter}
            visitType={typeFilter}
            onTypeChange={setTypeFilter}
            installer={installerFilter}
            onInstallerChange={setInstallerFilter}
            installers={installers}
          />

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
          Showing {filteredVisits.length} of {visits.length} visits
        </p>
        {(statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
              setInstallerFilter('all');
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Content */}
      {filteredVisits.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No visits found</h3>
          <p className="text-muted-foreground">
            {statusFilter !== 'all' || typeFilter !== 'all' || installerFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No visits scheduled for this week'}
          </p>
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
