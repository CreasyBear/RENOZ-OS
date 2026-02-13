/**
 * Financial utility functions
 * Shared across credit notes, payment schedules, AR aging, etc.
 */

/**
 * Calculate days overdue with proper timezone handling.
 * Normalizes both dates to midnight to avoid timezone issues.
 *
 * @param dueDate - The due date (Date object or ISO string)
 * @param asOfDate - The date to calculate overdue from (Date object or ISO string)
 * @returns Number of days overdue (positive) or days until due (negative)
 */
export function calculateDaysOverdue(dueDate: Date | string, asOfDate: Date | string): number {
  // Normalize to start of day (midnight) to avoid timezone issues
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const asOf = new Date(asOfDate);
  asOf.setHours(0, 0, 0, 0);

  const diffMs = asOf.getTime() - due.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate GST (10% for Australia)
 *
 * @param amount - The amount to calculate GST on
 * @returns The GST amount, rounded to 2 decimal places
 */
export function calculateGst(amount: number): number {
  return Math.round(amount * 0.1 * 100) / 100;
}

/**
 * Round currency to 2 decimal places
 *
 * @param amount - The amount to round
 * @returns The amount rounded to 2 decimal places
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Add days to a date
 *
 * @param date - The starting date
 * @param days - Number of days to add (can be negative to subtract)
 * @returns A new Date object with the days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate effective due date from order date.
 * Uses standard payment terms if due date is not provided.
 *
 * @param orderDate - The order date
 * @param dueDate - Optional due date (if provided, uses this)
 * @param paymentTermsDays - Payment terms in days (default: 30)
 * @returns The effective due date
 */
export function getEffectiveDueDate(
  orderDate: string | Date,
  dueDate: string | Date | null,
  paymentTermsDays = 30
): Date {
  if (dueDate) {
    return new Date(dueDate);
  }
  const effectiveDate = new Date(orderDate);
  effectiveDate.setDate(effectiveDate.getDate() + paymentTermsDays);
  return effectiveDate;
}

/**
 * Format currency for AUD display.
 * Uses Australian locale formatting.
 *
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$1,500.00")
 */
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

/**
 * Format date for display in Australian format.
 *
 * @param date - The date to format
 * @returns Formatted date string (e.g., "7 February 2026")
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Template variable type for payment reminders.
 */
export interface PaymentReminderTemplateVariables {
  customerName: string;
  invoiceNumber: string;
  invoiceAmount: string;
  invoiceDate: string;
  dueDate: string;
  daysOverdue: string;
  orderDescription: string;
  paymentTerms: string;
}

/**
 * Render template string with variable substitution.
 * Replaces {{variableName}} placeholders with actual values.
 *
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns Rendered template string
 */
export function renderTemplate(
  template: string,
  variables: PaymentReminderTemplateVariables | Record<string, string>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return rendered;
}

// ============================================================================
// VALIDATION & ANALYSIS HELPERS
// ============================================================================

export interface InvoiceTotalsInput {
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  tolerance?: number;
}

export interface InvoiceTotalsValidation {
  isValid: boolean;
  expectedTotal: number;
  delta: number;
}

/**
 * Validate invoice totals for rounding consistency.
 * Expected total = subtotal + tax + shipping - discounts.
 */
export function validateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotalsValidation {
  const expectedTotal =
    roundCurrency(input.subtotal + input.taxAmount + input.shippingAmount - input.discountAmount);
  const delta = roundCurrency(input.total - expectedTotal);
  const tolerance = input.tolerance ?? 0.01;

  return {
    isValid: Math.abs(delta) <= tolerance,
    expectedTotal,
    delta,
  };
}

export interface PaymentAnalysisInvoice {
  orderId: string;
  orderDate: Date | string;
  dueDate: Date | string | null;
  balanceDue: number;
}

export interface PaymentAnalysisPayment {
  orderId: string;
  paymentDate: Date | string;
  amount: number;
  isRefund?: boolean;
}

export interface PaymentAnalysisResult {
  averageDaysToPay: number;
  paymentRate: number;
  overdueRate: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
}

/**
 * Calculate payment analysis metrics from invoices and payments.
 */
export function calculatePaymentAnalysis(
  invoices: PaymentAnalysisInvoice[],
  payments: PaymentAnalysisPayment[],
  asOfDate: Date = new Date()
): PaymentAnalysisResult {
  void new Map(invoices.map((inv) => [inv.orderId, inv])); // Reserved for future use
  const lastPaymentByOrder = new Map<string, Date>();

  for (const payment of payments) {
    if (payment.isRefund) continue;
    const paymentDate = new Date(payment.paymentDate);
    const current = lastPaymentByOrder.get(payment.orderId);
    if (!current || paymentDate > current) {
      lastPaymentByOrder.set(payment.orderId, paymentDate);
    }
  }

  const totalInvoices = invoices.length;
  let paidInvoices = 0;
  let overdueInvoices = 0;
  let totalDaysToPay = 0;
  let daysToPayCount = 0;

  for (const invoice of invoices) {
    const balanceDue = invoice.balanceDue ?? 0;
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const isOverdue = balanceDue > 0 && dueDate ? dueDate < asOfDate : false;
    if (isOverdue) overdueInvoices += 1;

    if (balanceDue <= 0) {
      paidInvoices += 1;
      const lastPaymentDate = lastPaymentByOrder.get(invoice.orderId);
      if (lastPaymentDate) {
        const orderDate = new Date(invoice.orderDate);
        const daysToPay = Math.floor(
          (lastPaymentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDaysToPay += daysToPay;
        daysToPayCount += 1;
      }
    }
  }

  return {
    averageDaysToPay: daysToPayCount > 0 ? Math.round(totalDaysToPay / daysToPayCount) : 0,
    paymentRate: totalInvoices > 0 ? paidInvoices / totalInvoices : 0,
    overdueRate: totalInvoices > 0 ? overdueInvoices / totalInvoices : 0,
    totalInvoices,
    paidInvoices,
    overdueInvoices,
  };
}
