/**
 * Warranty date utilities.
 *
 * Centralized date formatting and calculation functions for warranty domain.
 * All functions handle both Date objects and ISO string inputs.
 */

/**
 * Parse a date value (string or Date) to a Date object.
 * Returns null if invalid.
 */
export function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calculate the new expiry date given current expiry and extension months.
 */
export function calculateNewExpiryDate(
  currentExpiry: Date | string,
  extensionMonths: number
): Date {
  const expiry = typeof currentExpiry === 'string' ? new Date(currentExpiry) : currentExpiry;
  const newExpiry = new Date(expiry);
  newExpiry.setMonth(newExpiry.getMonth() + extensionMonths);
  return newExpiry;
}

/**
 * Format a date for display in Australian format.
 *
 * @param date - Date object or ISO string
 * @param format - Format style: 'short' (15 Jan 2024) or 'numeric' (15/01/2024)
 * @returns Formatted date string
 */
export function formatDateAustralian(
  date: Date | string,
  format: 'short' | 'numeric' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'numeric') {
    return d.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  
  // Default 'short' format: "15 Jan 2024"
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get the number of days between two dates (absolute difference).
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days until expiry from today.
 * Returns positive number for future dates, negative for past dates.
 *
 * @param expiryDate - The expiry date (Date or ISO string)
 * @param fromDate - Optional date to calculate from (defaults to today)
 * @returns Number of days until expiry (negative if expired)
 */
export function getDaysUntilExpiry(
  expiryDate: Date | string,
  fromDate?: Date | string
): number {
  const today = fromDate
    ? typeof fromDate === 'string'
      ? new Date(fromDate)
      : fromDate
    : new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  expiry.setHours(0, 0, 0, 0);
  
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
