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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { PageLayout } from '@/components/layout/page-layout';
import { PaymentReminders } from '@/components/domain/financial/payment-reminders';
import {
  listReminderTemplates,
  createReminderTemplate,
  updateReminderTemplate,
  deleteReminderTemplate,
  getReminderHistory,
} from '@/server/functions/financial/payment-reminders';
import type {
  CreateReminderTemplateInput,
  UpdateReminderTemplateInput,
} from '@/lib/schemas';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/reminders')({
  component: PaymentRemindersPage,
});

// ============================================================================
// PAGE COMPONENT (CONTAINER)
// ============================================================================

function PaymentRemindersPage() {
  const queryClient = useQueryClient();

  // Server function wrappers
  const listTemplatesFn = useServerFn(listReminderTemplates);
  const createTemplateFn = useServerFn(createReminderTemplate);
  const updateTemplateFn = useServerFn(updateReminderTemplate);
  const deleteTemplateFn = useServerFn(deleteReminderTemplate);
  const getHistoryFn = useServerFn(getReminderHistory);

  // Queries
  const {
    data: templatesData,
    isLoading: templatesLoading,
    error: templatesError,
  } = useQuery({
    queryKey: ['reminder-templates'],
    queryFn: () => listTemplatesFn({ data: {} }),
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['reminder-history'],
    queryFn: () => getHistoryFn({ data: { page: 1, pageSize: 50 } }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateReminderTemplateInput) => createTemplateFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateReminderTemplateInput) => updateTemplateFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplateFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
    },
  });

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
