const all = ['financial'] as const;

const arAging = () => [...all, 'arAging'] as const;
const arAgingReport = (filters?: Record<string, unknown>) =>
  [...arAging(), 'report', filters ?? {}] as const;
const arAgingCustomer = (customerId: string) =>
  [...arAging(), 'customer', customerId] as const;

const creditNotes = () => [...all, 'creditNotes'] as const;
const creditNotesList = (filters?: Record<string, unknown>) =>
  [...creditNotes(), 'list', filters ?? {}] as const;
const creditNoteDetail = (id: string) =>
  [...creditNotes(), 'detail', id] as const;

const paymentSchedules = () => [...all, 'paymentSchedules'] as const;
const paymentScheduleDetail = (orderId: string) =>
  [...paymentSchedules(), 'detail', orderId] as const;
const overdueInstallments = (filters?: Record<string, unknown>) =>
  [...paymentSchedules(), 'overdue', filters ?? {}] as const;

const revenue = () => [...all, 'revenue'] as const;
const revenueByPeriod = (periodType: string, filters?: Record<string, unknown>) =>
  [...revenue(), 'byPeriod', periodType, filters ?? {}] as const;

const dashboard = () => [...all, 'dashboard'] as const;
const dashboardMetrics = (filters?: Record<string, unknown>) =>
  [...dashboard(), filters ?? {}] as const;
const closeReadiness = () => [...all, 'closeReadiness'] as const;

const reminders = () => [...all, 'reminders'] as const;
const reminderCandidates = () =>
  [...reminders(), 'orders-for-reminders'] as const;
const ordersForReminders = (filters?: Record<string, unknown>) =>
  [...reminderCandidates(), filters ?? {}] as const;
const reminderHistory = (filters?: Record<string, unknown>) =>
  [...reminders(), 'history', filters ?? {}] as const;
const reminderTemplates = () => [...reminders(), 'templates'] as const;

const xero = () => [...all, 'xero'] as const;
const xeroStatus = (orderId: string) =>
  [...xero(), 'status', orderId] as const;
const xeroSyncs = (filters?: Record<string, unknown>) =>
  [...xero(), 'syncs', filters ?? {}] as const;
const xeroIntegration = () =>
  [...xero(), 'integration'] as const;
const xeroPaymentEvents = () =>
  [...xero(), 'payment-events'] as const;
const xeroPaymentEventsList = (filters?: Record<string, unknown>) =>
  [...xeroPaymentEvents(), filters ?? {}] as const;
const xeroCustomerMapping = (customerId: string) =>
  [...xero(), 'customer-mapping', customerId] as const;
const xeroContactSearch = (customerId: string, query: string) =>
  [...xero(), 'contact-search', customerId, query] as const;

const statements = (customerId?: string, filters?: Record<string, unknown>) =>
  [...all, 'statements', customerId ?? '', filters ?? {}] as const;
const statement = (statementId: string) =>
  [...all, 'statement', statementId] as const;
const statementHistory = (
  customerId: string,
  filters?: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string }
) => [...statements(customerId), 'history', filters ?? {}] as const;

const deferredBalance = () => [...all, 'deferredBalance'] as const;
const outstandingInvoices = () => [...all, 'outstandingInvoices'] as const;
const outstandingInvoicesList = (filters?: Record<string, unknown>) =>
  [...outstandingInvoices(), filters ?? {}] as const;
const recognitions = (filters?: Record<string, unknown>) =>
  [...all, 'recognitions', filters ?? {}] as const;
const recognitionSummary = (dateFrom?: string, dateTo?: string, groupBy?: string) =>
  [...all, 'recognitionSummary', dateFrom ?? '', dateTo ?? '', groupBy ?? ''] as const;
const topCustomers = () => [...all, 'topCustomers'] as const;
const topCustomersList = (filters?: Record<string, unknown>) =>
  [...topCustomers(), filters ?? {}] as const;

export const financialQueryKeys = {
  all,
  arAging,
  arAgingReport,
  arAgingCustomer,
  creditNotes,
  creditNotesList,
  creditNoteDetail,
  paymentSchedules,
  paymentScheduleDetail,
  overdueInstallments,
  revenue,
  revenueByPeriod,
  dashboard,
  dashboardMetrics,
  closeReadiness,
  reminders,
  reminderCandidates,
  ordersForReminders,
  reminderHistory,
  reminderTemplates,
  xero,
  xeroStatus,
  xeroSyncs,
  xeroIntegration,
  xeroPaymentEvents,
  xeroPaymentEventsList,
  xeroCustomerMapping,
  xeroContactSearch,
  statements,
  statement,
  statementHistory,
  deferredBalance,
  outstandingInvoices,
  outstandingInvoicesList,
  recognitions,
  recognitionSummary,
  topCustomers,
  topCustomersList,
};
