/**
 * Installer Workload Tab (Container)
 *
 * Fetches workload data and upcoming site visits:
 * - Active projects count
 * - Upcoming/this week visit counts
 * - Next 5 scheduled visits with status
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared';
import { useInstallerWorkload, useSiteVisitsByInstaller, type SiteVisitItem } from '@/hooks/jobs';

export function WorkloadTab({ installerId }: { installerId: string }) {
  const { data: workload, isLoading: isLoadingWorkload } = useInstallerWorkload(installerId);
  const { data: siteVisitsData, isLoading: isLoadingVisits } = useSiteVisitsByInstaller(installerId);

  const siteVisits: SiteVisitItem[] = siteVisitsData?.items ?? [];
  const upcomingVisits = siteVisits
    .filter((v) => v.status === 'scheduled' || v.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Workload</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingWorkload ? (
            <div className="h-20 animate-pulse bg-muted rounded" />
          ) : workload ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{workload.activeProjects}</p>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{workload.upcomingVisits}</p>
                <p className="text-sm text-muted-foreground">Upcoming Visits</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{workload.thisWeekVisits}</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load workload data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingVisits ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : upcomingVisits.length > 0 ? (
            <div className="space-y-3">
              {upcomingVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{visit.project?.name ?? 'Unknown Project'}</p>
                    <p className="text-sm text-muted-foreground">
                      {visit.visitType} • {visit.scheduledDate}
                    </p>
                  </div>
                  <StatusBadge
                    status={visit.status}
                    variant={visit.status === 'in_progress' ? 'progress' : visit.status === 'scheduled' ? 'info' : 'neutral'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming visits scheduled</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
