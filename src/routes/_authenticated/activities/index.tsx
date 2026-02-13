/**
 * Activities Feed Route
 *
 * Organization-wide activity feed with filtering, infinite scroll,
 * and date grouping. Deep-linkable via URL search params.
 *
 * @see ACTIVITY-FEED-UI acceptance criteria
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { RouteErrorFallback, PageLayout } from "@/components/layout";
import { AdminTableSkeleton } from "@/components/skeletons/admin";
import { ActivityFeed, type ActivityFiltersValue } from "@/components/shared/activity";
import {
  activityActionSchema,
  activityEntityTypeSchema,
} from "@/lib/schemas/activities";

// ============================================================================
// ROUTE SEARCH PARAMS VALIDATION
// ============================================================================

const activitySearchSchema = z.object({
  entityType: activityEntityTypeSchema.optional().catch(undefined),
  action: activityActionSchema.optional().catch(undefined),
  userId: z.string().optional().catch(undefined),
  dateFrom: z.coerce.date().optional().catch(undefined),
  dateTo: z.coerce.date().optional().catch(undefined),
});

export type ActivitySearch = z.infer<typeof activitySearchSchema>;

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/activities/")({
  validateSearch: activitySearchSchema,
  component: ActivitiesPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ActivitiesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Sync filter changes to URL for deep-linking
  const handleFiltersChange = (filters: ActivityFiltersValue) => {
    navigate({
      to: ".",
      search: {
        entityType: filters.entityType,
        action: filters.action,
        userId: filters.userId,
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
      },
      replace: true, // Don't add to history for every filter change
    });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Activity Feed"
        description="See all organization activity in one place"
      />
      <PageLayout.Content className="flex flex-col overflow-hidden h-[calc(100vh-10rem)]">
        <ActivityFeed
          filters={{
            entityType: search.entityType,
            action: search.action,
            userId: search.userId,
            dateFrom: search.dateFrom,
            dateTo: search.dateTo,
          }}
          onFiltersChange={handleFiltersChange}
          showFilters
          className="flex-1 min-h-0"
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
