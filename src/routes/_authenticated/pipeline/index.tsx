/**
 * Pipeline Index Route
 *
 * Main pipeline kanban board page for managing sales opportunities.
 * Uses PipelineKanbanContainer for data fetching and business logic.
 *
 * @see STANDARDS.md - Routes must not call useQuery/useMutation directly
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Download } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { PipelineKanbanSkeleton } from "@/components/skeletons/pipeline";
import { Button, buttonVariants } from "@/components/ui/button";
import { PipelineKanbanContainer } from "@/components/domain/pipeline";
import { cn } from "@/lib/utils";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/pipeline/")({
  component: PipelinePage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Pipeline"
        description="Track and manage your sales opportunities"
      />
      <PageLayout.Content>
        <PipelineKanbanSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE HEADER ACTIONS COMPONENT
// ============================================================================

function PageHeaderActions() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
      <Link
        to="/pipeline/new"
        search={{ stage: undefined }}
        className={cn(buttonVariants({ size: "sm" }))}
      >
        <Plus className="h-4 w-4 mr-2" />
        New Opportunity
      </Link>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function PipelinePage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Pipeline"
        description="Track and manage your sales opportunities"
        actions={<PageHeaderActions />}
      />
      <PageLayout.Content>
        <PipelineKanbanContainer />
      </PageLayout.Content>
    </PageLayout>
  );
}
