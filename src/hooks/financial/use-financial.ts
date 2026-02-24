/**
 * Financial Hooks
 *
 * TanStack Query hooks for financial data fetching:
 * - Dashboard metrics (KPIs, revenue, AR, payments, GST)
 * - AR Aging reports with customer breakdown
 * - Payment reminders and templates
 * - Revenue recognition tracking
 * - Xero invoice sync status
 * - Credit notes and payment schedules
 *
 * @see src/server/functions/financial/financial-dashboard.ts
 * @see src/server/functions/financial/ar-aging.ts
 * @see src/server/functions/financial/payment-reminders.ts
 * @see src/server/functions/financial/revenue-recognition.ts
 * @see src/server/functions/financial/xero-invoice-sync.ts
 * @see src/server/functions/financial/credit-notes.ts
 * @see src/server/functions/financial/payment-schedules.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';

// Dashboard
import {
  getFinancialDashboardMetrics,
  getFinancialCloseReadiness,
  getRevenueByPeriod,
  getTopCustomersByRevenue,
  getOutstandingInvoices,
} from '@/server/functions/financial/financial-dashboard';
import type { PeriodType } from '@/lib/schemas';

// AR Aging
import { getARAgingReport, getARAgingCustomerDetail } from '@/server/functions/financial/ar-aging';
import type { ARAgingReportQuery } from '@/lib/schemas';

// Payment Reminders
import {
  listReminderTemplates,
  createReminderTemplate,
  updateReminderTemplate,
  deleteReminderTemplate,
  sendReminder,
  getReminderHistory,
  getOrdersForReminders,
} from '@/server/functions/financial/payment-reminders';
import type {
  CreateReminderTemplateInput,
  UpdateReminderTemplateInput,
  SendReminderInput,
} from '@/lib/schemas';

// Revenue Recognition
import {
  listRecognitionsByState,
  getRecognitionSummary,
  getDeferredRevenueBalance,
  retryRecognitionSync,
} from '@/server/functions/financial/revenue-recognition';
import type { RecognitionState } from '@/lib/schemas';

// Xero Sync
import {
  listInvoicesBySyncStatus,
  getInvoiceXeroStatus,
  resyncInvoiceToXero,
} from '@/server/functions/financial/xero-invoice-sync';

// Credit Notes
import {
  listCreditNotes,
  getCreditNote,
  createCreditNote,
  applyCreditNoteToInvoice,
  issueCreditNote,
  voidCreditNote,
  generateCreditNotePdf,
} from '@/server/functions/financial/credit-notes';
import type { CreateCreditNoteInput, ApplyCreditNoteInput } from '@/lib/schemas';

// Payment Schedules
import {
  getPaymentSchedule,
  createPaymentPlan,
  updateInstallment,
  recordInstallmentPayment,
} from '@/server/functions/financial/payment-schedules';
import type { CreatePaymentPlanInput } from '@/lib/schemas';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// FINANCIAL DASHBOARD HOOKS
// ============================================================================

export interface UseFinancialDashboardMetricsOptions {
  includePreviousPeriod?: boolean;
  enabled?: boolean;
}

/**
 * Fetch comprehensive financial dashboard metrics.
 * Includes revenue MTD/YTD, AR balance, cash received, GST collected.
 */
