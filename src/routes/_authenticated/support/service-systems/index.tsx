import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { ServiceSystemsListContainer } from '@/components/domain/service';
import { serviceSystemsSearchSchema } from './search-schema';

export const Route = createFileRoute('/_authenticated/support/service-systems/')({
  validateSearch: serviceSystemsSearchSchema,
  component: ServiceSystemsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Service Systems"
        description="Browse canonical installed-system records and ownership context."
      />
      <PageLayout.Content>
        <SupportTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ServiceSystemsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Service Systems"
        description="Browse canonical installed-system records and ownership context."
      />
      <PageLayout.Content>
        <ServiceSystemsListContainer
          search={search}
          onSearchChange={(updates) =>
            navigate({
              search: (prev) => ({
                ...prev,
                ...updates,
              }),
            })
          }
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
