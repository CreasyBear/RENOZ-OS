/**
 * Project Detail Route
 *
 * Uses Container/Presenter pattern following Orders gold standard.
 * Container handles data fetching and mutations.
 * Presenter handles UI rendering.
 *
 * Tabbed project detail view with:
 * - Overview (scope, outcomes, features, progress, budget)
 * - Workstreams
 * - Site Visits
 * - Tasks
 * - BOM
 * - Notes
 * - Files
 * - Activity
 *
 * Features:
 * - Collapsible right meta panel with Framer Motion animation
 * - Full-width layout (no max-w-7xl constraint)
 * - MetaChipsRow for horizontal key metadata
 * - Progress visualizations
 * - space-y-10 generous spacing between sections
 *
 * SPRINT-03: New route for project-centric jobs model
 * SPRINT-04: Migrated to Container/Presenter pattern
 * SPRINT-05: Added header metrics, lifecycle progress, tab counts
 *
 * @see STANDARDS.md for route patterns
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback, DetailPageBackButton } from '@/components/layout';
import { ProjectDetailContainer } from '@/components/domain/jobs/projects';
import { ProjectDetailSkeleton } from '@/components/skeletons/projects/project-detail-skeleton';

// ============================================================================
// SEARCH PARAMS SCHEMA
// ============================================================================

const taskFilterSchema = z.object({
  tab: z.enum(['overview', 'workstreams', 'schedule', 'tasks', 'bom', 'notes', 'files', 'documents', 'activity']).optional().default('overview'),
  /** Open meta panel in edit mode when navigating from list */
  edit: z.boolean().optional(),
  // Task filters
  taskStatus: z.string().optional(), // comma-separated: pending,in_progress,completed,blocked
  taskPriority: z.string().optional(), // comma-separated: urgent,high,normal,low
  taskAssignee: z.enum(['all', 'me', 'unassigned']).optional().default('all'),
  taskSort: z.enum(['dueDate', 'priority', 'created', 'title']).optional().default('dueDate'),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/projects/$projectId')({
  component: ProjectDetailPage,
  validateSearch: taskFilterSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/projects" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Project" description="Loading project details..." />
      <PageLayout.Content>
        <ProjectDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProjectDetailPage() {
  const { projectId } = useParams({ from: '/_authenticated/projects/$projectId' });
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <ProjectDetailContainer
      projectId={projectId}
      initialTab={search.tab}
      openEditOnMount={search.edit === true}
      onEditDialogOpenChange={(open) => {
        if (!open && search.edit) {
          navigate({
            to: '/projects/$projectId',
            params: { projectId },
            search: { ...search, edit: undefined },
            replace: true,
          });
        }
      }}
      onBack={() => navigate({ to: '/projects' })}
    >
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/projects" aria-label="Back to projects" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </ProjectDetailContainer>
  );
}
