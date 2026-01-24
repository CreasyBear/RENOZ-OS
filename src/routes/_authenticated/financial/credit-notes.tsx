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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { CreditNotesList } from '@/components/domain/financial/credit-notes-list';
import {
  listCreditNotes,
  createCreditNote,
  issueCreditNote,
  applyCreditNoteToInvoice,
  voidCreditNote,
} from '@/server/functions/financial/credit-notes';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/credit-notes')({
  component: CreditNotesPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout>
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
  const queryClient = useQueryClient();

  // Server functions
  const listFn = useServerFn(listCreditNotes);
  const createFn = useServerFn(createCreditNote);
  const issueFn = useServerFn(issueCreditNote);
  const applyFn = useServerFn(applyCreditNoteToInvoice);
  const voidFn = useServerFn(voidCreditNote);

  // Query for listing credit notes
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['credit-notes', undefined],
    queryFn: () => listFn({ data: { page: 1, pageSize: 50 } }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (input: {
      customerId: string;
      orderId?: string;
      amount: number;
      reason: string;
    }) => createFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
    },
  });

  // Issue mutation
  const issueMutation = useMutation({
    mutationFn: (id: string) => issueFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
    },
  });

  // Apply to invoice mutation
  const applyMutation = useMutation({
    mutationFn: ({ creditNoteId, orderId }: { creditNoteId: string; orderId: string }) =>
      applyFn({ data: { creditNoteId, orderId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
    },
  });

  // Void mutation
  const voidMutation = useMutation({
    mutationFn: (id: string) => voidFn({ data: { id, voidReason: 'Voided by user' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
    },
  });

  // Combined pending state
  const isMutating =
    createMutation.isPending ||
    issueMutation.isPending ||
    applyMutation.isPending ||
    voidMutation.isPending;

  return (
    <PageLayout>
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
          onVoid={(id) => voidMutation.mutate(id)}
          isMutating={isMutating}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
