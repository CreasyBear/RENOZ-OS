/**
 * Site Visit Detail Component
 *
 * Detailed view for a single site visit with check-in/out and task management.
 *
 * SPRINT-03: New components for project-centric jobs model
 */

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  MapPin,
  Clock,
  Calendar,
  User,
  CheckCircle,
  PlayCircle,
  Flag,
  ArrowLeft,
  FileText,
  Plus,
  CheckSquare,
  XCircle,
  PanelRight,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DisabledButtonWithTooltip } from '@/components/shared/disabled-with-tooltip';

import type { SiteVisit, SiteVisitStatus } from '@/lib/schemas/jobs';
import { useCancelSiteVisit, useProjectTasks } from '@/hooks/jobs';
import { toastSuccess, toastError } from '@/hooks';
import { useAlertDismissals, generateAlertIdWithValue } from '@/hooks/_shared/use-alert-dismissals';

// ============================================================================
// TYPES
// ============================================================================

// Extended site visit type with joined fields
interface SiteVisitWithJoins extends SiteVisit {
  installerName?: string;
  siteAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  // Aliases for actualStartTime/actualEndTime for convenience
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

interface SiteVisitDetailProps {
  visit: SiteVisitWithJoins;
  projectTitle: string;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onComplete?: () => void;
  onAddNote?: () => void;
  onAddTask?: () => void;
  onCancelSuccess?: () => void;
  className?: string;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
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

function formatStatus(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SiteVisitDetail({
  visit,
  projectTitle,
  onCheckIn,
  onCheckOut,
  onComplete,
  onAddNote,
  onAddTask,
  onCancelSuccess,
  className,
}: SiteVisitDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'notes'>('overview');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  const { data: projectTasks, isLoading: isTasksLoading } = useProjectTasks({
    projectId: visit.projectId,
    enabled: !!visit.projectId,
  });

  const tasks: Task[] = useMemo(() => {
    const items = (projectTasks ?? []) as Array<{ id: string; title: string; status: Task['status']; siteVisitId?: string | null }>;
    return items
      .filter((task) => task.siteVisitId === visit.id)
      .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
      }));
  }, [projectTasks, visit.id]);

  const canCheckIn = visit.status === 'scheduled' || visit.status === 'rescheduled';
  const canCheckOut = visit.status === 'in_progress';
  const canComplete = visit.status === 'in_progress';
  const canCancel = visit.status === 'scheduled' || visit.status === 'rescheduled';

  const alerts = useMemo(() => {
    const items: Array<{
      id: string;
      tone: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      actionLabel?: string;
      onAction?: () => void;
    }> = [];

    if (visit.status === 'no_show') {
      items.push({
        id: generateAlertIdWithValue('site_visit', visit.id, 'no_show', visit.visitNumber),
        tone: 'critical',
        title: 'No-show recorded',
        description: 'The installer did not check in for this visit.',
        actionLabel: 'Review overview',
        onAction: () => setActiveTab('overview'),
      });
    }

    if (visit.status === 'cancelled') {
      items.push({
        id: generateAlertIdWithValue('site_visit', visit.id, 'cancelled', visit.visitNumber),
        tone: 'info',
        title: 'Visit cancelled',
        description: 'This visit has been cancelled and no further actions are available.',
      });
    }

    if ((visit.status === 'scheduled' || visit.status === 'rescheduled') && visit.scheduledDate) {
      const scheduledTime = new Date(visit.scheduledDate).getTime();
      if (scheduledTime < now) {
        items.push({
          id: generateAlertIdWithValue('site_visit', visit.id, 'overdue', visit.scheduledDate),
          tone: 'warning',
          title: 'Visit overdue',
          description: 'Scheduled time has passed and the visit has not started.',
          actionLabel: canCheckIn ? 'Check in' : undefined,
          onAction: canCheckIn ? onCheckIn : undefined,
        });
      }
    }

    return items;
  }, [canCheckIn, now, onCheckIn, visit.id, visit.scheduledDate, visit.status, visit.visitNumber]);

