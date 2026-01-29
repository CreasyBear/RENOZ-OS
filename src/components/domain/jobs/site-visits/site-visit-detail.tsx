/**
 * Site Visit Detail Component
 *
 * Detailed view for a single site visit with check-in/out and task management.
 *
 * SPRINT-03: New components for project-centric jobs model
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { SiteVisit, SiteVisitStatus } from 'drizzle/schema/jobs/site-visits';

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
  className?: string;
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
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
  className,
}: SiteVisitDetailProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'materials'>('tasks');

  // TODO: Fetch tasks for this visit
  const tasks: Task[] = [];

  const canCheckIn = visit.status === 'scheduled' || visit.status === 'rescheduled';
  const canCheckOut = visit.status === 'in_progress';
  const canComplete = visit.status === 'in_progress';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: visit.projectId } })}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to {projectTitle}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{visit.visitNumber}</h1>
            <Badge className={getStatusColor(visit.status)}>{formatStatus(visit.status)}</Badge>
          </div>
          <p className="text-muted-foreground capitalize">{visit.visitType.replace('_', ' ')}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canCheckIn && (
            <Button onClick={onCheckIn} className="bg-teal-600 hover:bg-teal-700">
              <PlayCircle className="mr-2 h-4 w-4" />
              Check In
            </Button>
          )}
          {canCheckOut && (
            <Button onClick={onCheckOut} variant="outline">
              <Flag className="mr-2 h-4 w-4" />
              Check Out
            </Button>
          )}
          {canComplete && (
            <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
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

      {/* Address Details */}
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

      {/* Check-in/out Info */}
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

      {/* Notes */}
      {visit.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{visit.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs Content */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'tasks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('tasks')}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Tasks
            </Button>
            <Button
              variant={activeTab === 'notes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('notes')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Visit Notes
            </Button>
          </div>
          <Button
            size="sm"
            onClick={activeTab === 'tasks' ? onAddTask : onAddNote}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {activeTab === 'tasks' ? 'Task' : 'Note'}
          </Button>
        </div>

        {activeTab === 'tasks' && (
          <Card>
            <CardContent className="p-6">
              {tasks.length === 0 ? (
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
        )}

        {activeTab === 'notes' && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No notes yet</h3>
                <p className="text-muted-foreground">Add notes about this visit.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
