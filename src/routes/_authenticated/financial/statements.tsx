/**
 * Customer Statements Page (Container)
 *
 * Generate and view customer account statements showing transaction history,
 * outstanding balances, and aging summaries.
 *
 * Container responsibilities:
 * - All data fetching hooks (useQuery, useMutation)
 * - Server function calls via useServerFn
 * - State management for selected statement
 * - Cache invalidation via queryClient
 *
 * @see src/components/domain/financial/customer-statements.tsx (Presenter)
 * @see src/server/functions/statements.ts
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-006)
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { PageLayout } from '@/components/layout/page-layout';
import { CustomerStatements } from '@/components/domain/financial/customer-statements';
import {
  generateStatement,
  listStatements,
  markStatementSent,
} from '@/server/functions/financial/statements';
import type { StatementHistoryRecord } from '@/lib/schemas';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/statements')({
  component: CustomerStatementsPage,
});

// ============================================================================
// PAGE COMPONENT (CONTAINER)
// ============================================================================

function CustomerStatementsPage() {
  // ---------------------------------------------------------------------------
  // Server Functions
  // ---------------------------------------------------------------------------
  const listFn = useServerFn(listStatements);
  const generateFn = useServerFn(generateStatement);
  const markSentFn = useServerFn(markStatementSent);

  // ---------------------------------------------------------------------------
  // Query Client for Cache Invalidation
  // ---------------------------------------------------------------------------
  const queryClient = useQueryClient();

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
  } = useQuery({
    queryKey: ['statements', customerId],
    queryFn: () => listFn({ data: { customerId, page: 1, pageSize: 10 } }),
    enabled: customerId !== 'placeholder-customer-id', // Don't fetch with placeholder
  });

  const statements: StatementHistoryRecord[] = data?.items ?? [];

  // Derive selected statement from ID
  const selectedStatement = selectedStatementId
    ? statements.find((s) => s.id === selectedStatementId)
    : statements[0];

  // ---------------------------------------------------------------------------
  // Mutations - Generate Statement
  // ---------------------------------------------------------------------------
  const generateMutation = useMutation({
    mutationFn: (params: { dateFrom: string; dateTo: string }) =>
      generateFn({
        data: {
          customerId,
          startDate: params.dateFrom, // Already in YYYY-MM-DD format
          endDate: params.dateTo, // Already in YYYY-MM-DD format
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements', customerId] });
    },
  });

  // ---------------------------------------------------------------------------
  // Mutations - Mark Statement Sent (Email)
  // ---------------------------------------------------------------------------
  const emailMutation = useMutation({
    mutationFn: (statementId: string) =>
      markSentFn({ data: { statementId, sentToEmail: '' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements', customerId] });
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleGenerate = (dateFrom: string, dateTo: string) => {
    generateMutation.mutate({ dateFrom, dateTo });
  };

  const handleEmail = (statementId: string) => {
    emailMutation.mutate(statementId);
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
