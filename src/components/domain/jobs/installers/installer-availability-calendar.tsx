/**
 * Installer Availability Calendar
 *
 * Visual calendar showing installer availability across the team.
 * Color-coded by status: available, busy, blockout.
 * Supports filtering by skill and territory.
 *
 * SPRINT-03: Story 022 - Installer availability calendar
 */

'use client';

import { useState, useMemo } from 'react';
import {
  addDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  format,
  isToday,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  User,
  Clock,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInstallers, useInstallerAvailability } from '@/hooks/jobs';


// ============================================================================
// TYPES
// ============================================================================

interface InstallerAvailabilityCalendarProps {
  onSelectInstaller?: (installerId: string) => void;
  onAddBlockout?: (installerId: string, date: string) => void;
  className?: string;
}

interface CalendarInstaller {
  id: string;
  name: string;
  avatarUrl?: string;
  status: string;
  maxJobsPerDay: number;
}

// ============================================================================
// DAY CELL COMPONENT
// ============================================================================

interface DayCellProps {
  date: Date;
  installer: CalendarInstaller;
  availability?: {
    available: boolean;
    reason?: string;
    existingJobs: number;
  };
  onClick: () => void;
  onAddBlockout: () => void;
}

function DayCell({ date, installer, availability, onClick, onAddBlockout }: DayCellProps) {
  // Date formatting for availability lookup
  const isCurrentDay = isToday(date);

  // Determine status
  let status: 'available' | 'busy' | 'unavailable' | 'blockout' = 'available';
  let tooltipText = 'Available';

  if (!availability) {
    status = 'available';
  } else if (!availability.available) {
    if (availability.reason?.toLowerCase().includes('blockout')) {
      status = 'blockout';
      tooltipText = availability.reason;
    } else {
      status = 'unavailable';
      tooltipText = availability.reason || 'Unavailable';
    }
  } else if (availability.existingJobs >= installer.maxJobsPerDay) {
    status = 'busy';
    tooltipText = `At capacity (${availability.existingJobs}/${installer.maxJobsPerDay})`;
  } else if (availability.existingJobs > 0) {
    status = 'available';
    tooltipText = `${availability.existingJobs}/${installer.maxJobsPerDay} jobs booked`;
  }

  const statusColors = {
    available: 'bg-success/10 hover:bg-success/20 border-success/20',
    busy: 'bg-warning/10 hover:bg-warning/20 border-warning/20',
    unavailable: 'bg-destructive/10 hover:bg-destructive/20 border-destructive/20',
    blockout: 'bg-muted hover:bg-muted/80 border-border',
  };

  const statusDots = {
    available: 'bg-success',
    busy: 'bg-warning',
    unavailable: 'bg-destructive',
    blockout: 'bg-muted-foreground',
  };

  return (
    <div
      className={cn(
        'relative h-16 border rounded-md p-1.5 transition-colors cursor-pointer group',
        statusColors[status],
        isCurrentDay && 'ring-2 ring-primary ring-offset-1'
      )}
      onClick={onClick}
      title={tooltipText}
    >
      {/* Job count indicator */}
      {availability && availability.existingJobs > 0 && (
        <div className="absolute top-1 right-1">
          <span className="text-[10px] font-medium text-muted-foreground">
            {availability.existingJobs}/{installer.maxJobsPerDay}
          </span>
        </div>
      )}

      {/* Status dot */}
      <div className={cn('w-2 h-2 rounded-full', statusDots[status])} />

      {/* Blockout indicator */}
      {status === 'blockout' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-medium text-muted-foreground">OFF</span>
        </div>
      )}

      {/* Add blockout button (hover) */}
      {status !== 'blockout' && (
        <button
          className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onAddBlockout();
          }}
          title="Add blockout"
        >
          <Plus className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// INSTALLER ROW COMPONENT
// ============================================================================

interface InstallerRowProps {
  installer: CalendarInstaller;
  weekDays: Date[];
  onSelectInstaller: (id: string) => void;
  onAddBlockout: (installerId: string, date: string) => void;
}

function InstallerRow({
  installer,
  weekDays,
  onSelectInstaller,
  onAddBlockout,
}: InstallerRowProps) {
  const startDate = format(weekDays[0], 'yyyy-MM-dd');
  const endDate = format(weekDays[6], 'yyyy-MM-dd');

  const { data: availabilityData } = useInstallerAvailability(
    installer.id,
    startDate,
    endDate,
    true
  );

  const availability = availabilityData?.availability || {};

  const initials = installer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
      {/* Installer Info */}
      <div
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
        onClick={() => onSelectInstaller(installer.id)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={installer.avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{installer.name}</p>
          <p className="text-xs text-muted-foreground">
            {installer.maxJobsPerDay} jobs/day
          </p>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <DayCell
            key={day.toISOString()}
            date={day}
            installer={installer}
            availability={availability[format(day, 'yyyy-MM-dd')]}
            onClick={() => onSelectInstaller(installer.id)}
            onAddBlockout={() =>
              onAddBlockout(installer.id, format(day, 'yyyy-MM-dd'))
            }
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CALENDAR COMPONENT
// ============================================================================

export function InstallerAvailabilityCalendar({
  onSelectInstaller,
  onAddBlockout,
  className,
}: InstallerAvailabilityCalendarProps) {
  // State
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  // const [skillFilter, setSkillFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Week days
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Fetch installers
  const { data: installersData, isLoading } = useInstallers({
    page: 1,
    pageSize: 50,
    status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'busy' | 'away'),
  });

  const installers = installersData?.items || [];

  // Navigation
  const goToPreviousWeek = () => setCurrentWeekStart((prev) => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const isCurrentWeek = weekDays.some((day) => isToday(day));

  // Week label
  const weekLabel = format(weekDays[0], 'MMMM yyyy');

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Installer Availability</CardTitle>
              <p className="text-xs text-muted-foreground">
                {weekLabel} • {installersData?.pagination.totalItems || 0} installers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filters */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="away">Away</SelectItem>
              </SelectContent>
            </Select>

            {/* Week Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={isCurrentWeek ? 'default' : 'outline'}
                size="sm"
                className="h-8"
                onClick={goToToday}
              >
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>Busy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span>Blockout</span>
          </div>
        </div>

        {/* Calendar Header */}
        <div className="grid grid-cols-[200px_1fr] gap-4 border-b pb-2">
          <div className="text-sm font-medium text-muted-foreground">Installer</div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'text-center py-1',
                  isToday(day) && 'bg-primary/5 rounded'
                )}
              >
                <div className={cn('text-xs font-medium', isToday(day) && 'text-primary')}>
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    isToday(day) ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Body */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[200px_1fr] gap-4">
                <div className="h-12 animate-pulse bg-muted rounded" />
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <div key={j} className="h-16 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              </div>
            ))
          ) : installers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium">No installers found</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            installers.map((installer) => (
              <InstallerRow
                key={installer.id}
                installer={{
                  id: installer.id,
                  name: installer.user?.name || installer.user?.email || 'Unknown',
                  avatarUrl: undefined,
                  status: installer.status,
                  maxJobsPerDay: installer.maxJobsPerDay,
                }}
                weekDays={weekDays}
                onSelectInstaller={onSelectInstaller || (() => {})}
                onAddBlockout={onAddBlockout || (() => {})}
              />
            ))
          )}
        </div>

        {/* Today Indicator */}
        {isCurrentWeek && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3.5 w-3.5" />
            <span>Current week highlighted</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { InstallerAvailabilityCalendarProps };
