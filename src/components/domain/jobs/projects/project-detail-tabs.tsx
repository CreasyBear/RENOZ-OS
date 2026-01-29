/**
 * Project Detail Tabs Components
 *
 * Tab content components for the project detail page.
 * Follows container/presenter pattern from STANDARDS.md.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-03: Integrated with workstreams, notes, files backend
 *
 * @source workstreams from useWorkstreams hook
 * @source notes from useNotes hook
 * @source files from useFiles hook
 */

import { useState } from 'react';
import {
  Calendar,
  Plus,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { toast } from '@/lib/toast';

// Enhanced Components
import { ProjectBomTab as EnhancedProjectBomTab } from './project-bom-tab';
import { ProjectTasksTab as EnhancedProjectTasksTab } from './project-tasks-tab';
import { ProjectNotesTab as EnhancedProjectNotesTab } from './project-notes-tab';
import { ProjectFilesTab as EnhancedProjectFilesTab } from './project-files-tab';

// Dialogs
import {
  WorkstreamCreateDialog,
} from './';

// Hooks
import {
  useWorkstreams,
  useDeleteWorkstream,
  useReorderWorkstreams,
} from '@/hooks/jobs';



// Presentation components
import { ProjectWorkstreamsView } from '@/components/jobs/presentation/workstreams/ProjectWorkstreamsView';

// Import overview components
import {
  ProjectDescriptionCard,
  ScopeColumns,
  OutcomesList,
  KeyFeaturesColumns,
} from './project-overview-panels';
import { ProjectTimelineGantt } from './project-timeline-gantt';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectTabData {
  id: string;
  title: string;
  projectNumber: string;
  description: string | null;
  status: 'quoting' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  progressPercent: number;
  projectType: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  estimatedTotalValue: string | number | null;
  actualTotalCost: string | number | null;
  siteAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  scope: {
    inScope: string[];
    outOfScope: string[];
  } | null;
  outcomes: string[] | null;
  keyFeatures: {
    p0: string[];
    p1: string[];
    p2: string[];
  } | null;
}

interface TabProps {
  project: ProjectTabData;
}

interface Visit {
  id: string;
  visitNumber: string;
  visitType: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string | null;
  installerName?: string;
}

interface TimelineTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  assignee?: {
    name: string;
    avatar?: string;
  };
  workstreamName?: string;
}

// ============================================================================
// STATUS HELPER
// ============================================================================

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

// ============================================================================
// OVERVIEW TAB - ENHANCED
// ============================================================================

interface ProjectOverviewTabProps extends TabProps {
  tasks?: TimelineTask[];
  visits?: Visit[];
}

