/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Pipeline New Route
 *
 * Route definition for creating a new opportunity.
 * Uses lazy loading for code splitting to reduce initial bundle size.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/pipeline/new-opportunity-page.tsx
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// SEARCH PARAMS SCHEMA
// ============================================================================

export const searchParamsSchema = z.object({
  stage: z.enum(['new', 'qualified', 'proposal', 'negotiation']).optional(),
  customerId: z.string().uuid().optional().catch(undefined),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// ============================================================================
// LAZY LOAD PAGE COMPONENT
// ============================================================================

const NewOpportunityPage = lazy(() => import('./new-opportunity-page'));

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/pipeline/new')({
  validateSearch: searchParamsSchema,
  component: function PipelineNewRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense
        fallback={
          <PageLayout variant="full-width">
            <PageLayout.Header
              title="New Opportunity"
              description="Create a new opportunity in your pipeline"
            />
            <PageLayout.Content>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </PageLayout.Content>
          </PageLayout>
        }
      >
        <NewOpportunityPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/pipeline" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="New Opportunity"
        description="Create a new opportunity in your pipeline"
      />
      <PageLayout.Content>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});
