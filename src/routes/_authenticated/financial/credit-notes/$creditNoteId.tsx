/**
 * Credit Note Detail Route
 *
 * Single credit note detail view.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/server/functions/financial/credit-notes.tsx (getCreditNote)
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback, DetailPageBackButton } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { CreditNoteDetailContainer } from '@/components/domain/financial/credit-note-detail-container';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/credit-notes/$creditNoteId')({
  component: CreditNoteDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial/credit-notes" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title={null} />
      <PageLayout.Content>
        <FinancialTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function CreditNoteDetailPage() {
  const { creditNoteId } = Route.useParams();

  return (
    <CreditNoteDetailContainer creditNoteId={creditNoteId}>
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/financial/credit-notes" aria-label="Back to credit notes" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </CreditNoteDetailContainer>
  );
}
