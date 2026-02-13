/**
 * Financial Invoice Detail Route
 *
 * Single invoice detail view following 5-zone layout pattern.
 * Consolidated into financial domain for unified navigation.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see docs/design-system/INVOICE-STANDARDS.md
 * @see src/routes/_authenticated/invoices/$invoiceId.tsx (original - now redirects here)
 */
import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, RouteErrorFallback, DetailPageBackButton } from "@/components/layout";
import { InvoiceDetailSkeleton } from "@/components/skeletons/invoices";
import { InvoiceDetailContainer } from "@/components/domain/invoices/detail/invoice-detail-container";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/financial/invoices/$invoiceId")({
  component: InvoiceDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial/invoices" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title={null} />
      <PageLayout.Content>
        <InvoiceDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();

  return (
    <InvoiceDetailContainer invoiceId={invoiceId}>
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/financial/invoices" aria-label="Back to invoices" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </InvoiceDetailContainer>
  );
}
