/**
 * Projects List Route
 *
 * Main projects dashboard showing all projects with portfolio stats,
 * priority-based filtering, and management overview.
 *
 * SPRINT-03: Enhanced route for serious project management
 *
 * @see STANDARDS.md for route patterns
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import {
  useAllProjects,
  useDeleteProject,
} from '@/hooks/jobs';
import {
  ProjectsDashboard,
  ProjectCreateDialog,
} from '@/components/domain/jobs/projects';
import { useConfirmation } from '@/hooks';
import type { Project } from 'drizzle/schema/jobs/projects';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/projects/')({
  component: ProjectsListPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Projects" description="Loading projects..." />
      <PageLayout.Content>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProjectsListPage() {
  const navigate = useNavigate();
  const confirm = useConfirmation();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch all projects for dashboard (stats need full dataset)
  const { data, isLoading, error } = useAllProjects({}, true);
  const deleteProject = useDeleteProject();

  // useAllProjects returns Project[] directly
  const projects = (data as Project[] | undefined) ?? [];

  // Handlers
  const handleViewProject = useCallback(
    (project: Project) => {
      navigate({ to: '/projects/$projectId', params: { projectId: project.id } });
    },
    [navigate]
  );

  const handleEditProject = useCallback(
    (project: Project) => {
      navigate({
        to: '/projects/$projectId',
        params: { projectId: project.id },
        search: { edit: true },
      });
    },
    [navigate]
  );

  const handleDeleteProject = useCallback(
    async (project: Project) => {
      const { confirmed } = await confirm.confirm({
        title: 'Delete Project',
        description: `Are you sure you want to delete "${project.title}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'destructive',
      });

      if (confirmed) {
        deleteProject.mutate(project.id);
      }
    },
    [confirm, deleteProject]
  );

  // Loading state
  if (isLoading) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Projects" description="Loading projects..." />
        <PageLayout.Content>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Projects" description="Error loading projects" />
        <PageLayout.Content>
          <div className="text-center py-12 text-destructive">
            <p>Error: {error.message}</p>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Projects"
        description="Portfolio overview and project management"
      />

      <PageLayout.Content>
        <ProjectsDashboard
          projects={projects}
          isLoading={isLoading}
          onProjectClick={handleViewProject}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
          onCreateProject={() => setCreateDialogOpen(true)}
        />
      </PageLayout.Content>

      {/* Create Project Dialog */}
      <ProjectCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(projectId) => {
          navigate({ to: '/projects/$projectId', params: { projectId } });
        }}
      />
    </PageLayout>
  );
}
