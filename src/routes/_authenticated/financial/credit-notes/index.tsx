/**
 * Credit Notes Page (Container)
 *
 * View and manage credit notes issued to customers, including application
 * to invoices and refund processing.
 *
 * Container responsibilities:
 * - URL state sync for filters
 * - Create dialog state
 * - Pass filters and handlers to container component
 *
 * @see src/components/domain/financial/credit-notes-list-container.tsx
 * @see src/server/functions/financial/credit-notes.tsx
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-005)
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { CreditNotesListContainer } from '@/components/domain/financial/credit-notes-list-container';
import { CreateCreditNoteDialog } from '@/components/domain/financial/credit-note-dialogs';
import {
  DEFAULT_CREDIT_NOTE_FILTERS,
  type CreditNoteFiltersState,
} from '@/components/domain/financial/credit-note-filter-config';
import { useCreateCreditNote, useIssueCreditNote } from '@/hooks/financial';
import { toast } from '@/lib/toast';
import type { CreateCreditNoteInput } from '@/lib/schemas/financial/credit-notes';

// ============================================================================
// URL SEARCH PARAMS SCHEMA
// ============================================================================

const searchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['draft', 'issued', 'applied', 'voided']).optional(),
  customerId: z.string().optional(),
});

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/credit-notes/')({
  component: CreditNotesPage,
  validateSearch: searchSchema,
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
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Convert URL params to filter state
  const filters = useMemo<CreditNoteFiltersState>(
    () => ({
      search: search.search ?? DEFAULT_CREDIT_NOTE_FILTERS.search,
      status: search.status ?? DEFAULT_CREDIT_NOTE_FILTERS.status,
      customerId: search.customerId ?? DEFAULT_CREDIT_NOTE_FILTERS.customerId,
    }),
    [search]
  );

  // Update URL when filters change
  const handleFiltersChange = useCallback(
    (newFilters: CreditNoteFiltersState) => {
      navigate({
        to: '/financial/credit-notes',
        search: {
          search: newFilters.search || undefined,
          status: newFilters.status || undefined,
          customerId: newFilters.customerId || undefined,
        },
      });
    },
    [navigate]
  );

  // Mutations for create dialog
  const createMutation = useCreateCreditNote();
  const issueMutation = useIssueCreditNote();

  // Handle create credit note
  const handleCreate = useCallback(
    (input: CreateCreditNoteInput) => {
      createMutation.mutate(input, {
        onSuccess: (creditNote) => {
          setCreateDialogOpen(false);
          toast.success('Credit note created successfully', {
            description: `Credit note ${creditNote.creditNoteNumber} is ready to issue.`,
            action: {
              label: 'Issue Now',
              onClick: () => issueMutation.mutate(creditNote.id),
            },
          });
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to create credit note');
        },
      });
    },
    [createMutation, issueMutation]
  );

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Credit Notes"
        description="Customer credit notes and refund management"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Credit Note
          </Button>
        }
      />
      <PageLayout.Content>
        <CreditNotesListContainer
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onCreateCreditNote={() => setCreateDialogOpen(true)}
        />

        {/* Create Credit Note Dialog */}
        <CreateCreditNoteDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreate={handleCreate}
          isPending={createMutation.isPending}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
