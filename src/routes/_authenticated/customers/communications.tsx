/**
 * Customer Communications Route
 *
 * Redirects to customer detail Activity tab (unified timeline).
 * Timeline, templates, and campaigns have been consolidated:
 * - Timeline: Customer Activity tab (emails + activities)
 * - Templates: /communications/emails/templates
 * - Campaigns: /communications/campaigns
 *
 * Component renders when redirect is not applied (e.g. direct navigation with customerId).
 * Route owns PageLayout per STANDARDS.md.
 *
 * @see CRM Communications Workflow plan
 */
import { createFileRoute, Link, redirect, useSearch } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { buttonVariants } from '@/components/ui/button';
import { CommunicationsContainer } from '@/components/domain/customers/containers';

export const Route = createFileRoute('/_authenticated/customers/communications')({
  component: CustomerCommunicationsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    customerId: (search.customerId as string) || undefined,
    tab: (search.tab as string) || undefined,
  }),
  beforeLoad: ({ search }) => {
    const customerId = (search as Record<string, unknown>)?.customerId as string | undefined;

    if (!customerId) {
      throw redirect({ to: '/customers' });
    }

    // Redirect to customer detail with Activity tab (unified timeline)
    throw redirect({
      to: '/customers/$customerId',
      params: { customerId },
      search: { tab: 'activity' },
    });
  },
});

function CustomerCommunicationsPage() {
  const search = useSearch({ from: '/_authenticated/customers/communications' });

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Communications"
        description="Manage customer communications, templates, and campaigns"
        actions={
          <Link
            to="/customers"
            className={buttonVariants({ variant: 'outline' })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        }
      />
      <PageLayout.Content>
        <CommunicationsContainer
          customerId={search.customerId}
          initialTab={search.tab as 'timeline' | 'templates' | 'campaigns' | undefined}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
