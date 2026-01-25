/**
 * Payment Reminders Page (Container)
 *
 * Manages data fetching and mutations for payment reminder templates.
 * Delegates rendering to PaymentReminders presenter component.
 *
 * @see src/components/domain/financial/payment-reminders.tsx (presenter)
 * @see src/server/functions/financial/payment-reminders.ts
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-002)
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { PaymentReminders } from '@/components/domain/financial/payment-reminders';
import {
  useReminderTemplates,
  useReminderHistory,
  useCreateReminderTemplate,
  useUpdateReminderTemplate,
  useDeleteReminderTemplate,
} from '@/hooks/financial';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/reminders')({
  component: PaymentRemindersPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout>
      <PageLayout.Header
        title="Payment Reminders"
        description="Manage reminder templates and view sending history"
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

function PaymentRemindersPage() {
  // Queries
  const {
    data: templatesData,
    isLoading: templatesLoading,
    error: templatesError,
  } = useReminderTemplates();

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useReminderHistory();

  // Mutations
  const createMutation = useCreateReminderTemplate();
  const updateMutation = useUpdateReminderTemplate();
  const deleteMutation = useDeleteReminderTemplate();

  // Derived state
  const templates = templatesData?.items ?? [];
  const history = historyData?.items ?? [];
  const isLoading = templatesLoading || historyLoading;
  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const error = templatesError || historyError;

  return (
    <PageLayout>
      <PageLayout.Header
        title="Payment Reminders"
        description="Manage reminder templates and view sending history"
      />
      <PageLayout.Content>
        <PaymentReminders
          templates={templates}
          history={history}
          isLoading={isLoading}
          error={error ? String(error) : undefined}
          onCreateTemplate={(data) => createMutation.mutate(data)}
          onUpdateTemplate={(data) => updateMutation.mutate(data)}
          onDeleteTemplate={(id) => deleteMutation.mutate(id)}
          isSaving={isSaving}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
