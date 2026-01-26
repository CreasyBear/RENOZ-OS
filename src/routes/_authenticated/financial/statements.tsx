/**
 * Customer Statements Page (Container)
 *
 * Generate and view customer account statements showing transaction history,
 * outstanding balances, and aging summaries.
 *
 * Container responsibilities:
 * - All data fetching hooks (useQuery, useMutation)
 * - State management for selected statement
 *
 * @see src/components/domain/financial/customer-statements.tsx (Presenter)
 * @see src/hooks/financial/use-financial.ts
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-006)
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { CustomerStatements } from '@/components/domain/financial/customer-statements';
import {
  useStatements,
  useGenerateStatement,
  useMarkStatementSent,
} from '@/hooks/financial';
import type { StatementHistoryRecord } from '@/lib/schemas';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/statements')({
  component: CustomerStatementsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout>
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

function CustomerStatementsPage() {
  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------
  // TODO: In a real implementation, customerId would come from route params
  // or a customer selector. For now, we use a placeholder.
  const [customerId] = useState<string>('placeholder-customer-id');
  const [customerName] = useState<string>('Select a Customer');
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data Fetching - List Statements
  // ---------------------------------------------------------------------------
  const {
    data,
    isLoading,
    error,
  } = useStatements({
    customerId,
    page: 1,
    pageSize: 10,
    enabled: customerId !== 'placeholder-customer-id',
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

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleGenerate = (dateFrom: string, dateTo: string) => {
    generateMutation.mutate({ customerId, dateFrom, dateTo });
  };

  const handleEmail = (statementId: string) => {
    emailMutation.mutate({ statementId, sentToEmail: '', customerId });
  };

  const handleSelectStatement = (id: string | null) => {
    setSelectedStatementId(id);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PageLayout>
      <PageLayout.Header
        title="Customer Statements"
        description="Generate and view customer account statements"
      />
      <PageLayout.Content>
        <CustomerStatements
          customerId={customerId}
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
