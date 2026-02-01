/**
 * Project Detail Container
 *
 * Handles data fetching, mutations, and state management for project detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source project from useProject hook
 * @source activities from useUnifiedActivities hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Edit,
  MoreHorizontal,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ErrorState } from '@/components/shared/error-state';
import { StatusCell } from '@/components/shared/data-table';
import { toast } from '@/lib/toast';
import {
  useProject,
  useDeleteProject,
  useCompleteProject,
  useSiteVisitsByProject,
  useWorkstreams,
} from '@/hooks/jobs';
import { useUnifiedActivities } from '@/hooks/activities';
import { PROJECT_STATUS_CONFIG } from '../project-status-config';
import { StatusProgressCircle } from '../progress-circle';
import {
  ProjectDetailView,
  type ProjectDetailData,
  type ProjectMember,
} from '../views/project-detail-view';
import {
  ProjectOverviewTab,
  ProjectWorkstreamsTab,
  ProjectVisitsTab,
  ProjectTasksTab,
  ProjectBomTab,
  ProjectNotesTab,
  ProjectFilesTab,
} from '../project-detail-tabs';
import { ProjectCompletionDialog, ProjectEditDialog } from '../';
import type { ProjectStatus } from '@/lib/schemas/jobs/projects';
import type { Project } from 'drizzle/schema/jobs/projects';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectDetailContainerRenderProps {
  /** Header title element */
  headerTitle: React.ReactNode;
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface ProjectDetailContainerProps {
  /** Project ID to display */
  projectId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Render props pattern for layout composition */
  children?: (props: ProjectDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectDetailContainer({
  projectId,
  onBack,
  onEdit,
  children,
  className,
}: ProjectDetailContainerProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showMetaPanel, setShowMetaPanel] = useState(true);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Panel Toggle Handler
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: rawProject,
    isLoading,
    error,
    refetch,
  } = useProject({ projectId });

  const { data: rawSiteVisits } = useSiteVisitsByProject(projectId);
  useWorkstreams(projectId);

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'project',
    entityId: projectId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteProject();
  useCompleteProject();

  // ─────────────────────────────────────────────────────────────────────────
  // Transform Data
  // ─────────────────────────────────────────────────────────────────────────
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

  const siteVisits = ((rawSiteVisits as { items?: unknown[] } | undefined)?.items ?? []) as SiteVisitItem[];

  // Transform project data to match presenter interface
  const project = useMemo((): ProjectDetailData | null => {
    if (!rawProject) return null;

    const raw = rawProject as {
      id: string;
      title: string;
      projectNumber: string;
      description: string | null;
      status: ProjectStatus;
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
      members?: Array<{
        user: {
          id: string;
          name: string | null;
          email: string;
          avatarUrl?: string;
        };
        role: 'owner' | 'manager' | 'member';
      }>;
      createdAt: string;
      updatedAt: string;
      version?: number;
    };

    return {
      id: raw.id,
      title: raw.title,
      projectNumber: raw.projectNumber,
      description: raw.description,
      status: raw.status,
      progressPercent: raw.progressPercent,
      projectType: raw.projectType,
      priority: raw.priority,
      startDate: raw.startDate,
      targetCompletionDate: raw.targetCompletionDate,
      actualCompletionDate: raw.actualCompletionDate,
      estimatedTotalValue: raw.estimatedTotalValue,
      actualTotalCost: raw.actualTotalCost,
      siteAddress: raw.siteAddress,
      scope: raw.scope,
      outcomes: raw.outcomes,
      keyFeatures: raw.keyFeatures,
      customer: raw.customer,
      members: raw.members as ProjectMember[],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    };
  }, [rawProject]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit();
    } else {
      setEditDialogOpen(true);
    }
  }, [onEdit]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync(projectId);
      toast.success('Project deleted successfully');
      setDeleteDialogOpen(false);
      onBack?.();
    } catch {
      toast.error('Failed to delete project');
    }
  }, [deleteMutation, projectId, onBack]);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const canComplete = project
    ? !['completed', 'cancelled'].includes(project.status)
    : false;

  // ─────────────────────────────────────────────────────────────────────────
  // Tab Content Renderers
  // ─────────────────────────────────────────────────────────────────────────
  const renderOverviewTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectOverviewTab
        project={{
          id: project.id,
          title: project.title,
          projectNumber: project.projectNumber,
          description: project.description,
          status: project.status,
          progressPercent: project.progressPercent,
          projectType: project.projectType,
          priority: project.priority,
          startDate: project.startDate,
          targetCompletionDate: project.targetCompletionDate,
          actualCompletionDate: project.actualCompletionDate,
          estimatedTotalValue: project.estimatedTotalValue,
          actualTotalCost: project.actualTotalCost,
          siteAddress: project.siteAddress,
          scope: project.scope,
          outcomes: project.outcomes,
          keyFeatures: project.keyFeatures,
        }}
        visits={siteVisits}
      />
    );
  }, [project, siteVisits]);

  const renderWorkstreamsTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectWorkstreamsTab
        project={{
          id: project.id,
          title: project.title,
          projectNumber: project.projectNumber,
          description: project.description,
          status: project.status,
          progressPercent: project.progressPercent,
          projectType: project.projectType,
          priority: project.priority,
          startDate: project.startDate,
          targetCompletionDate: project.targetCompletionDate,
          actualCompletionDate: project.actualCompletionDate,
          estimatedTotalValue: project.estimatedTotalValue,
          actualTotalCost: project.actualTotalCost,
          siteAddress: project.siteAddress,
          scope: project.scope,
          outcomes: project.outcomes,
          keyFeatures: project.keyFeatures,
        }}
      />
    );
  }, [project]);

  const renderVisitsTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectVisitsTab
        project={{
          id: project.id,
          title: project.title,
          projectNumber: project.projectNumber,
          description: project.description,
          status: project.status,
          progressPercent: project.progressPercent,
          projectType: project.projectType,
          priority: project.priority,
          startDate: project.startDate,
          targetCompletionDate: project.targetCompletionDate,
          actualCompletionDate: project.actualCompletionDate,
          estimatedTotalValue: project.estimatedTotalValue,
          actualTotalCost: project.actualTotalCost,
          siteAddress: project.siteAddress,
          scope: project.scope,
          outcomes: project.outcomes,
          keyFeatures: project.keyFeatures,
        }}
        visits={siteVisits}
      />
    );
  }, [project, siteVisits]);

  const renderTasksTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectTasksTab
        project={{
          id: project.id,
          title: project.title,
          projectNumber: project.projectNumber,
          description: project.description,
          status: project.status,
          progressPercent: project.progressPercent,
          projectType: project.projectType,
          priority: project.priority,
          startDate: project.startDate,
          targetCompletionDate: project.targetCompletionDate,
          actualCompletionDate: project.actualCompletionDate,
          estimatedTotalValue: project.estimatedTotalValue,
          actualTotalCost: project.actualTotalCost,
          siteAddress: project.siteAddress,
          scope: project.scope,
          outcomes: project.outcomes,
          keyFeatures: project.keyFeatures,
        }}
      />
    );
  }, [project]);

  const renderBomTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectBomTab
        project={{
          id: project.id,
          title: project.title,
          projectNumber: project.projectNumber,
          description: project.description,
          status: project.status,
          progressPercent: project.progressPercent,
          projectType: project.projectType,
          priority: project.priority,
          startDate: project.startDate,
          targetCompletionDate: project.targetCompletionDate,
          actualCompletionDate: project.actualCompletionDate,
          estimatedTotalValue: project.estimatedTotalValue,
          actualTotalCost: project.actualTotalCost,
          siteAddress: project.siteAddress,
          scope: project.scope,
          outcomes: project.outcomes,
          keyFeatures: project.keyFeatures,
        }}
      />
    );
  }, [project]);

  const renderNotesTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectNotesTab
        project={{
          id: project.id,
          title: project.title,
          projectNumber: project.projectNumber,
          description: project.description,
          status: project.status,
          progressPercent: project.progressPercent,
          projectType: project.projectType,
          priority: project.priority,
          startDate: project.startDate,
          targetCompletionDate: project.targetCompletionDate,
          actualCompletionDate: project.actualCompletionDate,
          estimatedTotalValue: project.estimatedTotalValue,
          actualTotalCost: project.actualTotalCost,
          siteAddress: project.siteAddress,
          scope: project.scope,
          outcomes: project.outcomes,
          keyFeatures: project.keyFeatures,
        }}
      />
    );
  }, [project]);

  const renderFilesTab = useCallback(() => {
    if (!project) return null;
    return (
      <ProjectFilesTab
        project={{
          id: project.id,
          title: project.title,
          projectNumber: project.projectNumber,
          description: project.description,
          status: project.status,
          progressPercent: project.progressPercent,
          projectType: project.projectType,
          priority: project.priority,
          startDate: project.startDate,
          targetCompletionDate: project.targetCompletionDate,
          actualCompletionDate: project.actualCompletionDate,
          estimatedTotalValue: project.estimatedTotalValue,
          actualTotalCost: project.actualTotalCost,
          siteAddress: project.siteAddress,
          scope: project.scope,
          outcomes: project.outcomes,
          keyFeatures: project.keyFeatures,
        }}
      />
    );
  }, [project]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <ProjectDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
            headerTitle: <Skeleton className="h-8 w-48" />,
            headerActions: <Skeleton className="h-10 w-32" />,
            content: loadingContent,
          })}
        </>
      );
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (error || !project) {
    const errorContent = (
      <ErrorState
        title="Project not found"
        message="The project you're looking for doesn't exist or has been deleted."
        onRetry={() => refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerTitle: 'Project Not Found',
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Elements
  // ─────────────────────────────────────────────────────────────────────────
  const headerTitle = (
    <div className="flex items-center gap-3">
      <div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold">{project.title}</span>
          <StatusCell status={project.status} statusConfig={PROJECT_STATUS_CONFIG} showIcon />
        </div>
        <p className="text-sm text-muted-foreground">{project.projectNumber}</p>
      </div>
    </div>
  );

  const headerActions = (
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

      {/* Complete Button */}
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

      {/* Edit Button */}
      <Button variant="outline" size="sm" onClick={handleEdit}>
        <Edit className="h-4 w-4 mr-1.5" />
        Edit
      </Button>

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <>
      <ProjectDetailView
        project={project}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        renderOverviewTab={renderOverviewTab}
        renderWorkstreamsTab={renderWorkstreamsTab}
        renderVisitsTab={renderVisitsTab}
        renderTasksTab={renderTasksTab}
        renderBomTab={renderBomTab}
        renderNotesTab={renderNotesTab}
        renderFilesTab={renderFilesTab}
        className={className}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project {project.projectNumber}? This
              action cannot be undone and will delete all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Completion Dialog */}
      <ProjectCompletionDialog
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        projectId={projectId}
        projectTitle={project.title}
        estimatedTotalValue={
          project.estimatedTotalValue
            ? parseFloat(project.estimatedTotalValue.toString())
            : undefined
        }
        onSuccess={() => {
          // Project data will refresh automatically via cache invalidation
        }}
      />

      {/* Project Edit Dialog */}
      <ProjectEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={rawProject as unknown as Project}
        onSuccess={() => {
          // Project data will refresh automatically via cache invalidation
        }}
      />
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: With Render Props or Default
  // ─────────────────────────────────────────────────────────────────────────
  if (children) {
    return <>{children({ headerTitle, headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        {headerTitle}
        {headerActions}
      </div>
      {content}
    </div>
  );
}

export default ProjectDetailContainer;
