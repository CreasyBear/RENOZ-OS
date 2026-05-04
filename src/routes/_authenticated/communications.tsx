import { createFileRoute, Outlet } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { CommunicationsNav } from './communications/communications-nav';

export const Route = createFileRoute('/_authenticated/communications')({
  component: CommunicationsLayout,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

function CommunicationsLayout() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Communications"
        description="Inbox, campaigns, templates, scheduled sends, and customer outreach"
      />
      <PageLayout.Content className="space-y-6">
        <CommunicationsNav />
        <Outlet />
      </PageLayout.Content>
    </PageLayout>
  );
}