  const visibleAlerts = alerts.filter((alert) => !isAlertDismissed(alert.id)).slice(0, 3);
  const notesCount = visit.notes ? 1 : 0;
  const stages = [
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'completed', label: 'Completed' },
  ];
  const stageIndex = stages.findIndex((stage) => stage.id === visit.status);
  const isTerminal = visit.status === 'cancelled' || visit.status === 'no_show';

  const sidebarContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Visit Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Visit</span>
            <span className="font-mono">{visit.visitNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="capitalize">{formatStatus(visit.status)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Scheduled</span>
            <span>{format(new Date(visit.scheduledDate), 'PP')}</span>
          </div>
        </CardContent>
      </Card>

      {visit.siteAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Site Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{visit.siteAddress.street}</p>
            <p>
              {visit.siteAddress.city}, {visit.siteAddress.state} {visit.siteAddress.postalCode}
            </p>
            <p>{visit.siteAddress.country}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Installer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{visit.installerName || 'Unassigned'}</p>
        </CardContent>
      </Card>
    </div>
  );

  // Cancel mutation
  const cancelSiteVisit = useCancelSiteVisit();

  const handleCancelVisit = () => {
    cancelSiteVisit.mutate(
      { siteVisitId: visit.id },
      {
        onSuccess: () => {
          toastSuccess('Site visit cancelled successfully');
          setCancelDialogOpen(false);
          if (onCancelSuccess) {
            onCancelSuccess();
          }
        },
        onError: (error) => {
          toastError(error.message || 'Failed to cancel site visit');
        },
      }
    );
  };

  return (
    <div className={cn('grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]', className)}>
      <main className="min-w-0 space-y-6">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <Link
                to="/projects/$projectId"
                params={{ projectId: visit.projectId }}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 -ml-2')}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to {projectTitle}
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{visit.visitNumber}</h1>
                <Badge className={getStatusColor(visit.status)}>{formatStatus(visit.status)}</Badge>
              </div>
              <p className="text-muted-foreground capitalize">{visit.visitType.replace('_', ' ')}</p>
            </div>

            <div className="flex items-center gap-2">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Toggle visit sidebar"
                  >
                    <PanelRight className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px]">
                  <SheetHeader>
                    <SheetTitle>Visit details</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-6">{sidebarContent}</div>
                </SheetContent>
              </Sheet>
              <DisabledButtonWithTooltip
                onClick={onCheckIn}
                disabledReason={!canCheckIn ? 'Visit can only be checked in when scheduled' : undefined}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Check In
              </DisabledButtonWithTooltip>
              <DisabledButtonWithTooltip
                variant="outline"
                onClick={onCheckOut}
                disabledReason={!canCheckOut ? 'Visit must be in progress to check out' : undefined}
              >
                <Flag className="mr-2 h-4 w-4" />
                Check Out
              </DisabledButtonWithTooltip>
              <DisabledButtonWithTooltip
                onClick={onComplete}
                disabledReason={!canComplete ? 'Visit must be in progress to complete' : undefined}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete
              </DisabledButtonWithTooltip>
              <DisabledButtonWithTooltip
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                disabledReason={!canCancel ? 'Only scheduled visits can be cancelled' : undefined}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Visit
              </DisabledButtonWithTooltip>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Visit progress</div>
              {isTerminal && (
                <Badge variant="destructive" className="capitalize">
                  {formatStatus(visit.status)}
                </Badge>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {stages.map((stage, index) => {
                const isCompleted = stageIndex >= index && !isTerminal;
                const isCurrent = stage.id === visit.status;
                return (
                  <div key={stage.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium',
                        isCompleted && 'border-primary bg-primary text-primary-foreground',
                        isCurrent && !isCompleted && 'border-primary text-primary',
                        !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground'
                      )}
                    >
                      {isCompleted ? '✓' : '•'}
                    </div>
                    <span
                      className={cn(
                        'text-xs',
                        isCompleted && 'text-foreground',
                        !isCompleted && 'text-muted-foreground'
                      )}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {visibleAlerts.length > 0 && (
          <section className="space-y-2">
            {visibleAlerts.map((alert) => (
              <Alert
                key={alert.id}
                variant={alert.tone === 'critical' ? 'destructive' : 'default'}
              >
                <AlertDescription className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground">{alert.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.actionLabel && alert.onAction && (
                      <Button variant="outline" size="sm" onClick={alert.onAction}>
                        {alert.actionLabel}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Dismiss alert"
                      onClick={() => dismiss(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </section>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="gap-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2">
                Tasks
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {tasks.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                Notes
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {notesCount}
                </Badge>
              </TabsTrigger>
            </TabsList>
            {activeTab !== 'overview' && (
              <Button size="sm" onClick={activeTab === 'tasks' ? onAddTask : onAddNote}>
                <Plus className="mr-2 h-4 w-4" />
                Add {activeTab === 'tasks' ? 'Task' : 'Note'}
              </Button>
            )}
          </div>

          {activeTab === 'overview' && (
            <TabsContent value="overview" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium">
                          {format(new Date(visit.scheduledDate), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-medium">
                          {visit.scheduledTime || 'Not specified'}
                          {visit.estimatedDuration && ` (${visit.estimatedDuration} min)`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Installer</p>
                        <p className="font-medium">{visit.installerName || 'Unassigned'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium truncate">
                          {visit.siteAddress?.city || 'Address not set'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {visit.siteAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Site Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{visit.siteAddress.street}</p>
                    <p>
                      {visit.siteAddress.city}, {visit.siteAddress.state} {visit.siteAddress.postalCode}
                    </p>
                    <p>{visit.siteAddress.country}</p>
                  </CardContent>
                </Card>
              )}

              {(visit.actualStartTime || visit.actualEndTime) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Check-in/out Times</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {visit.actualStartTime && (
                        <div>
                          <p className="text-sm text-muted-foreground">Checked In</p>
                          <p className="font-medium">{format(new Date(visit.actualStartTime), 'PPp')}</p>
                        </div>
                      )}
                      {visit.actualEndTime && (
                        <div>
                          <p className="text-sm text-muted-foreground">Checked Out</p>
                          <p className="font-medium">{format(new Date(visit.actualEndTime), 'PPp')}</p>
                        </div>
                      )}
                    </div>
                    {visit.actualStartTime && visit.actualEndTime && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {Math.round(
                            (new Date(visit.actualEndTime).getTime() - new Date(visit.actualStartTime).getTime()) /
                              1000 /
                              60
                          )}{' '}
                          minutes
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {activeTab === 'tasks' && (
            <TabsContent value="tasks" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {isTasksLoading ? (
                    <div className="text-center py-8">
                      <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-medium">Loading tasks...</h3>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-medium">No tasks yet</h3>
                      <p className="text-muted-foreground">Add tasks for this visit.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer',
                              task.status === 'completed'
                                ? 'bg-green-500 border-green-500'
                                : task.status === 'blocked'
                                  ? 'border-destructive'
                                  : 'border-muted-foreground'
                            )}
                          >
                            {task.status === 'completed' && <CheckCircle className="h-3 w-3 text-white" />}
                          </div>
                          <span
                            className={cn(
                              'flex-1',
                              task.status === 'completed' && 'line-through text-muted-foreground'
                            )}
                          >
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {activeTab === 'notes' && (
            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {visit.notes ? (
                    <p className="whitespace-pre-wrap">{visit.notes}</p>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-medium">No notes yet</h3>
                      <p className="text-muted-foreground">Add notes about this visit.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <aside className="hidden lg:block sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Site Visit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this site visit? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelVisit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelSiteVisit.isPending}
            >
              {cancelSiteVisit.isPending ? 'Cancelling...' : 'Confirm Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
