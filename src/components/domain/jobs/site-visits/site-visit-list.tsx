/**
 * Site Visit List Component
 *
 * @deprecated Use ScheduleDashboard instead. No longer exported from site-visits index.
 *
 * List view for site visits with filtering and grouping.
 *
 * SPRINT-03: New components for project-centric jobs model
 */

import { useNavigate } from '@tanstack/react-router';
import { Calendar, Plus, Clock, MapPin, User, ArrowRight } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SiteVisit, SiteVisitStatus, SiteVisitType } from '@/lib/schemas/jobs';

// ============================================================================
// TYPES
// ============================================================================

interface SiteVisitListProps {
  visits: SiteVisitWithJoins[];
  projectId?: string;
  onScheduleVisit?: () => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusColor(status: SiteVisitStatus) {
  const colors: Record<SiteVisitStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-teal-100 text-teal-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800',
    rescheduled: 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getTypeIcon(type: SiteVisitType) {
  switch (type) {
    case 'assessment':
      return '📋';
    case 'installation':
      return '⚡';
    case 'commissioning':
      return '🔌';
    case 'service':
      return '🔧';
    case 'warranty':
      return '🛡️';
    case 'inspection':
      return '✅';
    case 'maintenance':
      return '🔄';
    default:
      return '📍';
  }
}

function formatStatus(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function groupVisitsByDate(visits: SiteVisit[]) {
  const groups: { label: string; visits: SiteVisit[] }[] = [];
  const now = new Date();

  const today = visits.filter((v) => isToday(new Date(v.scheduledDate)));
  const tomorrow = visits.filter((v) => isTomorrow(new Date(v.scheduledDate)));
  const upcoming = visits.filter(
    (v) =>
      new Date(v.scheduledDate) > now &&
      !isToday(new Date(v.scheduledDate)) &&
      !isTomorrow(new Date(v.scheduledDate))
  );
  const past = visits.filter((v) => isPast(new Date(v.scheduledDate)) && !isToday(new Date(v.scheduledDate)));

  if (today.length > 0) groups.push({ label: 'Today', visits: today });
  if (tomorrow.length > 0) groups.push({ label: 'Tomorrow', visits: tomorrow });
  if (upcoming.length > 0) groups.push({ label: 'Upcoming', visits: upcoming });
  if (past.length > 0) groups.push({ label: 'Past', visits: past });

  return groups;
}

// Extended site visit type with optional joined fields
interface SiteVisitWithJoins extends SiteVisit {
  installerName?: string;
  siteAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

// ============================================================================
// VISIT CARD
// ============================================================================

interface VisitCardProps {
  visit: SiteVisitWithJoins;
  projectId?: string;
  onClick?: () => void;
}

function VisitCard({ visit, onClick }: VisitCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        visit.status === 'in_progress' && 'border-teal-500 ring-1 ring-teal-500'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Date Column */}
          <div className="text-center min-w-[60px]">
            <p className="text-2xl font-semibold">{format(new Date(visit.scheduledDate), 'd')}</p>
            <p className="text-xs text-muted-foreground uppercase">
              {format(new Date(visit.scheduledDate), 'MMM')}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getTypeIcon(visit.visitType)}</span>
              <span className="font-medium truncate">{visit.visitNumber}</span>
              <Badge className={getStatusColor(visit.status)}>{formatStatus(visit.status)}</Badge>
            </div>

            <p className="text-sm text-muted-foreground capitalize">
              {visit.visitType.replace('_', ' ')}
            </p>

            {visit.scheduledTime && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>{visit.scheduledTime}</span>
                {visit.estimatedDuration && (
                  <span className="text-xs">({visit.estimatedDuration} min)</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-2">
              {visit.installerName && (
                <div className="flex items-center gap-1 text-sm">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{visit.installerName}</span>
                </div>
              )}
              {visit.siteAddress && (
                <div className="flex items-center gap-1 text-sm min-w-0">
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground truncate">
                    {visit.siteAddress.city}, {visit.siteAddress.state}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LIST COMPONENT
// ============================================================================

/**
 * List view for site visits with filtering and grouping.
 * @deprecated Use ScheduleDashboard or project detail Visits tab instead. Not used by any route.
 */
export function SiteVisitList({
  visits,
  projectId,
  onScheduleVisit,
  className,
}: SiteVisitListProps) {
  const navigate = useNavigate();

  if (visits.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">No visits scheduled</h3>
        <p className="text-muted-foreground mb-4">Schedule your first site visit.</p>
        {onScheduleVisit && (
          <Button onClick={onScheduleVisit}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Visit
          </Button>
        )}
      </Card>
    );
  }

  const grouped = groupVisitsByDate(visits);

  return (
    <div className={cn('space-y-6', className)}>
      {grouped.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-2">
            {group.label}
          </h3>
          <div className="space-y-3">
            {group.visits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                projectId={projectId}
                onClick={() =>
                  navigate({
                    to: '/projects/$projectId/visits/$visitId',
                    params: {
                      projectId: projectId || visit.projectId,
                      visitId: visit.id,
                    },
                  })
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPACT LIST (for dashboard/overview)
// ============================================================================

interface CompactSiteVisitListProps {
  visits: SiteVisitWithJoins[];
  projectId?: string;
  limit?: number;
  className?: string;
}

/**
 * Compact list of site visits for dashboard/overview.
 * @deprecated Use ScheduleDashboard or project detail Visits tab instead. Not used by any route.
 */
export function CompactSiteVisitList({
  visits,
  projectId,
  limit = 3,
  className,
}: CompactSiteVisitListProps) {
  const navigate = useNavigate();

  const displayVisits = visits.slice(0, limit);

  if (visits.length === 0) {
    return (
      <div className={cn('text-center py-6', className)}>
        <p className="text-sm text-muted-foreground">No upcoming visits</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayVisits.map((visit) => (
        <div
          key={visit.id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
          onClick={() =>
            navigate({
              to: '/projects/$projectId/visits/$visitId',
              params: {
                projectId: projectId || visit.projectId,
                visitId: visit.id,
              },
            })
          }
        >
          <div className="text-center min-w-[40px]">
            <p className="text-lg font-semibold">{format(new Date(visit.scheduledDate), 'd')}</p>
            <p className="text-xs text-muted-foreground uppercase">
              {format(new Date(visit.scheduledDate), 'MMM')}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{visit.visitNumber}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {visit.visitType.replace('_', ' ')}
            </p>
          </div>
          <Badge className={getStatusColor(visit.status)}>{formatStatus(visit.status)}</Badge>
        </div>
      ))}
      {visits.length > limit && (
        <p className="text-xs text-center text-muted-foreground py-2">
          +{visits.length - limit} more
        </p>
      )}
    </div>
  );
}
