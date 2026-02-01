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
 *
 * @see STANDARDS.md for route patterns
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { ProjectDetailContainer } from '@/components/domain/jobs/projects';

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
// MAIN COMPONENT
// ============================================================================

function ProjectDetailPage() {
  const { projectId } = useParams({ from: '/_authenticated/projects/$projectId' });
  const navigate = useNavigate();

  // Handlers
  const handleBack = useCallback(() => {
    navigate({ to: '/projects' });
  }, [navigate]);

  return (
    <ProjectDetailContainer
      projectId={projectId}
      onBack={handleBack}
    >
      {({ headerTitle, headerActions, content }) => (
        <div className="flex h-full flex-col">
          <PageLayout variant="full-width">
            {/* Header */}
            <PageLayout.Header
              title={
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {headerTitle}
                </div>
              }
              actions={headerActions}
            />

            {/* Content */}
            <PageLayout.Content className="p-0 flex-1">
              {content}
            </PageLayout.Content>
          </PageLayout>
        </div>
      )}
    </ProjectDetailContainer>
  );
}
