import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { ServiceLinkageReviewsListContainer } from '@/components/domain/service';
import { serviceLinkageReviewsSearchSchema } from './search-schema';

export const Route = createFileRoute('/_authenticated/support/service-linkage-reviews/')({
  validateSearch: serviceLinkageReviewsSearchSchema,
  component: ServiceLinkageReviewsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Service Linkage Reviews"
        description="Resolve ambiguous owner/system linkage decisions without guessing."
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ServiceLinkageReviewsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Service Linkage Reviews"
        description="Resolve ambiguous owner/system linkage decisions without guessing."
      />
      <PageLayout.Content>
        <ServiceLinkageReviewsListContainer
          search={search}
          onSearchChange={(updates) =>
            navigate({
              search: (prev) => ({
                ...prev,
                ...updates,
                status: updates.status ?? prev.status ?? 'pending',
              }),
            })
          }
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
