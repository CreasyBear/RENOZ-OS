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
