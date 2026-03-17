/**
 * Customer Detail Route
 *
 * Shows the Customer Detail View - a comprehensive dashboard for a single customer.
 * Uses the simplified container pattern with useCustomerDetail hook.
 *
 * LAYOUT: full-width (data-rich detail view with 360 widgets)
 *
 * Search convention: tab uses Zod 4 .default().catch() for resilience.
 * - Default tab: use search={{}} when navigating (receives 'overview')
 * - Specific tab: use search={{ tab: 'activity' }} etc.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback, DetailPageBackButton } from '@/components/layout';
import { CustomerDetailSkeleton } from '@/components/skeletons/customers';
import { CustomerDetailContainer } from '@/components/domain/customers';
import { customerDetailSearchSchema } from '@/lib/schemas/customers';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/customers/$customerId')({
  validateSearch: customerDetailSearchSchema,
  component: CustomerDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title={null} />
      <PageLayout.Content>
        <CustomerDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const search = Route.useSearch();

  return (
    <CustomerDetailContainer
      customerId={customerId}
      initialTab={search.tab}
    >
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/customers" aria-label="Back to customers" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </CustomerDetailContainer>
  );
}
