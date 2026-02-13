/**
 * Customer Statements Page (Container)
 *
 * Generate and view customer account statements showing transaction history,
 * outstanding balances, and aging summaries.
 *
 * Container responsibilities:
 * - All data fetching hooks (useQuery, useMutation)
 * - State management for selected customer and statement
 * - Customer selection via CustomerSelectorContainer
 * - URL search param persistence for selected customer
 *
 * @see src/components/domain/financial/customer-statements.tsx (Presenter)
 * @see src/hooks/financial/use-financial.ts
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-006)
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-007)
 */

import { useState, useCallback, useEffect, startTransition } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { CustomerStatements } from '@/components/domain/financial/customer-statements';
import { CustomerSelectorContainer } from '@/components/domain/orders/creation/customer-selector-container';
import type { SelectedCustomer } from '@/components/domain/orders/creation/customer-selector';
import {
  useStatements,
  useGenerateStatement,
  useMarkStatementSent,
} from '@/hooks/financial';
import type { StatementHistoryRecord } from '@/lib/schemas';

// ============================================================================
// URL SEARCH PARAMS SCHEMA
// ============================================================================

const searchSchema = z.object({
  customerId: z.string().optional(),
});

// Type inferred from schema for potential future use
// type SearchParams = z.infer<typeof searchSchema>;

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/statements')({
  validateSearch: searchSchema,
  component: CustomerStatementsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customer Statements"
        description="Generate and view customer account statements"
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

/**
 * Customer Statements Page Container
 * @source selectedCustomer from useState + URL params + CustomerSelectorContainer
 * @source statements from useStatements hook
 * @source generateMutation from useGenerateStatement hook
 * @source emailMutation from useMarkStatementSent hook
 */
function CustomerStatementsPage() {
  // ---------------------------------------------------------------------------
  // Navigation & URL Params
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();
  const { customerId: urlCustomerId } = Route.useSearch();

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  const customerId = selectedCustomer?.id ?? urlCustomerId ?? null;
  const customerName = selectedCustomer?.name ?? 'Select a Customer';

  // ---------------------------------------------------------------------------
  // Data Fetching - List Statements
  // ---------------------------------------------------------------------------
  const {
    data,
    isLoading,
    error,
  } = useStatements({
    customerId: customerId ?? '',
    page: 1,
    pageSize: 10,
    enabled: !!customerId,
  });

  const statements: StatementHistoryRecord[] = data?.items ?? [];

  // Derive selected statement from ID
  const selectedStatement = selectedStatementId
    ? statements.find((s) => s.id === selectedStatementId)
    : statements[0];

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const generateMutation = useGenerateStatement();
  const emailMutation = useMarkStatementSent();

  // Sync URL with local state when URL changes externally (e.g. back/forward).
  // Defer via startTransition to avoid synchronous setState in effect.
  useEffect(() => {
    if (urlCustomerId && selectedCustomer && selectedCustomer.id !== urlCustomerId) {
      startTransition(() => {
        setSelectedCustomer(null);
        setSelectedStatementId(null);
      });
    }
  }, [urlCustomerId, selectedCustomer]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSelectCustomer = useCallback((customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);
    setSelectedStatementId(null); // Reset statement selection when customer changes
    
    // Persist selection in URL
    navigate({
      to: '/financial/statements',
      search: { customerId: customer?.id },
      replace: true, // Use replace to avoid cluttering history
    });
  }, [navigate]);

  const handleGenerate = useCallback(
    (dateFrom: string, dateTo: string) => {
      if (!customerId) return;
      generateMutation.mutate(
        { customerId, dateFrom, dateTo },
        {
          onSuccess: (result) => {
            if (result?.historyId) {
              setSelectedStatementId(result.historyId);
            }
          },
        }
      );
    },
    [customerId, generateMutation]
  );

  const handleEmail = useCallback((statementId: string) => {
    if (!customerId) return;
    emailMutation.mutate({ statementId, sentToEmail: '', customerId });
  }, [customerId, emailMutation]);

  const handleSelectStatement = useCallback((id: string | null) => {
    setSelectedStatementId(id);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customer Statements"
        description="Generate and view customer account statements"
      />
      <PageLayout.Content>
        {/* Customer Selector */}
        <div className="mb-6">
          <CustomerSelectorContainer
            selectedCustomerId={customerId}
            onSelect={handleSelectCustomer}
          />
        </div>

        {/* Statements List */}
        <CustomerStatements
          customerId={customerId ?? ''}
          customerName={customerName}
          statements={statements}
          selectedStatement={selectedStatement}
          isLoading={isLoading}
          error={error}
          onGenerate={handleGenerate}
          isGenerating={generateMutation.isPending}
          onEmail={handleEmail}
          isEmailing={emailMutation.isPending}
          onSelectStatement={handleSelectStatement}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
