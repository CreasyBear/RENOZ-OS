import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { ServiceSystemDetailContainer } from '@/components/domain/service';

export const Route = createFileRoute('/_authenticated/support/service-systems/$serviceSystemId')({
  component: ServiceSystemDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Service System" description="Loading installed system context..." />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ServiceSystemDetailPage() {
  const { serviceSystemId } = Route.useParams();
  return (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <ServiceSystemDetailContainer serviceSystemId={serviceSystemId} />
      </PageLayout.Content>
    </PageLayout>
  );
}