export function ProjectOverviewTab({ project, tasks = [], visits = [] }: ProjectOverviewTabProps) {
  const safeVisits = Array.isArray(visits) ? visits : [];

  // Convert site visits to timeline tasks if no tasks provided
  const timelineTasks: TimelineTask[] = tasks.length > 0
    ? tasks
    : safeVisits.map(v => ({
        id: v.id,
        title: v.visitNumber,
        startDate: new Date(v.scheduledDate),
        endDate: new Date(v.scheduledDate),
        status: v.status === 'completed' ? 'completed' :
                v.status === 'in_progress' ? 'in_progress' : 'todo',
        progress: v.status === 'completed' ? 100 :
                  v.status === 'in_progress' ? 50 : 0,
        assignee: v.installerName ? { name: v.installerName } : undefined,
      }));

  return (
    <div className="space-y-6">
      {/* Description */}
      <ProjectDescriptionCard description={project.description} />

      {/* Scope */}
      <ScopeColumns scope={project.scope} />

      {/* Outcomes */}
      <OutcomesList outcomes={project.outcomes} />

      {/* Key Features */}
      <KeyFeaturesColumns features={project.keyFeatures} />

      {/* Timeline Gantt */}
      <ProjectTimelineGantt
        tasks={timelineTasks}
        projectStartDate={project.startDate ? new Date(project.startDate) : undefined}
        projectEndDate={project.targetCompletionDate ? new Date(project.targetCompletionDate) : undefined}
      />

      {/* Site Address Card */}
      {project.siteAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Site Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-0.5">
              <p>{project.siteAddress.street}</p>
              <p>
                {project.siteAddress.city}, {project.siteAddress.state}{' '}
                {project.siteAddress.postalCode}
              </p>
              <p className="text-muted-foreground">{project.siteAddress.country}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// WORKSTREAMS TAB - CONTAINER
// ============================================================================

/**
 * Project Workstreams Tab Container
 * @source workstreams from useWorkstreams hook
 * @source createWorkstream from useCreateWorkstream mutation
 * @source deleteWorkstream from useDeleteWorkstream mutation
 */
export function ProjectWorkstreamsTab({ project }: TabProps) {
  // Data fetching
  const { data: workstreamsData, isLoading } = useWorkstreams(project.id);
  const workstreams = workstreamsData?.data || [];

  // Mutations
  const deleteWorkstream = useDeleteWorkstream(project.id);
  const reorderWorkstreams = useReorderWorkstreams(project.id);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleAddWorkstream = () => {
    setCreateDialogOpen(true);
  };

  const handleDeleteWorkstream = async (workstream: { id: string; name: string }) => {
    if (confirm(`Delete workstream "${workstream.name}"?`)) {
      try {
        await deleteWorkstream.mutateAsync(workstream.id);
        toast.success('Workstream deleted');
      } catch (err) {
        toast.error('Failed to delete workstream');
      }
    }
  };

  const handleReorderWorkstreams = async (workstreamIds: string[]) => {
    try {
      await reorderWorkstreams.mutateAsync(workstreamIds);
      toast.success('Workstreams reordered');
    } catch (err) {
      toast.error('Failed to reorder workstreams');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Workstreams</h3>
          <p className="text-sm text-muted-foreground">
            Organize project tasks by phase or work area. Drag to reorder.
          </p>
        </div>
        <Button onClick={handleAddWorkstream}>
          <Plus className="mr-2 h-4 w-4" />
          Add Workstream
        </Button>
      </div>

      <ProjectWorkstreamsView
        workstreams={workstreams}
        onAddWorkstream={handleAddWorkstream}
        onDeleteWorkstream={handleDeleteWorkstream}
        onReorderWorkstreams={handleReorderWorkstreams}
        isLoading={isLoading}
        isReorderable={workstreams.length > 1}
      />

      <WorkstreamCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={project.id}
      />
    </div>
  );
}

// ============================================================================
// VISITS TAB
// ============================================================================

interface ProjectVisitsTabProps extends TabProps {
  visits?: Visit[];
  onScheduleVisit?: () => void;
}

export function ProjectVisitsTab({ project, visits = [], onScheduleVisit }: ProjectVisitsTabProps) {
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

      {safeVisits.length === 0 ? (
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
                    {visit.installerName && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Assigned to</p>
                        <p className="text-sm font-medium">{visit.installerName}</p>
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
    </div>
  );
}

// ============================================================================
// TASKS TAB - CONTAINER
// ============================================================================

/**
 * Project Tasks Tab Container
 * Full-featured task management with workstream grouping
 */
export function ProjectTasksTab({ project }: TabProps) {
  return <EnhancedProjectTasksTab projectId={project.id} />;
}

// ============================================================================
// BOM TAB - CONTAINER
// ============================================================================

/**
 * Project BOM Tab Container
 * Full materials management with cost tracking
 */
export function ProjectBomTab({ project }: TabProps) {
  return <EnhancedProjectBomTab projectId={project.id} />;
}

// ============================================================================
// NOTES TAB - CONTAINER
// ============================================================================

/**
 * Project Notes Tab Container
 * Delegates to enhanced ProjectNotesTab
 */
export function ProjectNotesTab({ project }: TabProps) {
  return <EnhancedProjectNotesTab projectId={project.id} />;
}

// ============================================================================
// FILES TAB - CONTAINER
// ============================================================================

/**
 * Project Files Tab Container
 * Delegates to enhanced ProjectFilesTab
 */
export function ProjectFilesTab({ project }: TabProps) {
  return <EnhancedProjectFilesTab projectId={project.id} />;
}
