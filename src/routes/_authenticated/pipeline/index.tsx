/**
 * Pipeline Index Route
 *
 * Main pipeline kanban board page for managing sales opportunities.
 * Uses PipelineKanbanContainer for data fetching and business logic.
 * Nav grid removed per DOMAIN-LANDING-STANDARDS; More dropdown in header.
 *
 * @see STANDARDS.md - Routes must not call useQuery/useMutation directly
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Download, ChevronDown, BarChart3, Trophy } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { PipelineKanbanSkeleton } from "@/components/skeletons/pipeline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            More <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="p-0">
            <Link to="/reports/pipeline-forecast" className="flex w-full items-center px-2 py-1.5">
              <BarChart3 className="h-4 w-4 mr-2" />
              Forecasting
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="p-0">
            <Link to="/reports/win-loss" className="flex w-full items-center px-2 py-1.5">
              <Trophy className="h-4 w-4 mr-2" />
              Win/Loss Analysis
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
      <PageLayout.Content className="space-y-6">
        <PipelineKanbanContainer />
      </PageLayout.Content>
    </PageLayout>
  );
}
