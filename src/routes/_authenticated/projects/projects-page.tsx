/**
 * Projects Page Component
 *
 * Main projects dashboard showing all projects with portfolio stats,
 * priority-based filtering, and management overview.
 * URL-synced filters per DOMAIN-LANDING Zone 2.
 *
 * @source projects from useAllProjects hook
 * @source deleteProject from useDeleteProject hook
 *
 * @see src/routes/_authenticated/projects/index.tsx - Route definition
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { Route } from '@/routes/_authenticated/projects';
import { PageLayout } from '@/components/layout';
import {
  useAllProjects,
  useDeleteProject,
} from '@/hooks/jobs';
import {
  ProjectsDashboard,
  ProjectCreateDialog,
} from '@/components/domain/jobs/projects';
import { useConfirmation } from '@/hooks';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { Project } from '@/lib/schemas/jobs';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const confirm = useConfirmation();
  const searchParams = Route.useSearch();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleFiltersChange = useCallback(
    (updates: Partial<typeof searchParams>) => {
      navigate({
        to: '/projects',
        search: { ...searchParams, ...updates },
      });
    },
    [navigate, searchParams]
  );

  // Fetch all projects for dashboard (stats need full dataset)
  const { data, isLoading, error, refetch } = useAllProjects({}, true);
  const deleteProject = useDeleteProject();

  // useAllProjects returns Project[] directly
  const projects = data ?? [];

  // Handlers
  const handleViewProject = useCallback(
    (project: Project) => {
      navigate({ to: '/projects/$projectId', params: { projectId: project.id } });
    },
    [navigate]
  );

  const handleEditProject = useCallback(
    (project: Project) => {
      // Navigate to project detail - edit mode handled on detail page
      navigate({
        to: '/projects/$projectId',
        params: { projectId: project.id },
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

  // Loading state - skeleton handled by route pendingComponent
  // This check is redundant since route handles loading state

  // Error state
  if (error) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Projects" description="Error loading projects" />
        <PageLayout.Content>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load projects</AlertTitle>
            <AlertDescription>
              <p className="mb-3">{error.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
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
          filters={searchParams}
          onFiltersChange={handleFiltersChange}
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
