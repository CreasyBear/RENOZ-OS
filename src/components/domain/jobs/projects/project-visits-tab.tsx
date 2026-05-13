import { Calendar, Plus, ArrowRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { getProjectSiteVisitsReadErrorMessage } from './project-read-error-messages';

import type {
  ProjectTabData,
  ProjectTabVisit,
} from '@/lib/schemas/jobs/project-detail';

interface ProjectVisitsTabProps {
  project: ProjectTabData;
  visits?: ProjectTabVisit[];
  onScheduleVisit?: () => void;
  error?: Error | null;
  hasData?: boolean;
  onRetry?: () => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'scheduled':
      return 'bg-gray-100 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function ProjectVisitsTab({
  project,
  visits = [],
  onScheduleVisit,
  error,
  hasData = true,
  onRetry,
}: ProjectVisitsTabProps) {
  const navigate = useNavigate();
  const safeVisits = Array.isArray(visits) ? visits : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Site Visits</h3>
        <Button onClick={onScheduleVisit}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Visit
        </Button>
      </div>

      {error ? (
        <Alert variant={!hasData ? 'destructive' : 'default'}>
          <AlertTitle>{!hasData ? 'Site visits unavailable' : 'Showing cached site visits'}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{getProjectSiteVisitsReadErrorMessage(error)}</span>
            {onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {!hasData && error ? null : safeVisits.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No visits scheduled</h3>
          <p className="text-muted-foreground">Schedule site visits for this project.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {safeVisits.map((visit) => (
            <Card
              key={visit.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate({
                to: '/projects/$projectId/visits/$visitId',
                params: { projectId: project.id, visitId: visit.id },
              })}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-semibold">
                        {format(new Date(visit.scheduledDate), 'd')}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(new Date(visit.scheduledDate), 'MMM')}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{visit.visitNumber}</span>
                        <Badge className={getStatusColor(visit.status)}>{visit.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {visit.visitType}
                      </p>
                      {visit.scheduledTime && (
                        <p className="text-sm text-muted-foreground">
                          {visit.scheduledTime}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(visit.installerName || visit.installerId) && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Assigned to</p>
                        {visit.installerId ? (
                          <Link
                            to="/installers/$installerId"
                            params={{ installerId: visit.installerId }}
                            className="text-sm font-medium hover:underline"
                            preload="intent"
                          >
                            {visit.installerName || 'Installer'}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium">{visit.installerName}</p>
                        )}
                      </div>
                    )}
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-4 border-t flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        <Link
          to="/schedule/calendar"
          search={{ projectId: project.id }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline transition-colors"
        >
          View in calendar
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/schedule/timeline"
          search={{ projectId: project.id }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline transition-colors"
        >
          View in timeline
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
