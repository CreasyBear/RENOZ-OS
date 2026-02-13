/**
 * Invoice Status Configuration
 *
 * Centralized status definitions used by UI badges and PDF templates.
 * @see docs/design-system/INVOICE-STANDARDS.md Section 3
 * @see docs/design-system/BADGE-STATUS-STANDARDS.md
 */

export const INVOICE_STATUS_VALUES = [
  'draft',
  'scheduled',
  'unpaid',
  'overdue',
  'paid',
  'canceled',
  'refunded',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUS_VALUES)[number];

/**
 * Invoice Status Display Configuration
 *
 * Colors match INVOICE-STANDARDS.md Section 3 exactly:
 * - draft: #878787 (gray)
 * - scheduled: #1F6FEB (blue)
 * - unpaid: #1D1D1D (dark)
 * - overdue: #FFD02B (amber)
 * - paid: #00C969 (green)
 * - canceled: #878787 (gray)
 * - refunded: #F97316 (orange)
 *
 * @see docs/design-system/INVOICE-STANDARDS.md Section 3
 */
export const INVOICE_STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    description: 'Invoice is being prepared',
    hex: '#878787',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    textClassName: 'text-[#878787]',
    dot: 'bg-[#878787]',
  },
  scheduled: {
    label: 'Scheduled',
    description: 'Invoice will be sent automatically',
    hex: '#1F6FEB',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    textClassName: 'text-[#1F6FEB]',
    dot: 'bg-[#1F6FEB]',
  },
  unpaid: {
    label: 'Unpaid',
    description: 'Invoice sent, awaiting payment',
    hex: '#1D1D1D',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-900 dark:text-gray-100',
    textClassName: 'text-[#1D1D1D] dark:text-[#F5F5F3]',
    dot: 'bg-[#1D1D1D] dark:bg-[#F5F5F3]',
  },
  overdue: {
    label: 'Overdue',
    description: 'Payment is past due date',
    hex: '#FFD02B',
    bg: 'bg-amber-100/50 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    textClassName: 'text-[#FFD02B]',
    dot: 'bg-[#FFD02B]',
  },
  paid: {
    label: 'Paid',
    description: 'Payment received in full',
    hex: '#00C969',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    textClassName: 'text-[#00C969]',
    dot: 'bg-[#00C969]',
  },
  canceled: {
    label: 'Canceled',
    description: 'Invoice has been voided',
    hex: '#878787',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    textClassName: 'text-[#878787]',
    dot: 'bg-[#878787]',
  },
  refunded: {
    label: 'Refunded',
    description: 'Payment has been returned',
    hex: '#F97316',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    textClassName: 'text-[#F97316]',
    dot: 'bg-[#F97316]',
  },
} as const satisfies Record<
  InvoiceStatus,
  {
    label: string;
    description: string;
    hex: string;
    bg: string;
    text: string;
    textClassName: string;
    dot: string;
  }
>;

/**
 * Valid status transitions for invoice workflow
 *
 * Maps from current status to array of valid next statuses.
 * Used for validation in server functions.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md Section 11 (Actions & Workflows)
 */
export const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['scheduled', 'unpaid', 'canceled'],
  scheduled: ['draft', 'unpaid', 'canceled'],
  unpaid: ['paid', 'overdue', 'canceled'],
  overdue: ['paid', 'canceled'],
  paid: ['unpaid', 'refunded'], // unpaid = Mark Unpaid, refunded = Refund
  canceled: ['draft'], // Restore action
  refunded: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidInvoiceStatusTransition(
  from: InvoiceStatus,
  to: InvoiceStatus
): boolean {
  return INVOICE_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Get display label for an invoice status
 */
export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_CONFIG[status].label;
}

/**
 * Get all statuses that represent "open" invoices (unpaid)
 */
export const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ['unpaid', 'overdue'];

/**
 * Get all statuses that represent "closed" invoices
 */
export const CLOSED_INVOICE_STATUSES: InvoiceStatus[] = ['paid', 'canceled', 'refunded'];

/**
 * Invoice Alert Thresholds
 *
 * Business logic thresholds for generating invoice alerts.
 * These values determine when alerts should be shown to users.
 */
export const INVOICE_ALERT_THRESHOLDS = {
  /**
   * Large balance threshold (in dollars)
   * Invoices with balance due exceeding this amount will show a warning alert
   */
  LARGE_BALANCE_THRESHOLD: 10000,
} as const;
