/**
 * Site Visit Detail Route
 *
 * Site visit execution view for installers.
 * SPRINT-03: New route for project-centric jobs model
 */

import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useCustomerSignOff,
  useProjectTasks,
} from '@/hooks/jobs';
import { CustomerSignOffDialog } from '@/components/domain/jobs/projects/customer-sign-off-dialog';
import { toast } from '@/lib/toast';
import { TaskList } from '@/components/domain/jobs/projects/task-list';

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/visits/$visitId'
)({
  component: SiteVisitDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/projects" />
  ),
});

function SiteVisitDetailPage() {
  const { projectId, visitId } = useParams({
    from: '/_authenticated/projects/$projectId/visits/$visitId',
  });
  const navigate = useNavigate();

  const { data: rawVisit, isLoading, error } = useSiteVisit({ siteVisitId: visitId });
  
  interface VisitData {
    id: string;
    projectId: string;
    visitNumber: string;
    visitType: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
    scheduledDate: string;
    scheduledTime: string | null;
    estimatedDuration: number | null;
    notes: string | null;
    actualStartTime: string | null;
    actualEndTime: string | null;
    customerSignOffConfirmed: boolean;
    customerSignOffName: string | null;
    customerRating: number | null;
  }
  
  const visit = rawVisit as VisitData | undefined;
  
  // Fetch tasks for this site visit (via project tasks)
  const { data: projectTasks = [], isLoading: isLoadingTasks } = useProjectTasks({
    projectId,
    enabled: !!projectId,
  });
  
  // Filter tasks for current site visit
  const siteVisitTasks = projectTasks.filter((task: any) => task.siteVisitId === visitId);
  
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const signOff = useCustomerSignOff();
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
    // Refresh the site visit data
    window.location.reload();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || error || !visit) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Site Visit" />
        <PageLayout.Content>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
                <Badge className={getStatusColor(visit.status)}>{visit.status}</Badge>
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

            {/* Sign-off Dialog */}
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
