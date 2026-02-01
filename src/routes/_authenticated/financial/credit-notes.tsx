/**
 * Credit Notes Page (Container)
 *
 * View and manage credit notes issued to customers, including application
 * to invoices and refund processing.
 *
 * Container responsibilities:
 * - All data fetching (useQuery)
 * - All mutations (useMutation)
 * - Cache invalidation
 * - Pass data and handlers to presenter
 *
 * @see src/components/domain/financial/credit-notes-list.tsx (presenter)
 * @see src/server/functions/financial/credit-notes.ts
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-005)
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { CreditNotesList } from '@/components/domain/financial/credit-notes-list';
import {
  useCreditNotes,
  useCreateCreditNote,
  useApplyCreditNote,
  useIssueCreditNote,
  useVoidCreditNote,
} from '@/hooks/financial';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/credit-notes')({
  component: CreditNotesPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Credit Notes"
        description="Customer credit notes and refund management"
      />
      <PageLayout.Content>
        <FinancialTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT (CONTAINER)
// ============================================================================

function CreditNotesPage() {
  // Query for listing credit notes
  const {
    data,
    isLoading,
    error,
  } = useCreditNotes({ page: 1, pageSize: 50 });

  // Create mutation using centralized hook
  const createMutation = useCreateCreditNote();

  // Issue mutation using centralized hook
  const issueMutation = useIssueCreditNote();

  // Apply to invoice mutation
  const applyMutation = useApplyCreditNote();

  // Void mutation using centralized hook
  const voidMutation = useVoidCreditNote();

  // Combined pending state
  const isMutating =
    createMutation.isPending ||
    issueMutation.isPending ||
    applyMutation.isPending ||
    voidMutation.isPending;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Credit Notes"
        description="Customer credit notes and refund management"
      />
      <PageLayout.Content>
        <CreditNotesList
          creditNotes={(data?.items ?? []) as any}
          isLoading={isLoading}
          error={error instanceof Error ? error : error ? new Error('Unknown error') : null}
          onCreate={(input) => createMutation.mutate(input)}
          onIssue={(id) => issueMutation.mutate(id)}
          onApply={(creditNoteId, orderId) => applyMutation.mutate({ creditNoteId, orderId })}
          onVoid={(id) => voidMutation.mutate({ id })}
          isMutating={isMutating}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