export function useFinancialDashboardMetrics(options: UseFinancialDashboardMetricsOptions = {}) {
  const { enabled = true, includePreviousPeriod = true } = options;
  const fn = useServerFn(getFinancialDashboardMetrics);

  return useQuery({
    queryKey: queryKeys.financial.dashboardMetrics({ includePreviousPeriod }),
    queryFn: async () => {
      const result = await fn({ data: { includePreviousPeriod } });
      if (result == null) throw new Error('Financial dashboard metrics returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Finance close-readiness guard (hard gates for period close / release).
 */
export function useFinancialCloseReadiness(enabled = true) {
  const fn = useServerFn(getFinancialCloseReadiness);
  return useQuery({
    queryKey: queryKeys.financial.closeReadiness(),
    queryFn: async () => {
      const result = await fn({ data: undefined });
      if (result == null) throw new Error('Financial close readiness returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export interface UseRevenueByPeriodOptions {
  dateFrom: Date;
  dateTo: Date;
  periodType: PeriodType;
  customerType?: 'residential' | 'commercial';
  enabled?: boolean;
}

/**
 * Fetch revenue breakdown by time period.
 * Supports daily, weekly, monthly, quarterly, yearly periods.
 * Includes residential vs commercial breakdown.
 */
export function useRevenueByPeriod(options: UseRevenueByPeriodOptions) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getRevenueByPeriod);

  return useQuery({
    queryKey: queryKeys.financial.revenueByPeriod(params.periodType, {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      customerType: params.customerType,
    }),
    queryFn: async () => {
      const result = await fn({ data: params });
      if (result == null) throw new Error('Revenue report returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export interface UseTopCustomersByRevenueOptions {
  dateFrom?: Date;
  dateTo?: Date;
  commercialOnly?: boolean;
  pageSize?: number;
  page?: number;
  /** Revenue basis: invoiced (orders) or cash (payments received) */
  basis?: 'invoiced' | 'cash';
  enabled?: boolean;
}

/**
 * Fetch top customers by revenue.
 * Highlights commercial accounts ($50K+).
 */
export function useTopCustomersByRevenue(options: UseTopCustomersByRevenueOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getTopCustomersByRevenue);

  return useQuery({
    queryKey: queryKeys.financial.topCustomers({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      commercialOnly: params.commercialOnly,
      pageSize: params.pageSize,
      basis: params.basis,
    }),
    queryFn: async () => {
      const result = await fn({ data: params });
      if (result == null) throw new Error('Top customers by revenue returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export interface UseOutstandingInvoicesOptions {
  overdueOnly?: boolean;
  customerType?: 'residential' | 'commercial';
  pageSize?: number;
  page?: number;
  enabled?: boolean;
}

/**
 * Fetch outstanding invoices with summary statistics.
 * Optionally filtered by overdue status or customer type.
 */
export function useOutstandingInvoices(options: UseOutstandingInvoicesOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getOutstandingInvoices);

  return useQuery({
    queryKey: queryKeys.financial.outstandingInvoices({
      overdueOnly: params.overdueOnly,
      customerType: params.customerType,
      pageSize: params.pageSize,
    }),
    queryFn: async () => {
      const result = await fn({ data: params });
      if (result == null) throw new Error('Outstanding invoices returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// AR AGING HOOKS
// ============================================================================

export interface UseARAgingReportOptions extends Partial<ARAgingReportQuery> {
  enabled?: boolean;
}

export function useARAgingReport(options: UseARAgingReportOptions = {}) {
  const { enabled = true, ...filters } = options;
  const fn = useServerFn(getARAgingReport);

  return useQuery({
    queryKey: queryKeys.financial.arAgingReport(filters),
    queryFn: async () => {
      const result = await fn({ data: filters });
      if (result == null) throw new Error('AR aging report returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCustomerAgingDetail(customerId: string, enabled = true) {
  const fn = useServerFn(getARAgingCustomerDetail);

  return useQuery({
    queryKey: queryKeys.financial.arAgingCustomer(customerId),
    queryFn: async () => {
      const result = await fn({ data: { customerId } });
      if (result == null) throw new Error('Customer aging detail returned no data');
      return result;
    },
    enabled: enabled && !!customerId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// PAYMENT REMINDER HOOKS
// ============================================================================

export function useReminderTemplates() {
  const fn = useServerFn(listReminderTemplates);

  return useQuery({
    queryKey: queryKeys.financial.reminderTemplates(),
    queryFn: async () => {
      const result = await fn({ data: {} });
      if (result == null) throw new Error('Reminder templates returned no data');
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateReminderTemplate() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createReminderTemplate);

  return useMutation({
    mutationFn: (data: CreateReminderTemplateInput) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminderTemplates() });
    },
  });
}

export function useUpdateReminderTemplate() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateReminderTemplate);

  return useMutation({
    mutationFn: (data: UpdateReminderTemplateInput & { id: string }) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminderTemplates() });
    },
  });
}

export function useDeleteReminderTemplate() {
  const queryClient = useQueryClient();
  const fn = useServerFn(deleteReminderTemplate);

  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminderTemplates() });
    },
  });
}

export function useSendPaymentReminder() {
  const queryClient = useQueryClient();
  const fn = useServerFn(sendReminder);

  return useMutation({
    mutationFn: (data: SendReminderInput) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminders() });
    },
  });
}

export interface UseOrdersForRemindersOptions {
  page?: number;
  pageSize?: number;
  minDaysOverdue?: number;
  matchTemplateDays?: boolean;
  excludeAlreadyReminded?: boolean;
  enabled?: boolean;
}

/**
 * Fetch orders that are due for payment reminders.
 */
export function useOrdersForReminders(options: UseOrdersForRemindersOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(getOrdersForReminders);

  return useQuery({
    queryKey: queryKeys.financial.ordersForReminders(params),
    queryFn: async () => {
      const result = await fn({ data: params });
      if (result == null) throw new Error('Orders for reminders returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export interface UseReminderHistoryOptions {
  orderId?: string;
  customerId?: string;
  enabled?: boolean;
}

export function useReminderHistory(options: UseReminderHistoryOptions = {}) {
  const { enabled = true, ...filters } = options;
  const fn = useServerFn(getReminderHistory);

  return useQuery({
    queryKey: queryKeys.financial.reminderHistory(filters),
    queryFn: async () => {
      const result = await fn({ data: filters });
      if (result == null) throw new Error('Reminder history returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// REVENUE RECOGNITION HOOKS
// ============================================================================

export interface UseRecognitionsOptions {
  state?: RecognitionState;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useRecognitions(options: UseRecognitionsOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(listRecognitionsByState);

  return useQuery({
    queryKey: queryKeys.financial.recognitions(params.state),
    queryFn: async () => {
      const result = await fn({ data: params });
      if (result == null) throw new Error('Revenue recognitions returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export interface UseRecognitionSummaryOptions {
  dateFrom: Date;
  dateTo: Date;
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  enabled?: boolean;
}

export function useRecognitionSummary(options: UseRecognitionSummaryOptions) {
  const { enabled = true, dateFrom, dateTo, groupBy } = options;
  const fn = useServerFn(getRecognitionSummary);

  return useQuery({
    queryKey: queryKeys.financial.recognitionSummary(dateFrom.toISOString(), dateTo.toISOString()),
    queryFn: async () => {
      const result = await fn({ data: { dateFrom, dateTo, groupBy } });
      if (result == null) throw new Error('Recognition summary returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useDeferredRevenueBalance() {
  const fn = useServerFn(getDeferredRevenueBalance);

  return useQuery({
    queryKey: queryKeys.financial.deferredBalance(),
    queryFn: async () => {
      const result = await fn({ data: {} });
      if (result == null) throw new Error('Deferred revenue balance returned no data');
      return result;
    },
    staleTime: 60 * 1000,
  });
}

export function useRetryRecognitionSync() {
  const queryClient = useQueryClient();
  const fn = useServerFn(retryRecognitionSync);

  return useMutation({
    mutationFn: (recognitionId: string) => fn({ data: { recognitionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.revenue() });
    },
  });
}

// ============================================================================
// XERO SYNC HOOKS
// ============================================================================

export interface UseXeroSyncsOptions {
  status?: 'pending' | 'syncing' | 'synced' | 'error';
  errorsOnly?: boolean;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useXeroSyncs(options: UseXeroSyncsOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(listInvoicesBySyncStatus);

  return useQuery({
    queryKey: queryKeys.financial.xeroSyncs(params.status),
    queryFn: async () => {
      const result = await fn({ data: params });
      if (result == null) throw new Error('Xero syncs returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useXeroInvoiceStatus(orderId: string, enabled = true) {
  const fn = useServerFn(getInvoiceXeroStatus);

  return useQuery({
    queryKey: queryKeys.financial.xeroStatus(orderId),
    queryFn: async () => {
      const result = await fn({ data: { orderId } });
      if (result == null) throw new Error('Xero invoice status returned no data');
      return result;
    },
    enabled: enabled && !!orderId,
    staleTime: 30 * 1000,
  });
}

export function useResyncXeroInvoice() {
  const queryClient = useQueryClient();
  const fn = useServerFn(resyncInvoiceToXero);

  return useMutation({
    mutationFn: (orderId: string) => fn({ data: { orderId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.xero() });
    },
  });
}

// ============================================================================
// CREDIT NOTE HOOKS
// ============================================================================

export interface UseCreditNotesOptions {
  customerId?: string;
  orderId?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useCreditNotes(options: UseCreditNotesOptions = {}) {
  const { enabled = true, ...params } = options;
  const fn = useServerFn(listCreditNotes);

  return useQuery({
    queryKey: queryKeys.financial.creditNotesList({
      customerId: params.customerId,
      orderId: params.orderId,
    }),
    queryFn: async () => {
      const result = await fn({ data: params });
      if (result == null) throw new Error('Credit notes list returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreditNote(id: string, enabled = true) {
  const fn = useServerFn(getCreditNote);

  return useQuery({
    queryKey: queryKeys.financial.creditNoteDetail(id),
    queryFn: async () => {
      const result = await fn({ data: { id } });
      if (result == null) throw new Error('Credit note not found');
      return result;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createCreditNote);

  return useMutation({
    mutationFn: (data: CreateCreditNoteInput) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
    },
  });
}

export function useApplyCreditNote() {
  const queryClient = useQueryClient();
  const fn = useServerFn(applyCreditNoteToInvoice);

  return useMutation({
    mutationFn: (data: ApplyCreditNoteInput) => fn({ data }),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNoteDetail(data.creditNoteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(data.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

export function useIssueCreditNote() {
  const queryClient = useQueryClient();
  const fn = useServerFn(issueCreditNote);

  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNoteDetail(id) });
    },
  });
}

export function useVoidCreditNote() {
  const queryClient = useQueryClient();
  const fn = useServerFn(voidCreditNote);

  return useMutation({
    mutationFn: (params: { id: string; voidReason?: string }) =>
      fn({ data: { id: params.id, voidReason: params.voidReason ?? 'Voided by user' } }),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNoteDetail(params.id) });
    },
  });
}

export function useGenerateCreditNotePdf() {
  const fn = useServerFn(generateCreditNotePdf);

  return useMutation({
    mutationFn: (creditNoteId: string) => fn({ data: { id: creditNoteId } }),
  });
}

// ============================================================================
// PAYMENT SCHEDULE HOOKS
// ============================================================================

export function usePaymentSchedule(orderId: string, enabled = true) {
  const fn = useServerFn(getPaymentSchedule);

  return useQuery({
    queryKey: queryKeys.financial.paymentScheduleDetail(orderId),
    queryFn: async () => {
      const result = await fn({ data: { orderId } });
      if (result == null) throw new Error('Payment schedule not found');
      return result;
    },
    enabled: enabled && !!orderId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// CUSTOMER STATEMENT HOOKS
// ============================================================================

// Statements imports
import {
  generateStatement,
  listStatements,
  markStatementSent,
  getStatementHistory,
  getStatement,
} from '@/server/functions/financial/statements';

export interface UseStatementsOptions {
  customerId: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * List statement history for a customer.
 */
export function useStatements(options: UseStatementsOptions) {
  const { enabled = true, customerId, page = 1, pageSize = 10 } = options;
  const listFn = useServerFn(listStatements);

  return useQuery({
    queryKey: queryKeys.financial.statements(customerId),
    queryFn: async () => {
      const result = await listFn({ data: { customerId, page, pageSize } });
      if (result == null) throw new Error('Statements list returned no data');
      return result;
    },
    enabled: enabled && !!customerId && customerId !== 'placeholder-customer-id',
    staleTime: 30 * 1000,
  });
}

/**
 * Get single statement by ID.
 */
export function useStatement(statementId: string, enabled = true) {
  const getFn = useServerFn(getStatement);

  return useQuery({
    queryKey: queryKeys.financial.statement(statementId),
    queryFn: async () => {
      const result = await getFn({ data: { id: statementId } });
      if (result == null) throw new Error('Statement not found');
      return result;
    },
    enabled: enabled && !!statementId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get statement history for a customer.
 */
export function useStatementHistory(
  customerId: string,
  options: { page?: number; pageSize?: number; dateFrom?: Date; dateTo?: Date } = {},
  enabled = true
) {
  const getHistoryFn = useServerFn(getStatementHistory);
  const { page = 1, pageSize = 10, dateFrom, dateTo } = options;

  return useQuery({
    queryKey: queryKeys.financial.statementHistory(customerId, { page, pageSize, dateFrom: dateFrom?.toISOString(), dateTo: dateTo?.toISOString() }),
    queryFn: async () => {
      const result = await getHistoryFn({ data: { customerId, page, pageSize, dateFrom, dateTo } });
      if (result == null) throw new Error('Statement history returned no data');
      return result;
    },
    enabled: enabled && !!customerId,
    staleTime: 30 * 1000,
  });
}

export interface GenerateStatementInput {
  customerId: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Generate a new statement for a customer.
 */
export function useGenerateStatement() {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateStatement);

  return useMutation({
    mutationFn: (input: GenerateStatementInput) =>
      generateFn({
        data: {
          customerId: input.customerId,
          startDate: input.dateFrom,
          endDate: input.dateTo,
        },
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financial.statements(variables.customerId),
      });
    },
  });
}

/**
 * Mark a statement as sent via email.
 */
export function useMarkStatementSent() {
  const queryClient = useQueryClient();
  const markSentFn = useServerFn(markStatementSent);

  return useMutation({
    mutationFn: (data: { statementId: string; sentToEmail: string; customerId: string }) =>
      markSentFn({ data: { statementId: data.statementId, sentToEmail: data.sentToEmail } }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financial.statements(variables.customerId),
      });
    },
  });
}

export function useCreatePaymentPlan() {
  const queryClient = useQueryClient();
  const fn = useServerFn(createPaymentPlan);

  return useMutation({
    mutationFn: (data: CreatePaymentPlanInput) => fn({ data }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financial.paymentSchedules(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.financial.paymentScheduleDetail(variables.orderId),
      });
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();
  const fn = useServerFn(updateInstallment);

  return useMutation({
    mutationFn: (data: {
      installmentId: string;
      dueDate?: string;
      amount?: number;
      gstAmount?: number;
      description?: string;
      notes?: string | null;
    }) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.paymentSchedules() });
    },
  });
}

export function useRecordInstallmentPayment() {
  const queryClient = useQueryClient();
  const fn = useServerFn(recordInstallmentPayment);

  return useMutation({
    mutationFn: (data: {
      installmentId: string;
      paidAmount: number;
      paymentReference?: string;
      notes?: string;
    }) => fn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.paymentSchedules() });
    },
  });
}
