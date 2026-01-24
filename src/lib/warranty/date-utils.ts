/**
 * Warranty date utilities.
 */

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
 * Format a date for display in Australian format (DD/MM/YYYY).
 */
export function formatDateAustralian(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get the number of days between two dates.
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
