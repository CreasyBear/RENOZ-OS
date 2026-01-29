/**
 * Project Detail Route
 *
 * Tabbed project detail view with:
 * - Overview (scope, outcomes, features, timeline Gantt)
 * - Workstreams
 * - Site Visits
 * - Tasks
 * - BOM
 * - Notes
 * - Files
 *
 * Features collapsible right meta panel and rich overview content.
 *
 * SPRINT-03: New route for project-centric jobs model
 *
 * @see STANDARDS.md for route patterns
 */

import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Package,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  ClipboardList,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  ChevronLeft,
} from 'lucide-react';
import {
  useProject,
  useDeleteProject,
  useSiteVisitsByProject,
  useWorkstreams,
} from '@/hooks/jobs';
import {
  ProjectCompletionDialog,
  ProjectEditDialog,
} from '@/components/domain/jobs/projects';
import { toast } from '@/lib/toast';
import { useConfirmation } from '@/hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import new components
import { ProjectOverviewTab } from '@/components/domain/jobs/projects/project-detail-tabs';
import { ProjectMetaPanel } from '@/components/domain/jobs/projects/project-meta-panel';
import { StatusProgressCircle } from '@/components/domain/jobs/projects/progress-circle';
import type { Project } from 'drizzle/schema/jobs/projects';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/projects/$projectId')({
  component: ProjectDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/projects" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Project" description="Loading project details..." />
      <PageLayout.Content>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  quoting: { label: 'Quoting', color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-500' },
  approved: { label: 'Approved', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'text-teal-700', bg: 'bg-teal-100', dot: 'bg-teal-500' },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  on_hold: { label: 'On Hold', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProjectDetailPage() {
  const { projectId } = useParams({ from: '/_authenticated/projects/$projectId' });
  const navigate = useNavigate();
  const confirm = useConfirmation();

  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [metaPanelOpen, setMetaPanelOpen] = useState(true);
  const [, setCreateVisitOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Data fetching
  const { data: rawProject, isLoading, error } = useProject({ projectId });
  const { data: rawSiteVisits } = useSiteVisitsByProject(projectId);
  const { data: workstreamsData } = useWorkstreams(projectId);

  // Type the data
  interface SiteVisitItem {
    id: string;
    projectId: string;
    visitNumber: string;
    visitType: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string | null;
    installerName?: string;
  }

  const siteVisits = (rawSiteVisits?.items ?? []) as SiteVisitItem[];

  interface ProjectMember {
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl?: string;
    };
    role: 'owner' | 'manager' | 'member';
  }

  interface ProjectData {
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
    customer?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      companyName?: string;
    } | null;
    members?: ProjectMember[];
  }

  const project = rawProject as ProjectData | undefined;

  // Mutations
  const deleteProject = useDeleteProject();

  // Derived state
  const canComplete = project
    ? !['completed', 'cancelled'].includes(project.status)
    : false;

  // Handlers
  const handleBack = useCallback(() => {
    navigate({ to: '/projects' });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm.confirm({
      title: 'Delete Project',
      description: 'Are you sure you want to delete this project? This action cannot be undone.',
      confirmLabel: 'Delete Project',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        await deleteProject.mutateAsync(projectId);
        toast.success('Project deleted successfully');
        navigate({ to: '/projects' });
      } catch (err) {
        toast.error('Failed to delete project');
      }
    }
  }, [confirm, deleteProject, navigate, projectId]);

  // Loading state
  if (isLoading) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Project" description="Loading..." />
        <PageLayout.Content>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Error" />
        <PageLayout.Content>
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load project</p>
            <Button onClick={handleBack} variant="outline" className="mt-4">
              Back to Projects
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  const status = STATUS_CONFIG[project.status];

  // Prepare meta panel data with workstreams for backlog card
  const metaPanelProject = {
    ...project,
    members: project.members || [],
    workstreams: workstreamsData?.data || [],
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PageLayout variant="full-width">
          {/* Header */}
          <PageLayout.Header
            title={
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-semibold">{project.title}</span>
                    <Badge className={status.bg}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{project.projectNumber}</p>
                </div>
              </div>
            }
            actions={
              <div className="flex items-center gap-2">
                {/* Progress Circle */}
                <div className="hidden sm:flex items-center gap-2 pr-4 border-r">
                  <StatusProgressCircle
                    status={project.status}
                    progress={project.progressPercent}
                    size={40}
                    strokeWidth={3}
                    showLabel
                  />
                  <div className="text-xs">
                    <p className="text-muted-foreground">Progress</p>
                    <p className="font-medium">{project.progressPercent}%</p>
                  </div>
                </div>

                {canComplete && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCompletionDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Complete
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Project
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
          />

          {/* Tabs Content */}
          <PageLayout.Content className="p-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col h-full"
            >
              <div className="border-b px-6">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-1">
                  <TabsTrigger value="overview" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="workstreams" className="gap-2">
                    <Package className="h-4 w-4" />
                    Workstreams
                  </TabsTrigger>
                  <TabsTrigger value="visits" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Visits
                    {siteVisits && siteVisits.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {siteVisits.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="bom" className="gap-2">
                    <Package className="h-4 w-4" />
                    BOM
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Files
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <TabsContent value="overview" className="mt-0">
                  <ProjectOverviewTab
                    project={project}
                    visits={siteVisits}
                  />
                </TabsContent>

                <TabsContent value="workstreams" className="mt-0">
                  <ProjectWorkstreamsTab project={project} />
                </TabsContent>

                <TabsContent value="visits" className="mt-0">
                  <ProjectVisitsTab
                    project={project}
                    visits={siteVisits}
                    onScheduleVisit={() => setCreateVisitOpen(true)}
                  />
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
                  <ProjectTasksTab project={project} />
                </TabsContent>

                <TabsContent value="bom" className="mt-0">
                  <ProjectBomTab project={project} />
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <ProjectNotesTab project={project} />
                </TabsContent>

                <TabsContent value="files" className="mt-0">
                  <ProjectFilesTab project={project} />
                </TabsContent>
              </div>
            </Tabs>
          </PageLayout.Content>
        </PageLayout>
      </div>

      {/* Right Meta Panel with Animation */}
      <AnimatePresence initial={false}>
        {metaPanelOpen && (
          <motion.div
            key="meta-panel"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="border-l"
          >
            <ProjectMetaPanel
              project={metaPanelProject}
              isOpen={metaPanelOpen}
              onToggle={() => setMetaPanelOpen(!metaPanelOpen)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Panel Button */}
      {!metaPanelOpen && (
        <div className="w-10 border-l bg-muted/30 flex flex-col items-center py-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMetaPanelOpen(true)}
            title="Expand panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Project Completion Dialog */}
      <ProjectCompletionDialog
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        projectId={projectId}
        projectTitle={project.title}
        estimatedTotalValue={project.estimatedTotalValue ? parseFloat(project.estimatedTotalValue.toString()) : undefined}
        onSuccess={() => {
          // Project data will refresh automatically via cache invalidation
        }}
      />

      {/* Project Edit Dialog */}
      <ProjectEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project as unknown as Project}
        onSuccess={() => {
          // Project data will refresh automatically via cache invalidation
        }}
      />
    </div>
  );
}

// Import tab components
import {
  ProjectWorkstreamsTab,
  ProjectVisitsTab,
  ProjectTasksTab,
  ProjectBomTab,
  ProjectNotesTab,
  ProjectFilesTab,
} from '@/components/domain/jobs/projects/project-detail-tabs';
