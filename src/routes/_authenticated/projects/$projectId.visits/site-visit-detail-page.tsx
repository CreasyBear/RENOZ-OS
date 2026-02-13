/**
 * Site Visit Detail Page
 *
 * Site visit execution view for installers.
 * Data fetching and handlers live here; route file stays thin.
 *
 * @source visit from useSiteVisit hook
 * @source projectTasks from useProjectTasks hook
 * @see src/routes/_authenticated/projects/$projectId.visits/$visitId.tsx
 * @see STANDARDS.md §8 Route Code Splitting
 */

import { useParams, useNavigate } from '@tanstack/react-router';
import { useCallback, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Play,
  Square,
  PenLine,
} from 'lucide-react';
import {
  useSiteVisit,
  useCheckIn,
  useCheckOut,
  useProjectTasks,
} from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';
import { CustomerSignOffDialog } from '@/components/domain/jobs/projects/customer-sign-off-dialog';
import { toast } from '@/lib/toast';
import { TaskList } from '@/components/domain/jobs/projects/task-list';

const VISIT_STATUS_CONFIG: Record<
  string,
  { variant: 'success' | 'progress' | 'error' | 'neutral' | 'info' | 'warning'; label?: string }
> = {
  completed: { variant: 'success', label: 'Completed' },
  in_progress: { variant: 'progress', label: 'In Progress' },
  scheduled: { variant: 'info', label: 'Scheduled' },
  cancelled: { variant: 'error', label: 'Cancelled' },
  no_show: { variant: 'warning', label: 'No Show' },
  rescheduled: { variant: 'info', label: 'Rescheduled' },
};

export default function SiteVisitDetailPage() {
  const { projectId, visitId } = useParams({
    from: '/_authenticated/projects/$projectId/visits/$visitId',
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: visit, isLoading, error } = useSiteVisit({ siteVisitId: visitId });

  const { data: projectTasks = [], isLoading: isLoadingTasks } = useProjectTasks({
    projectId,
    enabled: !!projectId,
  });

  const { getUser } = useUserLookup();

  const siteVisitTasks = useMemo(() => {
    const tasksWithVisit = projectTasks as Array<{
      id: string;
      title: string;
      status: string;
      siteVisitId?: string | null;
      dueDate?: Date | string | null;
      assigneeId?: string | null;
      description?: string | null;
      [key: string]: unknown;
    }>;
    return tasksWithVisit
      .filter((task) => task.siteVisitId === visitId)
      .map((task) => {
        const assignee = task.assigneeId ? getUser(task.assigneeId) : null;
        const dueDate =
          task.dueDate instanceof Date
            ? task.dueDate.toISOString().slice(0, 10)
            : typeof task.dueDate === 'string'
              ? task.dueDate
              : null;
        return {
          id: task.id,
          title: task.title,
          status: task.status as 'pending' | 'in_progress' | 'completed' | 'blocked',
          description: task.description ?? null,
          assigneeId: task.assigneeId ?? null,
          assigneeName: assignee?.name ?? null,
          assigneeAvatar: null,
          dueDate,
        };
      });
  }, [projectTasks, visitId, getUser]);

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [signOffDialogOpen, setSignOffDialogOpen] = useState(false);

  const handleBack = useCallback(() => {
    navigate({ to: '/projects/$projectId', params: { projectId } });
  }, [navigate, projectId]);

  const handleCheckIn = useCallback(async () => {
    try {
      await checkIn.mutateAsync({ siteVisitId: visitId });
      toast.success('Checked in successfully');
    } catch {
      toast.error('Failed to check in');
    }
  }, [checkIn, visitId]);

  const handleCheckOut = useCallback(async () => {
    try {
      await checkOut.mutateAsync({ siteVisitId: visitId });
      toast.success('Checked out successfully');
    } catch {
      toast.error('Failed to check out');
    }
  }, [checkOut, visitId]);

  const handleSignOffSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.detail(visitId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits.byProject(projectId) });
    toast.success('Customer sign-off recorded');
  }, [queryClient, visitId, projectId]);

  if (isLoading || error || !visit) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Site Visit" />
        <PageLayout.Content>
          {isLoading ? (
            <div className="space-y-6 p-6">
              <div className="h-8 w-48 bg-muted rounded animate-pulse" />
              <div className="h-64 bg-muted rounded-lg animate-pulse" />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-destructive">{error?.message || 'Not found'}</p>
              <Button variant="outline" className="mt-4" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          )}
        </PageLayout.Content>
      </PageLayout>
    );
  }

  const isScheduled = visit.status === 'scheduled';
  const isInProgress = visit.status === 'in_progress';
  const isCompleted = visit.status === 'completed';
  const canSignOff = isCompleted && !visit.customerSignOffConfirmed;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span>Site Visit {visit.visitNumber}</span>
                <StatusBadge status={visit.status} statusConfig={VISIT_STATUS_CONFIG} />
              </div>
              <p className="text-sm text-muted-foreground font-normal capitalize">
                {visit.visitType}
              </p>
            </div>
          </div>
        }
      />

      <PageLayout.Content>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Visit Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Date</p>
                    <p className="font-medium">{visit.scheduledDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">{visit.scheduledTime || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {visit.estimatedDuration ? `${visit.estimatedDuration} min` : 'Not set'}
                    </p>
                  </div>
                </div>
                {visit.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="mt-1">{visit.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
              <CardContent>
                <TaskList
                  tasks={siteVisitTasks}
                  isLoading={isLoadingTasks}
                  emptyMessage="No tasks for this site visit"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {isScheduled && (
                  <Button className="w-full" onClick={handleCheckIn} disabled={checkIn.isPending}>
                    <Play className="mr-2 h-4 w-4" />
                    {checkIn.isPending ? 'Checking In...' : 'Check In'}
                  </Button>
                )}
                {isInProgress && (
                  <Button className="w-full" variant="secondary" onClick={handleCheckOut} disabled={checkOut.isPending}>
                    <Square className="mr-2 h-4 w-4" />
                    {checkOut.isPending ? 'Checking Out...' : 'Check Out'}
                  </Button>
                )}
                {canSignOff && (
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => setSignOffDialogOpen(true)}
                  >
                    <PenLine className="mr-2 h-4 w-4" />
                    Record Customer Sign-off
                  </Button>
                )}
              </CardContent>
            </Card>

            {(visit.actualStartTime || visit.actualEndTime) && (
              <Card>
                <CardHeader><CardTitle>Time</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {visit.actualStartTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Started: {new Date(visit.actualStartTime).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {visit.actualEndTime && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Completed: {new Date(visit.actualEndTime).toLocaleTimeString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {visit.customerSignOffConfirmed && (
              <Card>
                <CardHeader><CardTitle>Sign-off</CardTitle></CardHeader>
                <CardContent>
                  <p className="font-medium">{visit.customerSignOffName}</p>
                  {visit.customerRating && (
                    <p className="text-yellow-500">{'★'.repeat(visit.customerRating)}</p>
                  )}
                  {visit.customerFeedback && (
                    <p className="text-sm text-muted-foreground mt-2">{visit.customerFeedback}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <CustomerSignOffDialog
              open={signOffDialogOpen}
              onOpenChange={setSignOffDialogOpen}
              siteVisitId={visitId}
              visitNumber={visit.visitNumber}
              onSuccess={handleSignOffSuccess}
            />
          </div>
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
