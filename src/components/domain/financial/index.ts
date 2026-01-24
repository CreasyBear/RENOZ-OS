/**
 * Financial Domain Components
 *
 * Barrel export for all financial-related UI components.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json
 */

// Credit notes management (DOM-FIN-001c)
export { CreditNotesList } from './credit-notes-list';
export type { CreditNotesListProps } from './credit-notes-list';

// Payment plans management (DOM-FIN-002c)
export { PaymentPlansList } from './payment-plans-list';
export type { PaymentPlansListProps } from './payment-plans-list';

// AR aging report (DOM-FIN-003b)
export { ARAgingReport } from './ar-aging-report';
export type { ARAgingReportProps } from './ar-aging-report';

// Customer statements (DOM-FIN-004c)
export { CustomerStatements } from './customer-statements';
export type { CustomerStatementsProps } from './customer-statements';

// Xero invoice sync status (DOM-FIN-005b)
export { XeroSyncStatus } from './xero-sync-status';
export type { XeroSyncStatusProps } from './xero-sync-status';

// Payment reminders (DOM-FIN-006c)
export { PaymentReminders } from './payment-reminders';
export type { PaymentRemindersProps } from './payment-reminders';

// Financial dashboard (DOM-FIN-007b)
export { FinancialDashboard } from './financial-dashboard';
export type { FinancialDashboardProps } from './financial-dashboard';

// Revenue reports (DOM-FIN-008c)
export { RevenueReports } from './revenue-reports';
export type { RevenueReportsProps } from './revenue-reports';
